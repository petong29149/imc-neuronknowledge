import oracledb from 'oracledb';
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

// Thin mode (pure JavaScript, no Oracle Client install). "database" is the service name.
// LOBs come back as strings/buffers so preview rows stay JSON-safe.
const fetchTypeHandler = (metaData: oracledb.Metadata<unknown>): oracledb.FetchTypeResponse | undefined => {
  if (metaData.dbType === oracledb.DB_TYPE_CLOB || metaData.dbType === oracledb.DB_TYPE_NCLOB) {
    return { type: oracledb.STRING };
  }
  if (metaData.dbType === oracledb.DB_TYPE_BLOB) {
    return { type: oracledb.BUFFER };
  }
  return undefined;
};

// System privileges that cannot change data or schema; anything else counts as writable.
const READ_ONLY_SYS_PRIVS = [
  'CREATE SESSION',
  'SET CONTAINER',
  'SELECT ANY TABLE',
  'SELECT ANY DICTIONARY',
  'READ ANY TABLE',
  'SELECT ANY SEQUENCE',
];

function connectString(params: ConnectParams): string {
  const tcps = params.sslMode === 'require' || params.sslMode === 'verify-full';
  const service = params.database.replace(/[()=]/g, '');
  return (
    `(DESCRIPTION=(ADDRESS=(PROTOCOL=${tcps ? 'tcps' : 'tcp'})(HOST=${params.address})(PORT=${params.port}))` +
    `(CONNECT_DATA=(SERVICE_NAME=${service})))`
  );
}

async function withReadOnly<T>(params: ConnectParams, fn: (conn: oracledb.Connection) => Promise<T>): Promise<T> {
  const conn = await oracledb.getConnection({
    user: params.username,
    password: params.password,
    connectString: connectString(params),
    connectTimeout: CONNECT_TIMEOUT_MS / 1000,
    transportConnectTimeout: CONNECT_TIMEOUT_MS / 1000,
    // TCPS dials the resolved IP, so DN matching is only enforced for verify-full.
    sslServerDNMatch: params.sslMode === 'verify-full',
  });
  conn.callTimeout = CONNECT_TIMEOUT_MS;
  try {
    await conn.execute('SET TRANSACTION READ ONLY');
    return await fn(conn);
  } finally {
    await conn.rollback().catch(() => {});
    await conn.close().catch(() => {});
  }
}

async function rows<T>(conn: oracledb.Connection, sql: string, binds: oracledb.BindParameters = []): Promise<T[]> {
  const result = await conn.execute<T>(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchTypeHandler });
  return result.rows ?? [];
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

const USER_OWNERS = `owner IN (SELECT username FROM all_users WHERE oracle_maintained = 'N')`;

export const oracleDriver: DbDriver = {
  async query(params, sql, maxRows) {
    return withReadOnly(params, async (conn) => {
      const result = await conn.execute<unknown[]>(sql, [], {
        outFormat: oracledb.OUT_FORMAT_ARRAY,
        maxRows: maxRows + 1,
        fetchTypeHandler,
      });
      return {
        columns: (result.metaData ?? []).map((m) => m.name),
        rows: (result.rows ?? []).map((r) => r.map(previewValue)),
      };
    });
  },

  async test(params) {
    return withReadOnly(params, async (conn) => {
      const [check] = await rows<{ WRITABLE: number }>(
        conn,
        `SELECT CASE WHEN
            EXISTS (SELECT 1 FROM session_privs
                    WHERE privilege NOT IN (${READ_ONLY_SYS_PRIVS.map((_, i) => `:p${i}`).join(', ')}))
            OR EXISTS (SELECT 1 FROM user_tables)
            OR EXISTS (SELECT 1 FROM user_tab_privs
                       WHERE grantee = USER AND privilege IN ('INSERT', 'UPDATE', 'DELETE', 'ALTER', 'INDEX'))
            OR EXISTS (SELECT 1 FROM role_tab_privs WHERE privilege IN ('INSERT', 'UPDATE', 'DELETE', 'ALTER', 'INDEX'))
          THEN 1 ELSE 0 END AS writable
         FROM dual`,
        Object.fromEntries(READ_ONLY_SYS_PRIVS.map((p, i) => [`p${i}`, p]))
      );
      return { readOnly: check?.WRITABLE !== 1 };
    });
  },

  async listTables(params) {
    return withReadOnly(params, async (conn) => {
      const tables = await rows<{ OWNER: string; NAME: string; ESTIMATE: number | null }>(
        conn,
        `SELECT owner, name, estimate FROM (
           SELECT owner, table_name AS name, num_rows AS estimate FROM all_tables
           WHERE ${USER_OWNERS} AND nested = 'NO' AND secondary = 'N'
           UNION ALL
           SELECT owner, view_name, NULL FROM all_views WHERE ${USER_OWNERS}
         ) ORDER BY owner, name
         FETCH FIRST :limit ROWS ONLY`,
        { limit: MAX_TABLES }
      );
      if (tables.length === 0) return [];

      const columns = await rows<{
        OWNER: string;
        TABLE_NAME: string;
        COLUMN_NAME: string;
        DATA_TYPE: string;
        CHAR_LENGTH: number;
        DATA_PRECISION: number | null;
        DATA_SCALE: number | null;
        NULLABLE: string;
      }>(
        conn,
        `SELECT owner, table_name, column_name, data_type, char_length, data_precision, data_scale, nullable
         FROM all_tab_columns WHERE ${USER_OWNERS}
         ORDER BY owner, table_name, column_id`
      );

      const byTable = new Map<string, TableSchema>();
      for (const t of tables) {
        byTable.set(`${t.OWNER}\u0000${t.NAME}`, {
          schema: t.OWNER,
          table: t.NAME,
          rowEstimate: t.ESTIMATE ?? null,
          columns: [],
        });
      }
      for (const c of columns) {
        let dataType = c.DATA_TYPE;
        if (c.CHAR_LENGTH > 0) dataType += `(${c.CHAR_LENGTH})`;
        else if (c.DATA_PRECISION !== null) dataType += `(${c.DATA_PRECISION},${c.DATA_SCALE ?? 0})`;
        byTable.get(`${c.OWNER}\u0000${c.TABLE_NAME}`)?.columns.push({
          name: c.COLUMN_NAME,
          dataType,
          nullable: c.NULLABLE === 'Y',
        });
      }
      return [...byTable.values()];
    });
  },

  async preview(params, schema, table) {
    return withReadOnly(params, async (conn) => {
      // Only identifiers that exist and are visible reach the dynamic SELECT below.
      const found = await rows(
        conn,
        `SELECT 1 FROM all_tables WHERE owner = :o AND table_name = :t
         UNION ALL SELECT 1 FROM all_views WHERE owner = :o AND view_name = :t`,
        { o: schema, t: table }
      );
      if (found.length === 0) {
        throw new TableNotFoundError();
      }
      const result = await conn.execute<Record<string, unknown>>(
        `SELECT * FROM ${quoteIdent(schema)}.${quoteIdent(table)} FETCH FIRST ${PREVIEW_ROW_LIMIT} ROWS ONLY`,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchTypeHandler }
      );
      const columns = (result.metaData ?? []).map((m) => m.name);
      return {
        columns,
        rows: (result.rows ?? []).map((row) => Object.fromEntries(columns.map((c) => [c, previewValue(row[c])]))),
      };
    });
  },
};
