import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { knowledgeFetch, relay, resolveOrg, unavailable } from '@/lib/knowledge';

/** POST /api/knowledge/documents/[id]/reindex?org_id= — queue the document for indexing again. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' }, { status: 401 });
  }
  const resolved = await resolveOrg(session, new URL(request.url).searchParams.get('org_id'));
  if ('error' in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }
  const { id } = await params;
  try {
    return relay(
      await knowledgeFetch(`/documents/${encodeURIComponent(id)}/reindex`, resolved.org.org_id, { method: 'POST' })
    );
  } catch (error) {
    return unavailable(error);
  }
}
