// TEMPORARY stand-ins for CORE-01 helpers (lib/crypto.ts, lib/activity.ts, lib/api.ts).
// They follow the signatures in docs/specs/CORE-01-foundation.md. Once CORE-01 is merged
// into staging, delete this file and import from '@/lib/crypto', '@/lib/activity' and '@/lib/api'.
// See docs/handoff/S02.md "สิ่งที่เบี่ยงจาก Spec".

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { AuthUser } from '@/lib/auth';

// ---------- lib/api.ts
export function jsonError(message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

// ---------- lib/crypto.ts (AES-256-GCM, key from STUDIO_SECRET_KEY)
function secretKey(): Buffer {
  const raw = process.env.STUDIO_SECRET_KEY;
  if (!raw) {
    throw new Error('STUDIO_SECRET_KEY is not set');
  }
  return createHash('sha256').update(raw).digest();
}

/** Format: v1:<iv b64>:<tag b64>:<ciphertext b64> */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', secretKey(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64'), tag.toString('base64'), data.toString('base64')].join(':');
}

export function decryptSecret(payload: string): string {
  const [version, iv, tag, data] = payload.split(':');
  if (version !== 'v1' || !iv || !tag || !data) {
    throw new Error('Unsupported secret format');
  }
  const decipher = createDecipheriv('aes-256-gcm', secretKey(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString(
    'utf8'
  );
}

// ---------- lib/activity.ts
interface LogActivityInput {
  actor: AuthUser | null;
  action: string;
  targetType?: string | null;
  targetId?: string | number | null;
  detail?: Record<string, unknown>;
  request?: Request;
}

/** Never throws: a broken activity log must not break the main operation. */
export async function logActivity({
  actor,
  action,
  targetType = null,
  targetId = null,
  detail = {},
  request,
}: LogActivityInput): Promise<void> {
  try {
    const forwarded = request?.headers.get('x-forwarded-for');
    const ip = (forwarded?.split(',')[0] ?? request?.headers.get('x-real-ip') ?? '').trim() || null;
    await query(
      `INSERT INTO activity_logs (actor_id, actor_role, action, target_type, target_id, detail, ip)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        actor?.id ?? null,
        actor?.role ?? null,
        action,
        targetType,
        targetId === null ? null : String(targetId),
        JSON.stringify(detail),
        ip,
      ]
    );
  } catch (error) {
    console.error('[activity] failed to write log', action, (error as { code?: string }).code);
  }
}
