import { isIP } from 'node:net';
import sql from 'mssql';
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

async function connect(params: ConnectParams): Promise<sql.ConnectionPool> {
  const encrypt = params.sslMode !== 'disable';
  const pool = new sql.ConnectionPool({
    server: params.address,
    port: params.port,
    database: params.database,
    user: params.username,
    password: params.password,
    connectionTimeout: CONNECT_TIMEOUT_MS,
    requestTimeout: CONNECT_TIMEOUT_MS,
    pool: { max: 1, min: 0 },
    options: {
      encrypt,
      // 'prefer' and 'require' accept self-signed certificates, like the other drivers.
      trustServerCertificate: params.sslMode !== 'verify-full',
      // Certificate checks need the host name, not the resolved IP we dial.
      ...(isIP(params.host) ? {} : { serverName: params.host }),
      appName: 'neuronknowledge-studio',
    },
  });
  // An idle socket error must not crash the process.
  pool.on('error', () => {});
  try {
    return await pool.connect();
  } catch (error) {
    await pool.close().catch(() => {});
    throw error;
  }
}

/** SQL Server has no READ ONLY transaction; queries are SELECT-only and the transaction is always rolled back. */
async function withConnection<T>(params: ConnectParams, fn: (tx: sql.Transaction) => Promise<T>): Promise<T> {
  const pool = await connect(params);
  const tx = new sql.Transaction(pool);
  try {
    await tx.begin(sql.ISOLATION_LEVEL.READ_COMMITTED);
    return await fn(tx);
  } finally {
    await tx.rollback().catch(() => {});
    await pool.close().catch(() => {});
  }
}

function bracket(name: string): string {
  return `[${name.replace(/]/g, ']]')}]`;
}

function formatType(type: string, length: number | null): string {
  if (length === null) return type;
  return `${type}(${length === -1 ? 'max' : length})`;
}

export const mssqlDriver: DbDriver = {
  async query(params, sql, maxRows) {
    return withConnection(params, async (tx) => {
      // SET ROWCOUNT stays on the connection, so it caps the next statement in this transaction.
      await tx.request().batch(`SET ROWCOUNT ${maxRows + 1}`);
      const request = tx.request();
      request.arrayRowMode = true;
      const result = await request.query(sql);
      // arrayRowMode exposes column metadata per recordset on result.columns (missing from the typings).
      const meta = (result as unknown as { columns?: { name: string }[][] }).columns?.[0] ?? [];
      const rows = (result.recordset ?? []) as unknown as unknown[][];
      return { columns: meta.map((c) => c.name), rows: rows.map((r) => r.map(previewValue)) };
    });
  },

  async test(params) {
    return withConnection(params, async (tx) => {
      const { recordset } = await tx.request().query<{ writable: number }>(`
        SELECT CASE WHEN
          IS_SRVROLEMEMBER('sysadmin') = 1
          OR IS_ROLEMEMBER('db_owner') = 1 OR IS_ROLEMEMBER('db_datawriter') = 1 OR IS_ROLEMEMBER('db_ddladmin') = 1
          OR HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'INSERT') = 1
          OR HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'UPDATE') = 1
          OR HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'DELETE') = 1
          OR HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'ALTER') = 1
          OR HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'CREATE TABLE') = 1
          OR EXISTS (
            SELECT 1 FROM sys.objects o
            WHERE o.type = 'U' AND (
              HAS_PERMS_BY_NAME(QUOTENAME(SCHEMA_NAME(o.schema_id)) + '.' + QUOTENAME(o.name), 'OBJECT', 'INSERT') = 1
              OR HAS_PERMS_BY_NAME(QUOTENAME(SCHEMA_NAME(o.schema_id)) + '.' + QUOTENAME(o.name), 'OBJECT', 'UPDATE') = 1
              OR HAS_PERMS_BY_NAME(QUOTENAME(SCHEMA_NAME(o.schema_id)) + '.' + QUOTENAME(o.name), 'OBJECT', 'DELETE') = 1)
          )
        THEN 1 ELSE 0 END AS writable`);
      return { readOnly: recordset[0]?.writable !== 1 };
    });
  },

  async listTables(params) {
    return withConnection(params, async (tx) => {
      const tables = await tx
        .request()
        .input('limit', sql.Int, MAX_TABLES)
        .query<{ schema: string; table: string; estimate: number | null }>(`
          SELECT TOP (@limit) s.name AS [schema], o.name AS [table],
                 (SELECT SUM(p.rows) FROM sys.partitions p
                  WHERE p.object_id = o.object_id AND p.index_id IN (0, 1)) AS estimate
          FROM sys.objects o JOIN sys.schemas s ON s.schema_id = o.schema_id
          WHERE o.type IN ('U', 'V') AND o.is_ms_shipped = 0
            AND HAS_PERMS_BY_NAME(QUOTENAME(s.name) + '.' + QUOTENAME(o.name), 'OBJECT', 'SELECT') = 1
          ORDER BY s.name, o.name`);
      if (tables.recordset.length === 0) return [];

      const columns = await tx.request().query<{
        schema: string;
        table: string;
        name: string;
        data_type: string;
        length: number | null;
        nullable: string;
      }>(`
        SELECT TABLE_SCHEMA AS [schema], TABLE_NAME AS [table], COLUMN_NAME AS name,
               DATA_TYPE AS data_type, CHARACTER_MAXIMUM_LENGTH AS length, IS_NULLABLE AS nullable
        FROM INFORMATION_SCHEMA.COLUMNS
        ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION`);

      const byTable = new Map<string, TableSchema>();
      for (const t of tables.recordset) {
        byTable.set(`${t.schema}\u0000${t.table}`, {
          schema: t.schema,
          table: t.table,
          // Views have no partitions of their own.
          rowEstimate: t.estimate === null ? null : Number(t.estimate),
          columns: [],
        });
      }
      for (const col of columns.recordset) {
        byTable.get(`${col.schema}\u0000${col.table}`)?.columns.push({
          name: col.name,
          dataType: formatType(col.data_type, col.length),
          nullable: col.nullable === 'YES',
        });
      }
      return [...byTable.values()];
    });
  },

  async preview(params, schema, table) {
    return withConnection(params, async (tx) => {
      // Only identifiers that exist and are readable reach the dynamic SELECT below.
      const found = await tx
        .request()
        .input('schema', sql.NVarChar(255), schema)
        .input('table', sql.NVarChar(255), table)
        .query(`
          SELECT 1 AS ok FROM sys.objects o JOIN sys.schemas s ON s.schema_id = o.schema_id
          WHERE s.name = @schema AND o.name = @table AND o.type IN ('U', 'V')
            AND HAS_PERMS_BY_NAME(QUOTENAME(s.name) + '.' + QUOTENAME(o.name), 'OBJECT', 'SELECT') = 1`);
      if (found.recordset.length === 0) {
        throw new TableNotFoundError();
      }
      const result = await tx
        .request()
        .query<Record<string, unknown>>(`SELECT TOP (${PREVIEW_ROW_LIMIT}) * FROM ${bracket(schema)}.${bracket(table)}`);
      const columns = Object.keys(result.recordset.columns);
      return {
        columns,
        rows: result.recordset.map((row) => Object.fromEntries(columns.map((c) => [c, previewValue(row[c])]))),
      };
    });
  },
};
