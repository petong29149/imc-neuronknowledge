import { Parser } from 'node-sql-parser';
import type { ConnectionType } from '@/lib/studio/types';
import { HttpError } from './http';
import type { CatalogTable } from './types';

// Enforces the catalog on SQL that arrives through the MCP API: only enabled tables,
// only enabled non-PII columns. Fails closed: if the SQL cannot be parsed, it is refused.

const parser = new Parser();

// node-sql-parser has no Oracle or ClickHouse grammar; DB2 understands Oracle's FETCH FIRST,
// and ClickHouse's common SELECT syntax parses as MySQL. Anything else is rejected.
const DIALECTS: Record<ConnectionType, string[]> = {
  postgresql: ['PostgresQL'],
  cockroachdb: ['PostgresQL'],
  redshift: ['Redshift', 'PostgresQL'],
  mysql: ['MySQL'],
  mariadb: ['MariaDB', 'MySQL'],
  mssql: ['TransactSQL'],
  oracle: ['DB2', 'PostgresQL'],
  clickhouse: ['MySQL', 'PostgresQL'],
};

interface Allowed {
  schema: string;
  allowed: Set<string>;
  blocked: Set<string>;
  /** Every column is enabled and not PII, so SELECT * is safe */
  starOk: boolean;
}

const norm = (s: string) => s.toLowerCase();

/** Collects CTE names and output aliases anywhere in the AST. */
function collectNames(node: unknown, ctes: Set<string>, aliases: Set<string>): void {
  if (Array.isArray(node)) {
    node.forEach((n) => collectNames(n, ctes, aliases));
    return;
  }
  if (!node || typeof node !== 'object') return;
  const obj = node as Record<string, unknown>;
  if (Array.isArray(obj.with)) {
    for (const w of obj.with as { name?: { value?: string } | string }[]) {
      const name = typeof w.name === 'string' ? w.name : w.name?.value;
      if (name) ctes.add(norm(name));
    }
  }
  if (typeof obj.as === 'string') aliases.add(norm(obj.as));
  for (const value of Object.values(obj)) collectNames(value, ctes, aliases);
}

function parse(sql: string, type: ConnectionType) {
  for (const database of DIALECTS[type]) {
    try {
      const ast = parser.astify(sql, { database });
      const tables = parser.tableList(sql, { database });
      const columns = parser.columnList(sql, { database });
      return { ast, tables, columns };
    } catch {
      // try the next grammar
    }
  }
  return null;
}

export function enforceCatalog(sql: string, type: ConnectionType, catalog: CatalogTable[]): void {
  const parsed = parse(sql, type);
  if (!parsed) {
    throw new HttpError(400, 'ระบบตรวจ SQL นี้ไม่ได้ จึงไม่อนุญาตให้รันผ่าน API (ลองเขียนให้เรียบง่ายขึ้น เช่น เลี่ยงไวยากรณ์เฉพาะของ DB)');
  }
  const statements = Array.isArray(parsed.ast) ? parsed.ast : [parsed.ast];
  if (statements.length !== 1 || (statements[0] as { type?: string }).type !== 'select') {
    throw new HttpError(400, 'อนุญาตเฉพาะคำสั่ง SELECT คำสั่งเดียว');
  }

  const byName = new Map<string, Allowed[]>();
  for (const t of catalog) {
    if (!t.enabled || t.missing) continue;
    const usable = t.columns.filter((c) => c.enabled && !c.isPii && !c.missing);
    const entry: Allowed = {
      schema: norm(t.schema),
      allowed: new Set(usable.map((c) => norm(c.name))),
      blocked: new Set(t.columns.filter((c) => !c.enabled || c.isPii).map((c) => norm(c.name))),
      starOk: usable.length === t.columns.filter((c) => !c.missing).length,
    };
    byName.set(norm(t.table), [...(byName.get(norm(t.table)) ?? []), entry]);
  }

  const ctes = new Set<string>();
  const aliases = new Set<string>();
  collectNames(parsed.ast, ctes, aliases);

  // Tables: "type::schema::table"
  const referenced: Allowed[] = [];
  const tableEntry = new Map<string, Allowed>();
  for (const item of parsed.tables) {
    const [kind, schema, table] = item.split('::');
    if (kind !== 'select') throw new HttpError(400, 'อนุญาตเฉพาะการอ่านข้อมูล');
    const name = norm(table);
    if ((schema === 'null' || !schema) && ctes.has(name)) continue;
    const candidates = byName.get(name) ?? [];
    const match = schema && schema !== 'null' ? candidates.find((c) => c.schema === norm(schema)) : candidates[0];
    if (!match) {
      throw new HttpError(400, `ไม่อนุญาตให้ใช้ตาราง ${schema && schema !== 'null' ? `${schema}.` : ''}${table} (ยังไม่ได้เปิดใช้ในแคตตาล็อก)`);
    }
    referenced.push(match);
    tableEntry.set(name, match);
  }

  // Columns: "type::table::column" (aliases are resolved to table names where possible)
  for (const item of parsed.columns) {
    const [, table, column] = item.split('::');
    const col = norm(column);
    const qualified = table && table !== 'null' ? tableEntry.get(norm(table)) : undefined;

    if (column === '(.*)') {
      const targets = qualified ? [qualified] : referenced;
      const bad = targets.find((t) => !t.starOk);
      if (bad) {
        throw new HttpError(400, 'ใช้ SELECT * กับตารางที่มีคอลัมน์ปิดใช้หรือเป็นข้อมูลส่วนบุคคลไม่ได้ ให้ระบุชื่อคอลัมน์แทน');
      }
      continue;
    }
    if (qualified) {
      if (!qualified.allowed.has(col)) {
        throw new HttpError(400, `ไม่อนุญาตให้ใช้คอลัมน์ ${table}.${column}`);
      }
      continue;
    }
    if (table && table !== 'null' && ctes.has(norm(table))) continue;
    // Unqualified: refuse if it could mean a hidden column in any referenced table.
    if (referenced.some((t) => t.blocked.has(col))) {
      throw new HttpError(400, `ไม่อนุญาตให้ใช้คอลัมน์ ${column}`);
    }
    if (referenced.some((t) => t.allowed.has(col)) || aliases.has(col)) continue;
    throw new HttpError(400, `ไม่พบคอลัมน์ ${column} ในตารางที่เปิดใช้`);
  }
}
