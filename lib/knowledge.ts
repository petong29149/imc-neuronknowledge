import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { AuthUser } from '@/lib/auth';

/**
 * Bridge to the Knowledge Engine's internal API (knowledge-engine/, plan T2b).
 * Server-only: it holds KNOWLEDGE_API_TOKEN, which must never reach the browser.
 *
 * The organization a user works in is a group with an org_id. It is always worked out
 * here from the session; a browser may only say which of its own organizations it means.
 */

/** Same rule the engine applies to X-Org-Id */
export const ORG_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{1,62}$/;

export const ORG_ID_RULE = 'รหัสองค์กรต้องเป็นตัวอักษร a-z ตัวเลข - หรือ _ ยาว 2–63 ตัว และขึ้นต้นด้วยตัวอักษรหรือตัวเลข';

export interface KnowledgeOrg {
  org_id: string;
  name: string;
}

const UNAVAILABLE = 'ระบบคลังความรู้ไม่พร้อมใช้งานชั่วคราว';

/**
 * Normalize an org_id from an admin form: '' / null clear it, anything else must match the
 * pattern. Returns undefined when the field was not sent.
 */
export function parseOrgIdField(value: unknown): { orgId?: string | null; error?: string } {
  if (value === undefined) return {};
  if (value === null) return { orgId: null };
  if (typeof value !== 'string') return { error: ORG_ID_RULE };
  const orgId = value.trim().toLowerCase();
  if (!orgId) return { orgId: null };
  return ORG_ID_PATTERN.test(orgId) ? { orgId } : { error: ORG_ID_RULE };
}

/** Organizations `user` may work in: admins see every active one, others their own groups'. */
export async function listOrgsForUser(user: Pick<AuthUser, 'id' | 'role'>): Promise<KnowledgeOrg[]> {
  const result = await query<KnowledgeOrg>(
    `SELECT DISTINCT g.org_id, g.name
     FROM groups g
     WHERE g.org_id IS NOT NULL AND g.is_active = true
       AND (
         $2::boolean
         OR EXISTS (
           SELECT 1 FROM group_members gm JOIN users u ON u.id = gm.user_id AND u.is_active
           WHERE gm.group_id = g.id AND gm.user_id = $1
         )
       )
     ORDER BY g.name`,
    [user.id, user.role === 'admin']
  );
  return result.rows;
}

/**
 * The organization this request works in. `requested` (from the page's org picker) only
 * chooses among the user's own organizations; it can never add one.
 */
export async function resolveOrg(
  user: Pick<AuthUser, 'id' | 'role'>,
  requested: string | null | undefined
): Promise<{ org: KnowledgeOrg } | { error: string; status: number }> {
  const orgs = await listOrgsForUser(user);
  if (orgs.length === 0) {
    return { error: 'บัญชีนี้ยังไม่ได้อยู่ในองค์กรใด กรุณาติดต่อผู้ดูแลระบบ', status: 403 };
  }
  if (requested) {
    const org = orgs.find((o) => o.org_id === requested);
    return org ? { org } : { error: 'คุณไม่มีสิทธิ์เข้าถึงองค์กรนี้', status: 403 };
  }
  if (orgs.length === 1) return { org: orgs[0] };
  return { error: 'กรุณาเลือกองค์กร', status: 400 };
}

export const MAX_FILE_MB = parseInt(process.env.KNOWLEDGE_MAX_FILE_MB || '50', 10);

/** Call the engine's internal API as `orgId`. Throws when the engine is not configured. */
export async function knowledgeFetch(path: string, orgId: string, init: RequestInit = {}): Promise<Response> {
  const baseUrl = process.env.KNOWLEDGE_API_URL;
  const token = process.env.KNOWLEDGE_API_TOKEN;
  if (!baseUrl || !token) {
    throw new Error('KNOWLEDGE_API_URL / KNOWLEDGE_API_TOKEN are not set');
  }
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('X-Org-Id', orgId);
  return fetch(`${baseUrl.replace(/\/+$/, '')}${path}`, { ...init, headers, cache: 'no-store' });
}

/** Pass the engine's status and JSON body through (its errors are already Thai `{ error }`). */
export async function relay(response: Response): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = { error: UNAVAILABLE };
  }
  return NextResponse.json(body, { status: response.status });
}

/** The engine could not be reached or is not configured. */
export function unavailable(error: unknown): NextResponse {
  console.error('Knowledge Engine request failed:', error);
  return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
}
