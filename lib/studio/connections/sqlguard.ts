import type { ConnectionType } from '@/lib/studio/types';
import { HttpError } from './http';

// First line of defence for every query path (studio test box, AI SQL, MCP API).
// The real guarantees are the read-only account and the read-only session in each driver;
// this check rejects anything that is obviously not a single read query.

export const MAX_SQL_LENGTH = 20_000;

const FORBIDDEN_WORDS = [
  'insert', 'update', 'delete', 'merge', 'upsert', 'drop', 'alter', 'create', 'truncate',
  'grant', 'revoke', 'exec', 'execute', 'call', 'copy', 'into', 'lock', 'vacuum',
  'attach', 'detach', 'outfile', 'dumpfile', 'pragma', 'shutdown', 'kill',
];

// Functions that read files, reach the network, run commands or stall the server.
const FORBIDDEN_FUNCTIONS = [
  // PostgreSQL / CockroachDB / Redshift
  'pg_read_file', 'pg_read_binary_file', 'pg_ls_dir', 'pg_stat_file', 'lo_import', 'lo_export',
  'dblink', 'dblink_exec', 'pg_sleep', 'pg_terminate_backend', 'pg_cancel_backend', 'set_config',
  // MySQL / MariaDB
  'load_file', 'sleep', 'benchmark', 'get_lock',
  // SQL Server
  'openrowset', 'opendatasource', 'openquery', 'waitfor',
  // Oracle
  'httpuritype',
  // ClickHouse table functions
  'url', 'file', 's3', 's3cluster', 'remote', 'remotesecure', 'cluster', 'clusterallreplicas',
  'mysql', 'postgresql', 'jdbc', 'odbc', 'hdfs', 'input', 'executable', 'azureblobstorage',
  'gcs', 'sqlite', 'mongodb', 'redis', 'sleepeachrow',
];
const FORBIDDEN_PREFIXES = ['xp_', 'sp_', 'dbms_', 'utl_'];

interface Scanned {
  /** SQL with comments removed (strings kept): this is what gets executed */
  clean: string;
  /** clean with string literals and quoted identifiers blanked, for keyword checks */
  code: string;
}

/**
 * Splits SQL into code, string literals, quoted identifiers and comments.
 * Comments are dropped from what we execute: MySQL runs `/*! ... *\/` comments as code.
 */
function scan(sql: string, type: ConnectionType): Scanned {
  const mysqlLike = type === 'mysql' || type === 'mariadb';
  const backslashEscapes = mysqlLike || type === 'clickhouse';
  const pgLike = type === 'postgresql' || type === 'cockroachdb' || type === 'redshift';
  let clean = '';
  let code = '';
  let i = 0;
  const n = sql.length;
  const quoted = (close: string, escapeBackslash: boolean) => {
    const start = i;
    i++;
    while (i < n) {
      if (escapeBackslash && sql[i] === '\\') {
        i += 2;
        continue;
      }
      if (sql[i] === close) {
        if (sql[i + 1] === close) {
          i += 2;
          continue;
        }
        i++;
        break;
      }
      i++;
    }
    const text = sql.slice(start, i);
    clean += text;
    code += ' Q ';
  };

  while (i < n) {
    const ch = sql[i];
    const next = sql[i + 1];
    if (ch === '-' && next === '-') {
      while (i < n && sql[i] !== '\n') i++;
      clean += ' ';
      code += ' ';
    } else if (ch === '#' && mysqlLike) {
      // MySQL line comment (in PostgreSQL # is the XOR operator).
      while (i < n && sql[i] !== '\n') i++;
      clean += ' ';
      code += ' ';
    } else if (ch === '/' && next === '*') {
      const end = sql.indexOf('*/', i + 2);
      i = end === -1 ? n : end + 2;
      clean += ' ';
      code += ' ';
    } else if (ch === "'") {
      quoted("'", backslashEscapes);
    } else if (ch === '"') {
      quoted('"', false);
    } else if (ch === '`' && (mysqlLike || type === 'clickhouse')) {
      quoted('`', false);
    } else if (ch === '[' && type === 'mssql') {
      // Bracket identifiers exist only in SQL Server; elsewhere [ ] are array subscripts and must stay visible.
      quoted(']', false);
    } else if (ch === '$' && pgLike) {
      // PostgreSQL dollar-quoted string: $tag$ ... $tag$
      const tag = sql.slice(i).match(/^\$[A-Za-z_]*\$/)?.[0];
      if (tag) {
        const end = sql.indexOf(tag, i + tag.length);
        const stop = end === -1 ? n : end + tag.length;
        clean += sql.slice(i, stop);
        code += ' Q ';
        i = stop;
      } else {
        clean += ch;
        code += ch;
        i++;
      }
    } else {
      clean += ch;
      code += ch;
      i++;
    }
  }
  return { clean, code };
}

/** Returns the SQL to execute (comments and trailing semicolons removed) or throws a 400. */
export function validateReadOnlySql(raw: unknown, type: ConnectionType): string {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new HttpError(400, 'กรุณาพิมพ์คำสั่ง SQL');
  }
  if (raw.length > MAX_SQL_LENGTH) {
    throw new HttpError(400, `คำสั่ง SQL ยาวเกิน ${MAX_SQL_LENGTH.toLocaleString()} ตัวอักษร`);
  }
  const { clean, code } = scan(raw, type);
  const sql = clean.trim().replace(/[;\s]+$/, '');
  const body = code.trim().replace(/[;\s]+$/, '');
  if (!sql) {
    throw new HttpError(400, 'กรุณาพิมพ์คำสั่ง SQL');
  }
  if (body.includes(';')) {
    throw new HttpError(400, 'รันได้ครั้งละ 1 คำสั่งเท่านั้น');
  }
  const first = body.replace(/^[(\s]+/, '').match(/^[A-Za-z]+/)?.[0]?.toLowerCase();
  if (first !== 'select' && first !== 'with') {
    throw new HttpError(400, 'อนุญาตเฉพาะคำสั่ง SELECT หรือ WITH (อ่านข้อมูลอย่างเดียว)');
  }
  const lower = body.toLowerCase();
  const word = FORBIDDEN_WORDS.find((w) => new RegExp(`\\b${w}\\b`).test(lower));
  if (word) {
    throw new HttpError(400, `ไม่อนุญาตคำสั่ง ${word.toUpperCase()} ในหน้านี้ (อ่านข้อมูลอย่างเดียว)`);
  }
  const fn = FORBIDDEN_FUNCTIONS.find((f) => new RegExp(`\\b${f}\\s*\\(`).test(lower));
  if (fn) {
    throw new HttpError(400, `ไม่อนุญาตให้เรียกฟังก์ชัน ${fn}()`);
  }
  const prefix = FORBIDDEN_PREFIXES.find((p) => new RegExp(`\\b${p}\\w*`).test(lower));
  if (prefix) {
    throw new HttpError(400, `ไม่อนุญาตให้เรียกฟังก์ชันหรือโพรซีเยอร์ที่ขึ้นต้นด้วย ${prefix}`);
  }
  return sql;
}
