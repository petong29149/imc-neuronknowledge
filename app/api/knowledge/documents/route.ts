import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { knowledgeFetch, MAX_FILE_MB, relay, resolveOrg, unavailable } from '@/lib/knowledge';

/**
 * GET /api/knowledge/documents?org_id=&status=&tag=
 * The organization's documents, from the Knowledge Engine.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const resolved = await resolveOrg(session, searchParams.get('org_id'));
  if ('error' in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  // Only the filters the engine understands are passed on; never org_id
  const forward = new URLSearchParams();
  for (const key of ['status', 'tag', 'limit', 'offset']) {
    const value = searchParams.get(key);
    if (value) forward.set(key, value);
  }

  try {
    const query = forward.toString();
    return relay(await knowledgeFetch(`/documents${query ? `?${query}` : ''}`, resolved.org.org_id));
  } catch (error) {
    return unavailable(error);
  }
}

/**
 * POST /api/knowledge/documents  (multipart: file, description, tags, org_id)
 * Upload a document; the engine checks the file type, duplicates and size, then queues indexing.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'รูปแบบคำขอไม่ถูกต้อง' }, { status: 400 });
  }

  const requestedOrg = form.get('org_id');
  const resolved = await resolveOrg(session, typeof requestedOrg === 'string' ? requestedOrg : null);
  if ('error' in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'กรุณาเลือกไฟล์ที่จะอัปโหลด' }, { status: 400 });
  }
  // Refuse early rather than streaming a huge file to the engine just to be told no
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    return NextResponse.json({ error: `ไฟล์มีขนาดเกิน ${MAX_FILE_MB} MB` }, { status: 413 });
  }

  const upstream = new FormData();
  upstream.set('file', file, file.name);
  upstream.set('description', String(form.get('description') ?? ''));
  for (const tag of form.getAll('tags')) {
    if (typeof tag === 'string') upstream.append('tags', tag);
  }

  try {
    return relay(await knowledgeFetch('/documents', resolved.org.org_id, { method: 'POST', body: upstream }));
  } catch (error) {
    return unavailable(error);
  }
}
