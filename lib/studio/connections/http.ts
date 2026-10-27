import { requireRole, type AuthUser } from '@/lib/auth';
import { jsonError } from './core-shim';

/** Thrown by the connections service; the message is already safe to show to the user. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public extra?: Record<string, unknown>
  ) {
    super(message);
  }
}

/** Auth (creator/admin) + uniform error handling for every /api/studio/connections route. */
export async function withStudio(
  handler: (session: AuthUser) => Promise<Response>
): Promise<Response> {
  const auth = await requireRole(['admin', 'creator']);
  if (auth.error !== null) {
    return jsonError(auth.error, auth.status);
  }
  try {
    return await handler(auth.session);
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonError(error.message, error.status, error.extra);
    }
    const code = (error as { code?: string }).code;
    if (code === '42P01') {
      return jsonError(
        'ระบบยังไม่พร้อม: ยังไม่ได้สร้างตารางของ Studio ในฐานข้อมูล (รอ migration ของ CORE-01)',
        503
      );
    }
    // Only the code and error class — never connection details.
    console.error('[studio/connections] unexpected error', code ?? (error as Error).name);
    return jsonError('เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง', 500);
  }
}

export function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, 'รหัส connection ไม่ถูกต้อง');
  }
  return id;
}

export async function readJson(request: Request, maxLength = 64_000): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (text.length > maxLength) {
    throw new HttpError(400, 'ข้อมูลที่ส่งมามีขนาดใหญ่เกินไป');
  }
  try {
    const body: unknown = text ? JSON.parse(text) : {};
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new Error('not an object');
    }
    return body as Record<string, unknown>;
  } catch {
    throw new HttpError(400, 'รูปแบบข้อมูลไม่ถูกต้อง');
  }
}
