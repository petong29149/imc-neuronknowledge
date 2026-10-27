import { isIP } from 'node:net';
import { Client, type ClientConfig } from 'pg';
import type { TableSchema } from '@/lib/studio/types';
import {
  CONNECT_TIMEOUT_MS,
  MAX_TABLES,
  PREVIEW_ROW_LIMIT,
  TableNotFoundError,
  previewValue,
  type ConnectParams,
  type DbDriver,
  type RawQueryResult,
} from './types';

// crdb_internal / pg_extension are CockroachDB system schemas (this driver also serves CockroachDB).
const SYSTEM_SCHEMA_FILTER = `n.nspname NOT IN ('pg_catalog', 'information_schema', 'crdb_internal', 'pg_extension')
  AND n.nspname NOT LIKE 'pg\\_toast%' AND n.nspname NOT LIKE 'pg\\_temp%'`;

function sslOption(params: ConnectParams, mode: 'off' | 'lenient' | 'strict'): ClientConfig['ssl'] {
  if (mode === 'off') return false;
  // SNI must be a host name; an IP literal is only valid without servername.
  const servername = isIP(params.host) ? undefined : params.host;
  return { rejectUnauthorized: mode === 'strict', servername };
}

async function connect(params: ConnectParams): Promise<Client> {
  const attempt = async (ssl: ClientConfig['ssl']) => {
    const client = new Client({
      host: params.address,
      port: params.port,
      database: params.database,
      user: params.username,
      password: params.password,
      ssl,
      connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
      statement_timeout: CONNECT_TIMEOUT_MS,
      query_timeout: CONNECT_TIMEOUT_MS,
      application_name: 'neuronknowledge-studio',
    });
    // An idle socket error must not crash the process.
    client.on('error', () => {});
    try {
      await client.connect();
      return client;
    } catch (error) {
      await client.end().catch(() => {});
      throw error;
    }
  };

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
        if (/does not support SSL/i.test((error as Error).message ?? '')) {
          return attempt(sslOption(params, 'off'));
        }
        throw error;
      }
  }
}

/** Runs fn inside a READ ONLY transaction that is always rolled back. */
export async function withReadOnly<T>(params: ConnectParams, fn: (client: Client) => Promise<T>): Promise<T> {
  const client = await connect(params);
  try {
    await client.query('BEGIN READ ONLY');
    return await fn(client);
  } finally {
    await client.query('ROLLBACK').catch(() => {});
    await client.end().catch(() => {});
  }
}

export function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/** Shared by PostgreSQL, CockroachDB and Redshift: the outer LIMIT caps the rows fetched. */
export function pgQuery(params: ConnectParams, sql: string, maxRows: number): Promise<RawQueryResult> {
  return withReadOnly(params, async (client) => {
    const result = await client.query<unknown[]>({
      text: `SELECT * FROM (${sql}) AS nk_query LIMIT ${maxRows + 1}`,
      rowMode: 'array',
    });
    return { columns: result.fields.map((f) => f.name), rows: result.rows.map((r) => r.map(previewValue)) };
  });
}

export const postgresDriver: DbDriver = {
  query: pgQuery,

  async test(params) {
    // Privilege check instead of a temp table: TEMP is granted to PUBLIC by default,
    // so creating one says nothing about whether real data can be changed.
    return withReadOnly(params, async (client) => {
      const { rows } = await client.query<{ writable: boolean }>(`
        SELECT
          COALESCE((SELECT rolsuper OR rolcreaterole OR rolcreatedb FROM pg_roles WHERE rolname = current_user), false)
          OR has_database_privilege(current_database(), 'CREATE')
          OR EXISTS (
            SELECT 1 FROM pg_namespace n
            WHERE ${SYSTEM_SCHEMA_FILTER} AND has_schema_privilege(n.oid, 'CREATE')
          )
          OR EXISTS (
            SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relkind IN ('r', 'p') AND ${SYSTEM_SCHEMA_FILTER}
              AND (has_table_privilege(c.oid, 'INSERT') OR has_table_privilege(c.oid, 'UPDATE')
                OR has_table_privilege(c.oid, 'DELETE') OR has_table_privilege(c.oid, 'TRUNCATE'))
          ) AS writable`);
      return { readOnly: !rows[0]?.writable };
    });
  },

  async listTables(params) {
    return withReadOnly(params, async (client) => {
      const tables = await client.query<{ schema: string; table: string; estimate: string }>(
        `SELECT n.nspname AS schema, c.relname AS table, c.reltuples::bigint AS estimate
         FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE c.relkind IN ('r', 'p', 'v', 'm') AND ${SYSTEM_SCHEMA_FILTER}
           AND has_table_privilege(c.oid, 'SELECT')
         ORDER BY n.nspname, c.relname
         LIMIT $1`,
        [MAX_TABLES]
      );
      if (tables.rows.length === 0) return [];

      const columns = await client.query<{
        schema: string;
        table: string;
        name: string;
        data_type: string;
        nullable: boolean;
      }>(
        `SELECT n.nspname AS schema, c.relname AS table, a.attname AS name,
                format_type(a.atttypid, a.atttypmod) AS data_type, NOT a.attnotnull AS nullable
         FROM pg_attribute a
         JOIN pg_class c ON c.oid = a.attrelid
         JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE a.attnum > 0 AND NOT a.attisdropped
           AND (n.nspname, c.relname) IN (SELECT * FROM unnest($1::text[], $2::text[]))
         ORDER BY n.nspname, c.relname, a.attnum`,
        [tables.rows.map((t) => t.schema), tables.rows.map((t) => t.table)]
      );

      const byTable = new Map<string, TableSchema>();
      for (const t of tables.rows) {
        const estimate = Number(t.estimate);
        byTable.set(`${t.schema}\u0000${t.table}`, {
          schema: t.schema,
          table: t.table,
          // -1 = never analyzed (PostgreSQL); CockroachDB always reports 0, so 0 also means unknown.
          rowEstimate: estimate > 0 ? estimate : null,
          columns: [],
        });
      }
      for (const col of columns.rows) {
        byTable.get(`${col.schema}\u0000${col.table}`)?.columns.push({
          name: col.name,
          dataType: col.data_type,
          nullable: col.nullable,
        });
      }
      return [...byTable.values()];
    });
  },

  async preview(params, schema, table) {
    return withReadOnly(params, async (client) => {
      // Only identifiers that exist and are readable reach the dynamic SELECT below.
      const found = await client.query(
        `SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = $1 AND c.relname = $2 AND c.relkind IN ('r', 'p', 'v', 'm')
           AND has_table_privilege(c.oid, 'SELECT')`,
        [schema, table]
      );
      if (found.rowCount === 0) {
        throw new TableNotFoundError();
      }
      const result = await client.query(
        `SELECT * FROM ${quoteIdent(schema)}.${quoteIdent(table)} LIMIT ${PREVIEW_ROW_LIMIT}`
      );
      const columns = result.fields.map((f) => f.name);
      const rows = result.rows.map((row: Record<string, unknown>) =>
        Object.fromEntries(columns.map((c) => [c, previewValue(row[c])]))
      );
      return { columns, rows };
    });
  },
};
