import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { JWT_SECRET } from '@/lib/auth';

/**
 * The core prompt (working rules) is editable only by an admin who also knows a
 * separate password. Its bcrypt hash lives in the env var CORE_PROMPT_PASSWORD_HASH,
 * base64-encoded because Next.js expands `$` in .env files and would mangle a raw
 * "$2a$10$..." hash. Generate it with: npx tsx scripts/hash-core-password.ts
 *
 * A correct password sets a short-lived httpOnly cookie bound to that admin.
 */

const UNLOCK_COOKIE = 'core_prompt_unlock';
const UNLOCK_AUDIENCE = 'core-prompt-unlock';
export const UNLOCK_MINUTES = 15;

const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

declare global {
  // eslint-disable-next-line no-var
  var __core_unlock_attempts: Map<number, { count: number; resetAt: number }> | undefined;
}
const attempts = (global.__core_unlock_attempts ??= new Map());

/** The bcrypt hash from the env, or null when the password has not been configured. */
function getPasswordHash(): string | null {
  const encoded = process.env.CORE_PROMPT_PASSWORD_HASH?.trim();
  if (!encoded) return null;
  const hash = Buffer.from(encoded, 'base64').toString('utf8');
  return hash.startsWith('$2') ? hash : null;
}

export function isCorePasswordConfigured(): boolean {
  return getPasswordHash() !== null;
}

export type UnlockResult =
  | { ok: true; expiresAt: number }
  | { ok: false; status: number; error: string };

/** Check the password (rate limited per admin) and set the unlock cookie on success. */
export async function unlockCorePrompt(userId: number, password: string): Promise<UnlockResult> {
  const hash = getPasswordHash();
  if (!hash) {
    return {
      ok: false,
      status: 503,
      error: 'ยังไม่ได้ตั้งรหัสผ่านสำหรับแก้ไขหลักการทำงาน (CORE_PROMPT_PASSWORD_HASH)',
    };
  }

  const now = Date.now();
  const entry = attempts.get(userId);
  if (entry && entry.resetAt > now && entry.count >= MAX_ATTEMPTS) {
    const minutes = Math.ceil((entry.resetAt - now) / 60000);
    return { ok: false, status: 429, error: `ใส่รหัสผิดหลายครั้งเกินไป กรุณารอ ${minutes} นาที` };
  }

  if (!password || !(await bcrypt.compare(password, hash))) {
    const fresh = !entry || entry.resetAt <= now;
    attempts.set(userId, {
      count: fresh ? 1 : entry.count + 1,
      resetAt: fresh ? now + ATTEMPT_WINDOW_MS : entry.resetAt,
    });
    return { ok: false, status: 401, error: 'รหัสผ่านไม่ถูกต้อง' };
  }

  attempts.delete(userId);
  const expiresAt = now + UNLOCK_MINUTES * 60 * 1000;
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setAudience(UNLOCK_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt / 1000))
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(UNLOCK_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: UNLOCK_MINUTES * 60,
  });
  return { ok: true, expiresAt };
}

/** When the core prompt is unlocked for this admin, its expiry (ms); otherwise null. */
export async function getCoreUnlockExpiry(userId: number): Promise<number | null> {
  const token = (await cookies()).get(UNLOCK_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, { audience: UNLOCK_AUDIENCE });
    if (Number(payload.uid) !== userId || !payload.exp) return null;
    return payload.exp * 1000;
  } catch {
    return null;
  }
}

export async function lockCorePrompt() {
  (await cookies()).delete(UNLOCK_COOKIE);
}
