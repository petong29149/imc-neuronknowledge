import type { AuthUser } from '@/lib/auth';
import { logActivity } from './core-shim';
import type { ConnectParams, DbDriver } from './drivers';
import { friendlyConnectionError } from './errors';
import { HttpError } from './http';
import { driverFor, requireConnection, savedParams } from './service';
import { validateReadOnlySql } from './sqlguard';
import { QUERY_MAX_ROWS, type QueryResult } from './types';

/** Runs validated SQL and shapes the result; driver errors become Thai messages. */
export async function executeQuery(
  driver: DbDriver,
  params: ConnectParams,
  sql: string,
  maxRows: number
): Promise<QueryResult> {
  const started = Date.now();
  try {
    const raw = await driver.query(params, sql, maxRows);
    return {
      columns: raw.columns,
      rows: raw.rows.slice(0, maxRows),
      rowCount: Math.min(raw.rows.length, maxRows),
      truncated: raw.rows.length > maxRows,
      durationMs: Date.now() - started,
    };
  } catch (error) {
    throw new HttpError(400, friendlyQueryError(error));
  }
}

/** SQL errors are expected while testing, so give the reason without echoing SQL or server details. */
function friendlyQueryError(error: unknown): string {
  const { code, message = '' } = (error ?? {}) as { code?: string; message?: string };
  if (code === '25006' || /read-only|read only|readonly|code: 164/i.test(message)) {
    return 'คำสั่งนี้พยายามแก้ข้อมูล ซึ่งไม่อนุญาต (อ่านอย่างเดียว)';
  }
  if (code === '42P01' || code === 'ER_NO_SUCH_TABLE' || code === 'ORA-00942' || /Invalid object name|UNKNOWN_TABLE|code: 60/i.test(message)) {
    return 'ไม่พบตารางที่อ้างถึง หรือบัญชีนี้ไม่มีสิทธิ์อ่าน';
  }
  if (code === '42703' || code === 'ER_BAD_FIELD_ERROR' || code === 'ORA-00904' || /Invalid column name|UNKNOWN_IDENTIFIER|code: 47/i.test(message)) {
    return 'ไม่พบคอลัมน์ที่อ้างถึง';
  }
  if (code === '42601' || code === 'ER_PARSE_ERROR' || /syntax|SYNTAX_ERROR|code: 62|ORA-009/i.test(message)) {
    return 'รูปแบบคำสั่ง SQL ไม่ถูกต้อง ตรวจไวยากรณ์อีกครั้ง';
  }
  if (code === '57014' || /timeout|timed out|ETIMEOUT/i.test(message)) {
    return 'คำสั่งใช้เวลานานเกิน 10 วินาที ลองเพิ่มเงื่อนไขหรือจำกัดข้อมูลให้น้อยลง';
  }
  return friendlyConnectionError(error);
}

export async function runStudioQuery(
  session: AuthUser,
  id: number,
  body: Record<string, unknown>,
  request: Request
): Promise<QueryResult> {
  const stored = await requireConnection(session, id);
  const sql = validateReadOnlySql(body.sql, stored.view.type);
  const driver = driverFor(stored.view);
  const params = await savedParams(stored);

  let result: QueryResult | null = null;
  try {
    result = await executeQuery(driver, params, sql, QUERY_MAX_ROWS);
    return result;
  } finally {
    // Only the shape of the query is logged, never its text.
    await logActivity({
      actor: session,
      action: 'connection.query',
      targetType: 'data_connection',
      targetId: id,
      detail: { sqlLength: sql.length, ok: result !== null, rowCount: result?.rowCount ?? 0 },
      request,
    });
  }
}
