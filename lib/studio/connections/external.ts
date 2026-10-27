import { enforceCatalog } from './allowlist';
import { verifyApiKey } from './apikeys';
import { loadCatalog } from './catalog';
import { jsonError, logActivity } from './core-shim';
import { HttpError, readJson } from './http';
import { executeQuery } from './query';
import { findConnectionById } from './repo';
import { driverFor, savedParams } from './service';
import { validateReadOnlySql } from './sqlguard';
import { QUERY_MAX_ROWS, TYPE_LABELS, type QueryResult } from './types';

// API for the MCP team (API key, no session): read the catalog and run allow-listed SELECTs.

/** API-key auth + uniform errors for /api/connections/[id]/catalog|query. */
export async function withApiKey(
  request: Request,
  rawId: string,
  handler: (connectionId: number, keyId: number) => Promise<Response>
): Promise<Response> {
  try {
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) throw new HttpError(404, 'ไม่พบการเชื่อมต่อนี้');
    const { keyId } = await verifyApiKey(request, id);
    return await handler(id, keyId);
  } catch (error) {
    if (error instanceof HttpError) return jsonError(error.message, error.status, error.extra);
    console.error('[connections api] unexpected error', (error as { code?: string }).code ?? (error as Error).name);
    return jsonError('เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง', 500);
  }
}

const DIALECT_NAME: Record<string, string> = {
  postgresql: 'postgresql',
  cockroachdb: 'postgresql',
  redshift: 'redshift',
  mysql: 'mysql',
  mariadb: 'mariadb',
  mssql: 'tsql',
  oracle: 'oracle',
  clickhouse: 'clickhouse',
};

const DISABLED_MESSAGE = 'ฐานข้อมูลนี้ถูกปิดใช้งานอยู่ ติดต่อผู้ดูแลเพื่อเปิดใช้';

export async function publicCatalog(connectionId: number) {
  const stored = await findConnectionById(connectionId);
  if (!stored) throw new HttpError(404, 'ไม่พบการเชื่อมต่อนี้');
  if (!stored.view.enabled) throw new HttpError(403, DISABLED_MESSAGE);
  const v = stored.view;
  const tables = (await loadCatalog(connectionId))
    .filter((t) => t.enabled && !t.missing)
    .map((t) => ({
      schema: t.schema,
      table: t.table,
      description: t.description,
      descriptionStatus: t.status,
      synonyms: t.synonyms,
      sampleQuestions: t.sampleQuestions,
      rowEstimate: t.rowEstimate,
      columns: t.columns
        .filter((c) => c.enabled && !c.isPii && !c.missing)
        .map((c) => ({
          name: c.name,
          type: c.dataType,
          nullable: c.nullable,
          description: c.description,
          descriptionStatus: c.status,
          exampleValues: c.exampleValues,
        })),
    }));
  return {
    connection: {
      id: v.id,
      name: v.name,
      description: v.description,
      databaseType: v.type,
      databaseLabel: TYPE_LABELS[v.type],
      sqlDialect: DIALECT_NAME[v.type],
      status: v.status,
    },
    query: {
      endpoint: `/api/connections/${v.id}/query`,
      method: 'POST',
      body: { sql: 'SELECT ...', maxRows: QUERY_MAX_ROWS },
      maxRows: QUERY_MAX_ROWS,
      timeoutSeconds: 10,
      rules: [
        'One read-only SELECT/WITH statement',
        'Only the tables and columns listed here',
        'SELECT * only when every column of the table is listed',
      ],
    },
    tables,
  };
}

export async function runApiQuery(connectionId: number, keyId: number, request: Request): Promise<QueryResult> {
  const body = await readJson(request);
  return runCatalogQuery(connectionId, keyId, body.sql, body.maxRows, request);
}

/** Shared by the REST query endpoint and the MCP query tool. */
export async function runCatalogQuery(
  connectionId: number,
  keyId: number,
  rawSql: unknown,
  rawMaxRows: unknown,
  request: Request
): Promise<QueryResult> {
  const stored = await findConnectionById(connectionId);
  if (!stored) throw new HttpError(404, 'ไม่พบการเชื่อมต่อนี้');
  if (!stored.view.enabled) throw new HttpError(403, DISABLED_MESSAGE);
  const sql = validateReadOnlySql(rawSql, stored.view.type);
  const maxRows = rawMaxRows === undefined || rawMaxRows === null ? QUERY_MAX_ROWS : Number(rawMaxRows);
  if (!Number.isInteger(maxRows) || maxRows < 1 || maxRows > QUERY_MAX_ROWS) {
    throw new HttpError(400, `maxRows ต้องอยู่ระหว่าง 1–${QUERY_MAX_ROWS}`);
  }
  enforceCatalog(sql, stored.view.type, await loadCatalog(connectionId));

  let result: QueryResult | null = null;
  try {
    result = await executeQuery(driverFor(stored.view), await savedParams(stored), sql, maxRows);
    return result;
  } finally {
    await logActivity({
      actor: null,
      action: 'connection.api_query',
      targetType: 'data_connection',
      targetId: connectionId,
      detail: { keyId, sqlLength: sql.length, ok: result !== null, rowCount: result?.rowCount ?? 0 },
      request,
    });
  }
}
