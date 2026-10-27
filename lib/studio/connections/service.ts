import type { AuthUser } from '@/lib/auth';
import type { TableSchema } from '@/lib/studio/types';
import { decryptSecret, encryptSecret, logActivity } from './core-shim';
import { getDriver, TableNotFoundError, type ConnectParams } from './drivers';
import { friendlyConnectionError } from './errors';
import { BLOCKED_HOST_MESSAGE, checkHost } from './guard';
import { HttpError, parseId } from './http';
import {
  deleteUnusedConnection,
  findConnection,
  insertConnection,
  listConnections,
  saveTestResult,
  updateConnectionRow,
  type StoredConnection,
} from './repo';
import { TYPE_LABELS, type ConnectionInput, type ConnectionView, type PreviewResult, type TestResult } from './types';
import { parseConnectionInput } from './validate';

export { listConnections };

const WRITABLE_MESSAGE =
  'บัญชีนี้มีสิทธิ์เขียนหรือแก้ไขข้อมูลใน database ควรใช้บัญชีที่อ่านได้อย่างเดียว ถ้าต้องการใช้ต่อให้ยืนยันก่อนบันทึก';

export async function requireConnection(session: AuthUser, id: number): Promise<StoredConnection> {
  const found = await findConnection(session, id);
  if (!found) {
    throw new HttpError(404, 'ไม่พบการเชื่อมต่อนี้');
  }
  return found;
}

function storedPassword(stored: StoredConnection): string {
  if (!stored.passwordEncrypted) return '';
  try {
    return decryptSecret(stored.passwordEncrypted);
  } catch {
    throw new HttpError(500, 'ถอดรหัสรหัสผ่านที่บันทึกไว้ไม่ได้ กรุณาแก้ไขการเชื่อมต่อแล้วกรอกรหัสผ่านใหม่');
  }
}

/**
 * Reusing a stored password is only allowed when it still goes to the same server;
 * otherwise anyone who can edit a connection could send its password to a host they control.
 */
function resolvePassword(input: ConnectionInput, stored: StoredConnection | null): string {
  if (input.password || !stored) return input.password;
  const sameServer =
    stored.view.host.toLowerCase() === input.host.toLowerCase() &&
    stored.view.port === input.port &&
    stored.view.type === input.type;
  if (!sameServer) {
    throw new HttpError(400, 'เปลี่ยนประเภท host หรือ port แล้ว ต้องกรอกรหัสผ่านใหม่');
  }
  return storedPassword(stored);
}

async function connectParams(input: ConnectionInput, password: string): Promise<ConnectParams | TestResult> {
  const host = await checkHost(input.host);
  if (host.kind === 'blocked') {
    throw new HttpError(400, BLOCKED_HOST_MESSAGE);
  }
  if (host.kind === 'unresolvable') {
    return { ok: false, readOnly: false, error: 'ไม่พบ host นี้ ตรวจชื่อ host อีกครั้ง' };
  }
  return {
    host: input.host,
    address: host.address,
    port: input.port,
    database: input.database,
    username: input.username,
    password,
    sslMode: input.sslMode,
  };
}

export function driverFor(input: Pick<ConnectionInput, 'type'>) {
  const driver = getDriver(input.type);
  if (!driver) {
    throw new HttpError(400, `ยังไม่รองรับ ${TYPE_LABELS[input.type]} ในตอนนี้`);
  }
  return driver;
}

async function runTest(input: ConnectionInput, password: string): Promise<TestResult> {
  const driver = driverFor(input);
  const params = await connectParams(input, password);
  if ('ok' in params) return params;
  try {
    const { readOnly } = await driver.test(params);
    return { ok: true, readOnly };
  } catch (error) {
    console.error('[studio/connections] test failed', (error as { code?: string }).code ?? 'unknown');
    return { ok: false, readOnly: false, error: friendlyConnectionError(error) };
  }
}

function inputFromStored(stored: StoredConnection): ConnectionInput {
  const v = stored.view;
  return {
    name: v.name,
    type: v.type,
    host: v.host,
    port: v.port,
    database: v.database,
    username: v.username,
    password: '',
    sslMode: v.sslMode,
  };
}

function testStatus(test: TestResult) {
  return {
    status: test.ok ? ('ok' as const) : ('error' as const),
    readOnlyVerified: test.ok && test.readOnly,
    lastError: test.ok ? null : (test.error ?? null),
  };
}

function activityDetail(input: ConnectionInput, test?: TestResult) {
  // Never include the password or the full connection string.
  return {
    name: input.name,
    type: input.type,
    host: input.host,
    database: input.database,
    ...(test ? { ok: test.ok, readOnly: test.readOnly } : {}),
  };
}

// ---------- Public operations used by the route handlers

/** Tests values from the form without saving. `id` lets an edit form reuse the stored password. */
export async function testFormValues(
  session: AuthUser,
  body: Record<string, unknown>,
  request: Request
): Promise<TestResult> {
  const input = parseConnectionInput(body);
  const stored = body.id === undefined || body.id === null ? null : await requireConnection(session, parseId(String(body.id)));
  const test = await runTest(input, resolvePassword(input, stored));
  await logActivity({
    actor: session,
    action: 'connection.test',
    targetType: 'data_connection',
    targetId: stored?.view.id ?? null,
    detail: activityDetail(input, test),
    request,
  });
  return test;
}

export async function testSaved(
  session: AuthUser,
  id: number,
  request: Request
): Promise<{ test: TestResult; connection: ConnectionView }> {
  const stored = await requireConnection(session, id);
  const input = inputFromStored(stored);
  const test = await runTest(input, storedPassword(stored));
  await saveTestResult(id, testStatus(test));
  await logActivity({
    actor: session,
    action: 'connection.test',
    targetType: 'data_connection',
    targetId: id,
    detail: activityDetail(input, test),
    request,
  });
  return { test, connection: (await requireConnection(session, id)).view };
}

/**
 * Saves after a fresh server-side test so status and readOnlyVerified are never taken from the client.
 * A writable account is refused (409) unless the user confirmed it with acknowledgeWritable.
 */
async function saveConnection(
  session: AuthUser,
  body: Record<string, unknown>,
  request: Request,
  existingId: number | null
): Promise<{ connection: ConnectionView; test: TestResult }> {
  const input = parseConnectionInput(body);
  const stored = existingId === null ? null : await requireConnection(session, existingId);
  const password = resolvePassword(input, stored);
  const test = await runTest(input, password);

  if (test.ok && !test.readOnly && body.acknowledgeWritable !== true) {
    throw new HttpError(409, WRITABLE_MESSAGE, { code: 'writable', test });
  }

  let passwordEncrypted: string | null | undefined;
  if (input.password) passwordEncrypted = encryptSecret(input.password);
  else if (!stored) passwordEncrypted = null;

  const write = { ...input, passwordEncrypted, ...testStatus(test), tested: true };
  let id: number;
  if (stored) {
    id = stored.view.id;
    await updateConnectionRow(id, write);
  } else {
    id = await insertConnection(session.id, write);
  }

  await logActivity({
    actor: session,
    action: stored ? 'connection.update' : 'connection.create',
    targetType: 'data_connection',
    targetId: id,
    detail: { ...activityDetail(input, test), passwordChanged: Boolean(input.password) },
    request,
  });
  return { connection: (await requireConnection(session, id)).view, test };
}

export function createConnection(session: AuthUser, body: Record<string, unknown>, request: Request) {
  if (body.id !== undefined) {
    throw new HttpError(400, 'การสร้างใหม่ต้องไม่ส่ง id');
  }
  return saveConnection(session, body, request, null);
}

export function updateConnection(
  session: AuthUser,
  id: number,
  body: Record<string, unknown>,
  request: Request
) {
  return saveConnection(session, body, request, id);
}

export async function deleteConnection(session: AuthUser, id: number, request: Request): Promise<void> {
  const stored = await requireConnection(session, id);
  if (stored.view.knowledgeSets.length > 0 || !(await deleteUnusedConnection(id))) {
    const fresh = await findConnection(session, id);
    const sets = fresh?.view.knowledgeSets ?? stored.view.knowledgeSets;
    throw new HttpError(
      409,
      `ลบไม่ได้ เพราะ Knowledge Set ต่อไปนี้ใช้การเชื่อมต่อนี้อยู่: ${sets.map((s) => s.name).join(', ')}`,
      { knowledgeSets: sets }
    );
  }
  await logActivity({
    actor: session,
    action: 'connection.delete',
    targetType: 'data_connection',
    targetId: id,
    detail: { name: stored.view.name, type: stored.view.type, host: stored.view.host },
    request,
  });
}

export async function savedParams(stored: StoredConnection): Promise<ConnectParams> {
  const params = await connectParams(inputFromStored(stored), storedPassword(stored));
  if ('ok' in params) {
    throw new HttpError(400, params.error ?? 'เชื่อมต่อไม่สำเร็จ');
  }
  return params;
}

export async function getSchema(session: AuthUser, id: number): Promise<TableSchema[]> {
  const stored = await requireConnection(session, id);
  const driver = driverFor(stored.view);
  const params = await savedParams(stored);
  try {
    return await driver.listTables(params);
  } catch (error) {
    throw new HttpError(400, friendlyConnectionError(error));
  }
}

export async function getPreview(
  session: AuthUser,
  id: number,
  schema: string,
  table: string
): Promise<PreviewResult> {
  if (!table || table.length > 255 || schema.length > 255) {
    throw new HttpError(400, 'กรุณาระบุชื่อตารางให้ถูกต้อง');
  }
  const stored = await requireConnection(session, id);
  const driver = driverFor(stored.view);
  const params = await savedParams(stored);
  try {
    return await driver.preview(params, schema, table);
  } catch (error) {
    if (error instanceof TableNotFoundError) {
      throw new HttpError(404, 'ไม่พบตารางนี้ หรือบัญชีไม่มีสิทธิ์อ่าน');
    }
    throw new HttpError(400, friendlyConnectionError(error));
  }
}
