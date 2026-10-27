import { isIP } from 'node:net';
import mysql, { type Connection, type ConnectionOptions, type RowDataPacket } from 'mysql2/promise';
import type { TableSchema } from '@/lib/studio/types';
import {
  CONNECT_TIMEOUT_MS,
  MAX_TABLES,
  PREVIEW_ROW_LIMIT,
  TableNotFoundError,
  previewValue,
  type ConnectParams,
  type DbDriver,
} from './types';

// Privileges that cannot change data or schema. Anything else (INSERT, CREATE, ALTER,
// EXECUTE, SUPER, dynamic *_ADMIN privileges, ...) counts as writable.
const READ_ONLY_PRIVILEGES = new Set([
  'USAGE',
  'SELECT',
  'SHOW VIEW',
  'SHOW DATABASES',
  'LOCK TABLES',
  'PROCESS',
  'REPLICATION CLIENT',
]);

function sslOption(params: ConnectParams, mode: 'off' | 'lenient' | 'strict'): ConnectionOptions['ssl'] {
  if (mode === 'off') return undefined;
  const servername = isIP(params.host) ? undefined : params.host;
  return { rejectUnauthorized: mode === 'strict', ...(servername ? { servername } : {}) } as ConnectionOptions['ssl'];
}

async function connect(params: ConnectParams): Promise<Connection> {
  const attempt = (ssl: ConnectionOptions['ssl']) =>
    mysql.createConnection({
      host: params.address,
      port: params.port,
      database: params.database,
      user: params.username,
      password: params.password,
      ssl,
      connectTimeout: CONNECT_TIMEOUT_MS,
      dateStrings: false,
      supportBigNumbers: true,
      bigNumberStrings: true,
    });

  switch (params.sslMode) {
    case 'disable':
      return attempt(sslOption(params, 'off'));
    case 'require':
      return attempt(sslOption(params, 'lenient'));
    case 'verify-full':
      return attempt(sslOption(params, 'strict'));
    case 'prefer':
      try {
        return await attempt(sslOption(params, 'lenient'));
      } catch (error) {
        if ((error as { code?: string }).code === 'HANDSHAKE_NO_SSL_SUPPORT') {
          return attempt(sslOption(params, 'off'));
        }
        throw error;
      }
  }
}

/** Runs fn inside a READ ONLY transaction that is always rolled back. */
async function withReadOnly<T>(params: ConnectParams, fn: (conn: Connection) => Promise<T>): Promise<T> {
  const conn = await connect(params);
  // An idle socket error must not crash the process.
  conn.on('error', () => {});
  try {
    await conn.query({ sql: 'START TRANSACTION READ ONLY', timeout: CONNECT_TIMEOUT_MS });
    return await fn(conn);
  } finally {
    await conn.query('ROLLBACK').catch(() => {});
    await conn.end().catch(() => conn.destroy());
  }
}

async function rows<T>(conn: Connection, sql: string, values: unknown[] = []): Promise<T[]> {
  const [result] = await conn.query<RowDataPacket[]>({ sql, values, timeout: CONNECT_TIMEOUT_MS });
  return result as T[];
}

const CURRENT_GRANTEE = `CONCAT("'", SUBSTRING_INDEX(CURRENT_USER(), '@', 1), "'@'", SUBSTRING_INDEX(CURRENT_USER(), '@', -1), "'")`;

export const mysqlDriver: DbDriver = {
  async query(params, sql, maxRows) {
    return withReadOnly(params, async (conn) => {
      // Caps every top-level SELECT of this session without rewriting the user's SQL.
      await conn.query(`SET SESSION sql_select_limit = ${maxRows + 1}`);
      const [result, fields] = await conn.query<RowDataPacket[][]>({
        sql,
        rowsAsArray: true,
        timeout: CONNECT_TIMEOUT_MS,
      });
      return {
        columns: (fields ?? []).map((f) => f.name),
        rows: (result as unknown[][]).slice(0, maxRows + 1).map((r) => r.map(previewValue)),
      };
    });
  },

  async test(params) {
    return withReadOnly(params, async (conn) => {
      const privileges = await rows<{ privilege: string }>(
        conn,
        `SELECT PRIVILEGE_TYPE AS privilege FROM information_schema.USER_PRIVILEGES WHERE GRANTEE = ${CURRENT_GRANTEE}
         UNION SELECT PRIVILEGE_TYPE FROM information_schema.SCHEMA_PRIVILEGES WHERE GRANTEE = ${CURRENT_GRANTEE}
         UNION SELECT PRIVILEGE_TYPE FROM information_schema.TABLE_PRIVILEGES WHERE GRANTEE = ${CURRENT_GRANTEE}
         UNION SELECT PRIVILEGE_TYPE FROM information_schema.COLUMN_PRIVILEGES WHERE GRANTEE = ${CURRENT_GRANTEE}`
      );
      const grantable = await rows<{ n: number }>(
        conn,
        `SELECT COUNT(*) AS n FROM information_schema.USER_PRIVILEGES
         WHERE GRANTEE = ${CURRENT_GRANTEE} AND IS_GRANTABLE = 'YES'`
      );
      const writable =
        privileges.some((p) => !READ_ONLY_PRIVILEGES.has(p.privilege.toUpperCase())) || Number(grantable[0]?.n) > 0;
      return { readOnly: !writable };
    });
  },

  async listTables(params) {
    return withReadOnly(params, async (conn) => {
      const tables = await rows<{ schema: string; table: string; estimate: number | string | null }>(
        conn,
        `SELECT TABLE_SCHEMA AS \`schema\`, TABLE_NAME AS \`table\`, TABLE_ROWS AS estimate
         FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE IN ('BASE TABLE', 'VIEW')
         ORDER BY TABLE_NAME
         LIMIT ?`,
        [MAX_TABLES]
      );
      if (tables.length === 0) return [];

      const columns = await rows<{ table: string; name: string; data_type: string; nullable: string }>(
        conn,
        `SELECT TABLE_NAME AS \`table\`, COLUMN_NAME AS name, COLUMN_TYPE AS data_type, IS_NULLABLE AS nullable
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
         ORDER BY TABLE_NAME, ORDINAL_POSITION`
      );

      const byTable = new Map<string, TableSchema>();
      for (const t of tables) {
        byTable.set(t.table, {
          schema: t.schema,
          table: t.table,
          rowEstimate: t.estimate === null ? null : Number(t.estimate),
          columns: [],
        });
      }
      for (const col of columns) {
        byTable.get(col.table)?.columns.push({
          name: col.name,
          dataType: String(col.data_type),
          nullable: col.nullable === 'YES',
        });
      }
      return [...byTable.values()];
    });
  },

  async preview(params, schema, table) {
    return withReadOnly(params, async (conn) => {
      // Only identifiers that exist (and are visible to this account) reach the dynamic SELECT.
      const found = await rows(
        conn,
        `SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
        [schema, table]
      );
      if (found.length === 0) {
        throw new TableNotFoundError();
      }
      const [result, fields] = await conn.query<RowDataPacket[]>({
        sql: `SELECT * FROM ${mysql.escapeId(schema)}.${mysql.escapeId(table)} LIMIT ${PREVIEW_ROW_LIMIT}`,
        timeout: CONNECT_TIMEOUT_MS,
      });
      const columns = fields.map((f) => f.name);
      return {
        columns,
        rows: result.map((row) => Object.fromEntries(columns.map((c) => [c, previewValue(row[c])]))),
      };
    });
  },
};
