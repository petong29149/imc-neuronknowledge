import { query } from '@/lib/db';
import type { AuthUser } from '@/lib/auth';
import { loadCatalog } from './catalog';
import { logActivity } from './core-shim';
import { HttpError } from './http';
import { chatJson } from './llm';
import { driverFor, requireConnection, savedParams } from './service';
import { validateReadOnlySql } from './sqlguard';
import { TYPE_LABELS, type CatalogTable, type ConnectionView } from './types';

const MAX_TABLES_PER_DRAFT = 5;
const MAX_TABLES_IN_CONTEXT = 60;

// ---------- Draft descriptions

const DESCRIBE_SYSTEM = [
  'You document database tables so that another AI can write correct SQL against them.',
  'Write every description in Thai. Keep table names, column names and code values exactly as given.',
  'Base everything on the schema and sample rows you are shown; do not invent columns or values.',
  'Reply with one JSON object only, no markdown.',
].join(' ');

interface DraftReply {
  description?: unknown;
  synonyms?: unknown;
  sampleQuestions?: unknown;
  columns?: unknown;
}

const asText = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const asList = (v: unknown, maxItems: number, maxLength: number) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').map((x) => x.trim().slice(0, maxLength)).filter(Boolean).slice(0, maxItems) : [];

function describePrompt(connection: ConnectionView, table: CatalogTable, samples: Record<string, unknown>[] | null): string {
  const columns = table.columns.filter((c) => c.enabled && !c.isPii && !c.missing);
  const hidden = table.columns.length - columns.length;
  const lines = [
    `Database: ${TYPE_LABELS[connection.type]} — connection "${connection.name}"${connection.description ? ` (${connection.description})` : ''}`,
    `Table: ${table.schema}.${table.table}${table.rowEstimate !== null ? ` (~${table.rowEstimate} rows)` : ''}`,
    'Columns (name | type | nullable):',
    ...columns.map((c) => `- ${c.name} | ${c.dataType} | ${c.nullable ? 'null' : 'not null'}`),
  ];
  if (hidden > 0) lines.push(`(${hidden} more columns are hidden on purpose; do not mention them.)`);
  if (samples && samples.length > 0) {
    lines.push('Sample rows (values cut to 80 characters):');
    for (const row of samples) {
      lines.push(JSON.stringify(Object.fromEntries(columns.map((c) => [c.name, typeof row[c.name] === 'string' ? (row[c.name] as string).slice(0, 80) : row[c.name]]))));
    }
  }
  lines.push(
    '',
    'Return JSON with this shape:',
    '{"description": "2-5 sentences: what one row represents, time grain, units/currency, important codes, how it relates to other tables if obvious",',
    ' "synonyms": ["Thai/English words people may use for this table", "..."],',
    ' "sampleQuestions": ["3-5 realistic questions in Thai this table can answer"],',
    ' "columns": [{"name": "exact column name", "description": "meaning, unit, format or allowed values", "exampleValues": ["up to 3 values copied from the sample rows"]}]}',
    'Include every column listed above in "columns".'
  );
  return lines.join('\n');
}

export async function draftDescriptions(
  session: AuthUser,
  id: number,
  body: Record<string, unknown>,
  request: Request
): Promise<{ tables: CatalogTable[]; skipped: string[] }> {
  const stored = await requireConnection(session, id);
  const tableIds = Array.isArray(body.tableIds) ? body.tableIds.map(Number).filter((n) => Number.isInteger(n) && n > 0) : [];
  if (tableIds.length === 0) throw new HttpError(400, 'กรุณาเลือกตาราง');
  if (tableIds.length > MAX_TABLES_PER_DRAFT) throw new HttpError(400, `ให้ AI ร่างได้ครั้งละไม่เกิน ${MAX_TABLES_PER_DRAFT} ตาราง`);
  const includeSamples = body.includeSamples === true;

  const tables = await loadCatalog(id, tableIds);
  if (tables.length !== tableIds.length) throw new HttpError(404, 'ไม่พบบางตารางในแคตตาล็อก');

  const driver = driverFor(stored.view);
  const params = includeSamples ? await savedParams(stored) : null;
  const skipped: string[] = [];
  let model = '';

  for (const table of tables) {
    if (table.missing) {
      skipped.push(`${table.table} (ไม่พบใน DB)`);
      continue;
    }
    let samples: Record<string, unknown>[] | null = null;
    if (params) {
      try {
        samples = (await driver.preview(params, table.schema, table.table)).rows;
      } catch {
        samples = null; // Drafting from the schema alone is still useful.
      }
    }
    const reply = await chatJson(body.modelId, DESCRIBE_SYSTEM, describePrompt(stored.view, table, samples));
    model = reply.model;
    const data = (reply.data ?? {}) as DraftReply;

    // Approved text is never overwritten by a draft.
    if (table.status !== 'approved') {
      const description = asText(data.description, 4000);
      if (description) {
        await query(
          `UPDATE connection_tables SET description = $2, synonyms = $3::jsonb, sample_questions = $4::jsonb,
             description_status = 'draft', updated_by = $5, updated_at = now()
           WHERE id = $1`,
          [table.id, description, JSON.stringify(asList(data.synonyms, 30, 100)), JSON.stringify(asList(data.sampleQuestions, 20, 300)), session.id]
        );
      }
    }
    const replyColumns = Array.isArray(data.columns) ? (data.columns as Record<string, unknown>[]) : [];
    for (const column of table.columns) {
      if (!column.enabled || column.isPii || column.status === 'approved') continue;
      const match = replyColumns.find((c) => c && c.name === column.name);
      const description = asText(match?.description, 2000);
      if (!description) continue;
      await query(
        `UPDATE connection_columns SET description = $2, example_values = $3::jsonb, description_status = 'draft', updated_at = now()
         WHERE id = $1`,
        [column.id, description, JSON.stringify(samples ? asList(match?.exampleValues, 3, 200) : column.exampleValues)]
      );
    }
    // Touch the table so the editor reloads column drafts too.
    await query(`UPDATE connection_tables SET updated_at = now() WHERE id = $1`, [table.id]);
  }

  await logActivity({
    actor: session,
    action: 'connection.catalog_ai_draft',
    targetType: 'data_connection',
    targetId: id,
    detail: { tables: tableIds.length, skipped: skipped.length, includeSamples, model },
    request,
  });
  return { tables: await loadCatalog(id, tableIds), skipped };
}

// ---------- Natural language → SQL

const ASK_SYSTEM = [
  'You translate questions into ONE read-only SQL query.',
  'Use only the tables and columns listed in the catalog, with the exact names (quote them if the dialect needs it).',
  'Never write INSERT, UPDATE, DELETE, DDL or more than one statement. Prefer explicit column lists and add a sensible row limit for detail queries.',
  'Reply with one JSON object only: {"sql": "...", "explanation": "1-2 sentences in Thai describing what the query does and any assumption"}.',
  'If the catalog cannot answer the question, reply {"sql": "", "explanation": "why, in Thai"}.',
].join(' ');

const DIALECT_HINT: Record<ConnectionView['type'], string> = {
  postgresql: 'PostgreSQL (LIMIT n, double-quoted identifiers)',
  cockroachdb: 'CockroachDB / PostgreSQL syntax (LIMIT n)',
  redshift: 'Amazon Redshift (PostgreSQL-like, LIMIT n)',
  mysql: 'MySQL 8 (LIMIT n, backtick identifiers)',
  mariadb: 'MariaDB (LIMIT n, backtick identifiers)',
  mssql: 'Microsoft SQL Server T-SQL (SELECT TOP (n), square-bracket identifiers, no LIMIT)',
  oracle: 'Oracle Database (FETCH FIRST n ROWS ONLY, upper-case unquoted names, no LIMIT)',
  clickhouse: 'ClickHouse SQL (LIMIT n)',
};

/** Catalog text the AI is allowed to see: enabled, present, non-PII only. */
export function catalogContext(tables: CatalogTable[]): string {
  return tables
    .filter((t) => t.enabled && !t.missing)
    .slice(0, MAX_TABLES_IN_CONTEXT)
    .map((t) => {
      const cols = t.columns.filter((c) => c.enabled && !c.isPii && !c.missing);
      return [
        `TABLE ${t.schema}.${t.table}${t.description ? ` — ${t.description}` : ''}`,
        t.synonyms.length ? `  synonyms: ${t.synonyms.join(', ')}` : '',
        ...cols.map((c) => `  - ${c.name} (${c.dataType})${c.description ? `: ${c.description}` : ''}${c.exampleValues.length ? ` e.g. ${c.exampleValues.join(', ')}` : ''}`),
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');
}

export async function askForSql(
  session: AuthUser,
  id: number,
  body: Record<string, unknown>,
  request: Request
): Promise<{ sql: string; explanation: string }> {
  const stored = await requireConnection(session, id);
  const question = typeof body.question === 'string' ? body.question.trim() : '';
  if (!question) throw new HttpError(400, 'กรุณาพิมพ์คำถาม');
  if (question.length > 500) throw new HttpError(400, 'คำถามยาวเกิน 500 ตัวอักษร');

  const context = catalogContext(await loadCatalog(id));
  if (!context) {
    throw new HttpError(400, 'ยังไม่มีตารางที่เปิดใช้ ให้เปิดตารางในแท็บ "ตารางและคำอธิบาย" ก่อน');
  }

  let sql = '';
  let explanation = '';
  try {
    const reply = await chatJson(
      body.modelId,
      ASK_SYSTEM,
      `Dialect: ${DIALECT_HINT[stored.view.type]}\n\nCatalog:\n${context}\n\nQuestion: ${question}`
    );
    const data = (reply.data ?? {}) as { sql?: unknown; explanation?: unknown };
    sql = asText(data.sql, 20_000);
    explanation = asText(data.explanation, 1000);
    if (!sql) {
      throw new HttpError(400, explanation || 'AI ตอบคำถามนี้จากตารางที่เปิดใช้ไม่ได้');
    }
    // The generated SQL must pass the same gate as typed SQL before we show it as runnable.
    sql = validateReadOnlySql(sql, stored.view.type);
    return { sql, explanation };
  } finally {
    await logActivity({
      actor: session,
      action: 'connection.query_ai',
      targetType: 'data_connection',
      targetId: id,
      detail: { questionLength: question.length, ok: Boolean(sql) },
      request,
    });
  }
}
