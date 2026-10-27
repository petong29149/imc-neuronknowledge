import type { TableSchema } from '@/lib/studio/types';
import { pgQuery, quoteIdent, withReadOnly } from './postgres';
import { MAX_TABLES, PREVIEW_ROW_LIMIT, TableNotFoundError, previewValue, type DbDriver } from './types';

// Amazon Redshift speaks the PostgreSQL protocol but lacks pg_roles flags, multi-array
// unnest() and reliable reltuples, so it reads the catalog through information_schema.
// Not verified against a real cluster yet (see docs/handoff/S02.md).

const USER_SCHEMAS = `table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_internal', 'pg_automv')
  AND table_schema NOT LIKE 'pg\\_temp%'`;

const qualified = `quote_ident(t.table_schema) || '.' || quote_ident(t.table_name)`;

export const redshiftDriver: DbDriver = {
  query: pgQuery,

  async test(params) {
    return withReadOnly(params, async (client) => {
      const { rows } = await client.query<{ writable: boolean }>(`
        SELECT
          COALESCE((SELECT usesuper OR usecreatedb FROM pg_user WHERE usename = current_user), false)
          OR has_database_privilege(current_database(), 'CREATE')
          OR EXISTS (
            SELECT 1 FROM pg_namespace n
            WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_internal', 'pg_automv')
              AND n.nspname NOT LIKE 'pg\\_%' AND has_schema_privilege(n.nspname, 'CREATE')
          )
          OR EXISTS (
            SELECT 1 FROM information_schema.tables t
            WHERE t.table_type = 'BASE TABLE' AND ${USER_SCHEMAS}
              AND (has_table_privilege(${qualified}, 'INSERT') OR has_table_privilege(${qualified}, 'UPDATE')
                OR has_table_privilege(${qualified}, 'DELETE'))
          ) AS writable`);
      return { readOnly: !rows[0]?.writable };
    });
  },

  async listTables(params) {
    return withReadOnly(params, async (client) => {
      const tables = await client.query<{ schema: string; table: string }>(
        `SELECT t.table_schema AS schema, t.table_name AS table
         FROM information_schema.tables t
         WHERE t.table_type IN ('BASE TABLE', 'VIEW') AND ${USER_SCHEMAS}
           AND has_table_privilege(${qualified}, 'SELECT')
         ORDER BY 1, 2
         LIMIT $1`,
        [MAX_TABLES]
      );
      if (tables.rows.length === 0) return [];

      const columns = await client.query<{
        schema: string;
        table: string;
        name: string;
        data_type: string;
        length: number | null;
        nullable: string;
      }>(
        `SELECT table_schema AS schema, table_name AS table, column_name AS name, data_type,
                character_maximum_length AS length, is_nullable AS nullable
         FROM information_schema.columns
         WHERE ${USER_SCHEMAS}
         ORDER BY table_schema, table_name, ordinal_position`
      );

      const byTable = new Map<string, TableSchema>();
      for (const t of tables.rows) {
        byTable.set(`${t.schema}\u0000${t.table}`, { schema: t.schema, table: t.table, rowEstimate: null, columns: [] });
      }
      for (const col of columns.rows) {
        byTable.get(`${col.schema}\u0000${col.table}`)?.columns.push({
          name: col.name,
          dataType: col.length ? `${col.data_type}(${col.length})` : col.data_type,
          nullable: col.nullable === 'YES',
        });
      }
      return [...byTable.values()];
    });
  },

  async preview(params, schema, table) {
    return withReadOnly(params, async (client) => {
      const found = await client.query(
        `SELECT 1 FROM information_schema.tables t
         WHERE t.table_schema = $1 AND t.table_name = $2 AND has_table_privilege(${qualified}, 'SELECT')`,
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
