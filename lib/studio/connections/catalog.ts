import { getPool, query } from '@/lib/db';
import type { AuthUser } from '@/lib/auth';
import { logActivity } from './core-shim';
import { friendlyConnectionError } from './errors';
import { HttpError } from './http';
import { driverFor, requireConnection, savedParams } from './service';
import {
  DESCRIPTION_STATUSES,
  type CatalogColumn,
  type CatalogTable,
  type DescriptionStatus,
} from './types';

// ---------- Read

interface TableRow {
  id: number;
  schema_name: string;
  table_name: string;
  enabled: boolean;
  missing: boolean;
  row_estimate: string | null;
  description: string;
  synonyms: string[];
  sample_questions: string[];
  description_status: DescriptionStatus;
  updated_at: Date;
  columns: {
    id: number;
    column_name: string;
    data_type: string;
    nullable: boolean;
    ordinal: number;
    enabled: boolean;
    is_pii: boolean;
    missing: boolean;
    description: string;
    example_values: string[];
    description_status: DescriptionStatus;
  }[];
}

function toTable(row: TableRow): CatalogTable {
  return {
    id: row.id,
    schema: row.schema_name,
    table: row.table_name,
    enabled: row.enabled,
    missing: row.missing,
    rowEstimate: row.row_estimate === null ? null : Number(row.row_estimate),
    description: row.description,
    synonyms: row.synonyms,
    sampleQuestions: row.sample_questions,
    status: row.description_status,
    updatedAt: row.updated_at.toISOString(),
    columns: row.columns.map(
      (c): CatalogColumn => ({
        id: c.id,
        name: c.column_name,
        dataType: c.data_type,
        nullable: c.nullable,
        ordinal: c.ordinal,
        enabled: c.enabled,
        isPii: c.is_pii,
        missing: c.missing,
        description: c.description,
        exampleValues: c.example_values,
        status: c.description_status,
      })
    ),
  };
}

/** All catalog tables of a connection; pass tableIds to limit the result. */
export async function loadCatalog(connectionId: number, tableIds?: number[]): Promise<CatalogTable[]> {
  const { rows } = await query<TableRow>(
    `SELECT t.id, t.schema_name, t.table_name, t.enabled, t.missing, t.row_estimate, t.description,
            t.synonyms, t.sample_questions, t.description_status, t.updated_at,
            COALESCE(cols.list, '[]'::json) AS columns
     FROM connection_tables t
     LEFT JOIN LATERAL (
       SELECT json_agg(json_build_object(
         'id', c.id, 'column_name', c.column_name, 'data_type', c.data_type, 'nullable', c.nullable,
         'ordinal', c.ordinal, 'enabled', c.enabled, 'is_pii', c.is_pii, 'missing', c.missing,
         'description', c.description, 'example_values', c.example_values,
         'description_status', c.description_status) ORDER BY c.ordinal) AS list
       FROM connection_columns c WHERE c.table_id = t.id
     ) cols ON true
     WHERE t.connection_id = $1 AND ($2::int[] IS NULL OR t.id = ANY($2::int[]))
     ORDER BY t.missing, t.schema_name, t.table_name`,
    [connectionId, tableIds ?? null]
  );
  return rows.map(toTable);
}

export async function getCatalog(session: AuthUser, id: number): Promise<CatalogTable[]> {
  await requireConnection(session, id);
  return loadCatalog(id);
}

// ---------- Sync

/**
 * Copies the live table/column list into the catalog in a few set-based statements.
 * New tables start disabled; tables/columns gone from the database are flagged `missing`
 * instead of deleted so their descriptions survive a rename or a temporary permission change.
 */
export async function syncCatalog(
  session: AuthUser,
  id: number,
  request: Request
): Promise<{ added: number; removed: number; tables: CatalogTable[] }> {
  const stored = await requireConnection(session, id);
  const driver = driverFor(stored.view);
  const params = await savedParams(stored);
  let live;
  try {
    live = await driver.listTables(params);
  } catch (error) {
    throw new HttpError(400, friendlyConnectionError(error));
  }

  const client = await getPool().connect();
  let added = 0;
  let removed = 0;
  try {
    await client.query('BEGIN');
    const tables = await client.query<{ id: number; schema_name: string; table_name: string; inserted: boolean }>(
      `INSERT INTO connection_tables (connection_id, schema_name, table_name, row_estimate)
       SELECT $1, s, t, e FROM unnest($2::text[], $3::text[], $4::bigint[]) AS u(s, t, e)
       ON CONFLICT (connection_id, schema_name, table_name)
       DO UPDATE SET row_estimate = EXCLUDED.row_estimate, missing = false
       RETURNING id, schema_name, table_name, (xmax = 0) AS inserted`,
      [id, live.map((t) => t.schema), live.map((t) => t.table), live.map((t) => t.rowEstimate)]
    );
    added = tables.rows.filter((r) => r.inserted).length;

    const marked = await client.query(
      `UPDATE connection_tables SET missing = true
       WHERE connection_id = $1 AND NOT missing
         AND (schema_name, table_name) NOT IN (SELECT * FROM unnest($2::text[], $3::text[]))`,
      [id, live.map((t) => t.schema), live.map((t) => t.table)]
    );
    removed = marked.rowCount ?? 0;

    const idOf = new Map(tables.rows.map((r) => [`${r.schema_name}\u0000${r.table_name}`, r.id]));
    const cols = live.flatMap((t) => {
      const tableId = idOf.get(`${t.schema}\u0000${t.table}`)!;
      return t.columns.map((c, i) => ({ tableId, name: c.name, type: c.dataType.slice(0, 255), nullable: c.nullable, ordinal: i + 1 }));
    });
    await client.query(
      `INSERT INTO connection_columns (table_id, column_name, data_type, nullable, ordinal)
       SELECT * FROM unnest($1::int[], $2::text[], $3::text[], $4::bool[], $5::int[])
       ON CONFLICT (table_id, column_name)
       DO UPDATE SET data_type = EXCLUDED.data_type, nullable = EXCLUDED.nullable,
                     ordinal = EXCLUDED.ordinal, missing = false`,
      [cols.map((c) => c.tableId), cols.map((c) => c.name), cols.map((c) => c.type), cols.map((c) => c.nullable), cols.map((c) => c.ordinal)]
    );
    await client.query(
      `UPDATE connection_columns c SET missing = true
       FROM connection_tables t
       WHERE c.table_id = t.id AND t.connection_id = $1 AND NOT c.missing
         AND (c.table_id, c.column_name) NOT IN (SELECT * FROM unnest($2::int[], $3::text[]))`,
      [id, cols.map((c) => c.tableId), cols.map((c) => c.name)]
    );
    await client.query(`UPDATE data_connections SET catalog_synced_at = now() WHERE id = $1`, [id]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }

  await logActivity({
    actor: session,
    action: 'connection.catalog_sync',
    targetType: 'data_connection',
    targetId: id,
    detail: { tables: live.length, added, removed },
    request,
  });
  return { added, removed, tables: await loadCatalog(id) };
}

// ---------- Edit

function optionalText(body: Record<string, unknown>, key: string, max: number): string | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new HttpError(400, 'ข้อมูลคำอธิบายไม่ถูกต้อง');
  if (value.length > max) throw new HttpError(400, `ข้อความยาวเกิน ${max.toLocaleString()} ตัวอักษร`);
  return value.trim();
}

function optionalList(body: Record<string, unknown>, key: string, maxItems: number, maxLength: number): string[] | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
    throw new HttpError(400, 'รายการไม่ถูกต้อง');
  }
  const items = (value as string[]).map((v) => v.trim()).filter(Boolean);
  if (items.length > maxItems) throw new HttpError(400, `ใส่ได้ไม่เกิน ${maxItems} รายการ`);
  if (items.some((v) => v.length > maxLength)) throw new HttpError(400, `แต่ละรายการยาวไม่เกิน ${maxLength} ตัวอักษร`);
  return items;
}

function optionalBool(body: Record<string, unknown>, key: string): boolean | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') throw new HttpError(400, 'ค่าเปิด/ปิดไม่ถูกต้อง');
  return value;
}

/** Explicit status wins; otherwise editing a description makes it a draft (or empty when cleared). */
function nextStatus(body: Record<string, unknown>, description: string | undefined): DescriptionStatus | undefined {
  if (body.status !== undefined) {
    if (!DESCRIPTION_STATUSES.includes(body.status as DescriptionStatus)) throw new HttpError(400, 'สถานะไม่ถูกต้อง');
    return body.status as DescriptionStatus;
  }
  if (description === undefined) return undefined;
  return description ? 'draft' : 'empty';
}

export async function updateCatalogTable(
  session: AuthUser,
  id: number,
  tableId: number,
  body: Record<string, unknown>,
  request: Request
): Promise<CatalogTable> {
  await requireConnection(session, id);
  const enabled = optionalBool(body, 'enabled');
  const description = optionalText(body, 'description', 4000);
  const synonyms = optionalList(body, 'synonyms', 30, 100);
  const sampleQuestions = optionalList(body, 'sampleQuestions', 20, 300);
  const status = nextStatus(body, description);
  if (status === 'approved' && description === '') {
    throw new HttpError(400, 'ยืนยันคำอธิบายว่างไม่ได้');
  }

  const { rowCount } = await query(
    `UPDATE connection_tables SET
       enabled = COALESCE($3, enabled),
       description = COALESCE($4, description),
       synonyms = COALESCE($5::jsonb, synonyms),
       sample_questions = COALESCE($6::jsonb, sample_questions),
       description_status = COALESCE($7, description_status),
       updated_by = $8, updated_at = now()
     WHERE id = $2 AND connection_id = $1`,
    [
      id, tableId, enabled ?? null, description ?? null,
      synonyms ? JSON.stringify(synonyms) : null,
      sampleQuestions ? JSON.stringify(sampleQuestions) : null,
      status ?? null, session.id,
    ]
  );
  if (!rowCount) throw new HttpError(404, 'ไม่พบตารางนี้ในแคตตาล็อก');

  await logActivity({
    actor: session,
    action: 'connection.catalog_update',
    targetType: 'connection_table',
    targetId: tableId,
    detail: { connectionId: id, fields: Object.keys(body).filter((k) => k !== 'id') },
    request,
  });
  const [table] = await loadCatalog(id, [tableId]);
  return table;
}

export async function updateCatalogColumn(
  session: AuthUser,
  id: number,
  columnId: number,
  body: Record<string, unknown>,
  request: Request
): Promise<CatalogTable> {
  await requireConnection(session, id);
  const enabled = optionalBool(body, 'enabled');
  const isPii = optionalBool(body, 'isPii');
  const description = optionalText(body, 'description', 2000);
  const exampleValues = optionalList(body, 'exampleValues', 20, 200);
  const status = nextStatus(body, description);
  if (status === 'approved' && description === '') {
    throw new HttpError(400, 'ยืนยันคำอธิบายว่างไม่ได้');
  }

  const { rows } = await query<{ table_id: number }>(
    `UPDATE connection_columns c SET
       enabled = COALESCE($3, c.enabled),
       is_pii = COALESCE($4, c.is_pii),
       description = COALESCE($5, c.description),
       example_values = COALESCE($6::jsonb, c.example_values),
       description_status = COALESCE($7, c.description_status),
       updated_at = now()
     FROM connection_tables t
     WHERE c.id = $2 AND c.table_id = t.id AND t.connection_id = $1
     RETURNING c.table_id`,
    [
      id, columnId, enabled ?? null, isPii ?? null, description ?? null,
      exampleValues ? JSON.stringify(exampleValues) : null, status ?? null,
    ]
  );
  if (rows.length === 0) throw new HttpError(404, 'ไม่พบคอลัมน์นี้ในแคตตาล็อก');

  await logActivity({
    actor: session,
    action: 'connection.catalog_update',
    targetType: 'connection_column',
    targetId: columnId,
    detail: { connectionId: id, fields: Object.keys(body) },
    request,
  });
  const [table] = await loadCatalog(id, [rows[0].table_id]);
  return table;
}
