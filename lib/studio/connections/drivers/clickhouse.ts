import http from 'node:http';
import https from 'node:https';
import { isIP } from 'node:net';
import { createClient, type ClickHouseClient } from '@clickhouse/client';
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

// ClickHouse over its HTTP interface. disable/prefer = HTTP, require/verify-full = HTTPS.
// The URL uses the resolved IP; the agent keeps the host name for TLS (SNI + certificate check).

// Grants that cannot change data or schema; any other access type counts as writable.
const READ_ONLY_ACCESS = [
  'SELECT',
  'SHOW',
  'SHOW DATABASES',
  'SHOW TABLES',
  'SHOW COLUMNS',
  'SHOW DICTIONARIES',
  'USE',
  'DICTGET',
];

function createConn(params: ConnectParams): ClickHouseClient {
  const secure = params.sslMode === 'require' || params.sslMode === 'verify-full';
  const hostForUrl = isIP(params.address) === 6 ? `[${params.address}]` : params.address;
  const agent = secure
    ? new https.Agent({
        keepAlive: false,
        rejectUnauthorized: params.sslMode === 'verify-full',
        ...(isIP(params.host) ? {} : { servername: params.host }),
      })
    : new http.Agent({ keepAlive: false });
  return createClient({
    url: `${secure ? 'https' : 'http'}://${hostForUrl}:${params.port}`,
    username: params.username,
    password: params.password,
    database: params.database,
    request_timeout: CONNECT_TIMEOUT_MS,
    application: 'neuronknowledge-studio',
    http_agent: agent,
    // A custom agent replaces the client's own TLS handling, so auth goes in the header.
    set_basic_auth_header: true,
    keep_alive: { enabled: false },
  });
}

async function withClient<T>(params: ConnectParams, fn: (client: ClickHouseClient) => Promise<T>): Promise<T> {
  const client = createConn(params);
  try {
    // ping() swallows errors into its result; surface them so the error mapper sees them.
    const ping = await client.ping();
    if (!ping.success) throw ping.error;
    return await fn(client);
  } finally {
    await client.close().catch(() => {});
  }
}

async function rows<T>(client: ClickHouseClient, query: string, params: Record<string, unknown> = {}): Promise<T[]> {
  const result = await client.query({ query, query_params: params, format: 'JSONEachRow' });
  return result.json<T>();
}

function quoteIdent(name: string): string {
  return `\`${name.replace(/\\/g, '\\\\').replace(/`/g, '\\`')}\``;
}

async function grantLines(client: ClickHouseClient, query: string): Promise<string[]> {
  const result = await client.query({ query, format: 'TabSeparatedRaw' });
  return (await result.text()).split('\n').map((l) => l.trim()).filter((l) => l.startsWith('GRANT '));
}

/** "GRANT SELECT(a, b), ALTER UPDATE ON db.* TO u" → ['SELECT', 'ALTER UPDATE'] */
function privilegesOf(line: string): string[] {
  const list = line.replace(/^GRANT\s+/, '').replace(/\s+ON\s+.*$/, '').replace(/\([^)]*\)/g, '');
  return list.split(',').map((p) => p.trim().toUpperCase()).filter(Boolean);
}

/** JSONCompact body: column metadata plus rows as arrays. */
type CompactResult = { meta?: { name: string }[]; data: unknown[][] };

export const clickhouseDriver: DbDriver = {
  async query(params, sql, maxRows) {
    return withClient(params, async (client) => {
      let body: CompactResult;
      try {
        // readonly = 2 blocks writes for this query; the overflow settings stop reading early.
        const result = await client.query({
          query: sql,
          format: 'JSONCompact',
          clickhouse_settings: {
            readonly: '2',
            max_result_rows: String(maxRows + 1),
            result_overflow_mode: 'break',
          },
        });
        body = (await result.json<unknown[]>()) as CompactResult;
      } catch (error) {
        // Profiles with readonly = 1 may not change any setting (code 164): fall back to an outer LIMIT.
        if ((error as { code?: string }).code !== '164') throw error;
        const result = await client.query({
          query: `SELECT * FROM (${sql}) LIMIT ${maxRows + 1}`,
          format: 'JSONCompact',
        });
        body = (await result.json<unknown[]>()) as CompactResult;
      }
      return {
        columns: (body.meta ?? []).map((m) => m.name),
        rows: body.data.slice(0, maxRows + 1).map((r) => r.map(previewValue)),
      };
    });
  },

  async test(params) {
    return withClient(params, async (client) => {
      const [setting] = await rows<{ readonly: string }>(client, `SELECT getSetting('readonly') AS readonly`);
      // readonly = 1 or 2 is enforced by the server for this user's profile.
      if (Number(setting?.readonly) > 0) return { readOnly: true };

      // system.grants needs extra privileges; SHOW GRANTS always works for the current user.
      const lines = await grantLines(client, 'SHOW GRANTS');
      const roles = lines.filter((l) => !/ ON /.test(l)).map((l) => l.replace(/^GRANT\s+(.+?)\s+TO\s+.+$/, '$1'));
      for (const role of roles.flatMap((r) => r.split(',').map((x) => x.trim())).filter(Boolean)) {
        try {
          lines.push(...(await grantLines(client, `SHOW GRANTS FOR ${quoteIdent(role)}`)));
        } catch {
          // Role privileges are not visible to this account: cannot prove read-only.
          return { readOnly: false };
        }
      }
      const privileges = lines.filter((l) => / ON /.test(l)).flatMap(privilegesOf);
      const writable =
        privileges.length === 0 ||
        privileges.some((p) => !READ_ONLY_ACCESS.includes(p)) ||
        lines.some((l) => /WITH GRANT OPTION/.test(l));
      return { readOnly: !writable };
    });
  },

  async listTables(params) {
    return withClient(params, async (client) => {
      const tables = await rows<{ schema: string; table: string; estimate: string | null }>(
        client,
        `SELECT database AS schema, name AS table, total_rows AS estimate
         FROM system.tables
         WHERE database = currentDatabase() AND NOT is_temporary
         ORDER BY name
         LIMIT {limit:UInt32}`,
        { limit: MAX_TABLES }
      );
      if (tables.length === 0) return [];

      const columns = await rows<{ table: string; name: string; type: string }>(
        client,
        `SELECT table, name, type FROM system.columns WHERE database = currentDatabase() ORDER BY table, position`
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
      for (const c of columns) {
        byTable.get(c.table)?.columns.push({
          name: c.name,
          dataType: c.type,
          nullable: c.type.startsWith('Nullable('),
        });
      }
      return [...byTable.values()];
    });
  },

  async preview(params, schema, table) {
    return withClient(params, async (client) => {
      // Only identifiers that exist and are visible reach the dynamic SELECT below.
      const found = await rows(
        client,
        `SELECT 1 FROM system.tables WHERE database = {db:String} AND name = {table:String}`,
        { db: schema, table }
      );
      if (found.length === 0) {
        throw new TableNotFoundError();
      }
      const result = await client.query({
        query: `SELECT * FROM ${quoteIdent(schema)}.${quoteIdent(table)} LIMIT ${PREVIEW_ROW_LIMIT}`,
        format: 'JSON',
      });
      const body = await result.json<Record<string, unknown>>();
      const columns = body.meta?.map((m) => m.name) ?? [];
      return {
        columns,
        rows: body.data.map((row) => Object.fromEntries(columns.map((c) => [c, previewValue(row[c])]))),
      };
    });
  },
};
