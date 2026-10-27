import { getSession, type AuthUser } from '@/lib/auth';
import { jsonError } from './core-shim';
import { HttpError } from './http';

/** Any signed-in user (user, creator, admin) + uniform errors for /api/connections/** session routes. */
export async function withUser(handler: (session: AuthUser) => Promise<Response>): Promise<Response> {
  const session = await getSession();
  if (!session) return jsonError('กรุณาเข้าสู่ระบบก่อนทำรายการ', 401);
  try {
    return await handler(session);
  } catch (error) {
    if (error instanceof HttpError) return jsonError(error.message, error.status, error.extra);
    console.error('[connections] unexpected error', (error as { code?: string }).code ?? (error as Error).name);
    return jsonError('เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง', 500);
  }
}
