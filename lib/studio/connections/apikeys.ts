import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { query } from '@/lib/db';
import type { AuthUser } from '@/lib/auth';
import { logActivity } from './core-shim';
import { HttpError } from './http';
import { requireConnection } from './service';

// Per-connection API keys for the MCP team: nkc_<8 char prefix>_<secret>.
// Only the SHA-256 is stored; the full key is shown once at creation.

export interface ApiKeyView {
  id: number;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

interface KeyRow {
  id: number;
  name: string;
  key_prefix: string;
  created_at: Date;
  last_used_at: Date | null;
  revoked_at: Date | null;
}

const toView = (r: KeyRow): ApiKeyView => ({
  id: r.id,
  name: r.name,
  prefix: r.key_prefix,
  createdAt: r.created_at.toISOString(),
  lastUsedAt: r.last_used_at?.toISOString() ?? null,
  revokedAt: r.revoked_at?.toISOString() ?? null,
});

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

export async function listApiKeys(session: AuthUser, id: number): Promise<ApiKeyView[]> {
  await requireConnection(session, id);
  const { rows } = await query<KeyRow>(
    `SELECT id, name, key_prefix, created_at, last_used_at, revoked_at
     FROM connection_api_keys WHERE connection_id = $1 ORDER BY revoked_at NULLS FIRST, created_at DESC`,
    [id]
  );
  return rows.map(toView);
}

export async function createApiKey(
  session: AuthUser,
  id: number,
  body: Record<string, unknown>,
  request: Request
): Promise<{ key: string; apiKey: ApiKeyView }> {
  await requireConnection(session, id);
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) throw new HttpError(400, 'กรุณาตั้งชื่อ key เช่น "MCP server ทีม A"');
  if (name.length > 120) throw new HttpError(400, 'ชื่อ key ยาวเกิน 120 ตัวอักษร');

  const prefix = `nkc_${randomBytes(6).toString('base64url').slice(0, 8)}`;
  const key = `${prefix}_${randomBytes(32).toString('base64url')}`;
  const { rows } = await query<KeyRow>(
    `INSERT INTO connection_api_keys (connection_id, name, key_prefix, key_hash, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, key_prefix, created_at, last_used_at, revoked_at`,
    [id, name, prefix, sha256(key), session.id]
  );
  await logActivity({
    actor: session,
    action: 'connection.api_key_create',
    targetType: 'data_connection',
    targetId: id,
    detail: { keyId: rows[0].id, prefix, name },
    request,
  });
  return { key, apiKey: toView(rows[0]) };
}

export async function revokeApiKey(session: AuthUser, id: number, keyId: number, request: Request): Promise<void> {
  await requireConnection(session, id);
  const { rowCount } = await query(
    `UPDATE connection_api_keys SET revoked_at = now() WHERE id = $1 AND connection_id = $2 AND revoked_at IS NULL`,
    [keyId, id]
  );
  if (!rowCount) throw new HttpError(404, 'ไม่พบ key นี้ หรือถูกยกเลิกไปแล้ว');
  await logActivity({
    actor: session,
    action: 'connection.api_key_revoke',
    targetType: 'data_connection',
    targetId: id,
    detail: { keyId },
    request,
  });
}

/**
 * Checks `Authorization: Bearer nkc_...` for the given connection.
 * Returns the key id, or throws 401 without saying which part was wrong.
 */
export async function verifyApiKey(request: Request, connectionId: number): Promise<{ keyId: number; createdBy: number | null }> {
  const header = request.headers.get('authorization') ?? '';
  const key = header.match(/^Bearer\s+(nkc_[A-Za-z0-9_-]{8}_[A-Za-z0-9_-]{20,})$/)?.[1];
  const unauthorized = new HttpError(401, 'API key ไม่ถูกต้อง หรือถูกยกเลิกแล้ว');
  if (!key) throw unauthorized;

  const prefix = key.slice(0, 12);
  const { rows } = await query<{ id: number; key_hash: string; connection_id: number; created_by: number | null }>(
    `SELECT id, key_hash, connection_id, created_by FROM connection_api_keys WHERE key_prefix = $1 AND revoked_at IS NULL`,
    [prefix]
  );
  const row = rows[0];
  const expected = Buffer.from(row?.key_hash ?? '0'.repeat(64), 'hex');
  const actual = Buffer.from(sha256(key), 'hex');
  if (!row || !timingSafeEqual(expected, actual) || row.connection_id !== connectionId) throw unauthorized;

  void query(`UPDATE connection_api_keys SET last_used_at = now() WHERE id = $1`, [row.id]).catch(() => {});
  return { keyId: row.id, createdBy: row.created_by };
}
