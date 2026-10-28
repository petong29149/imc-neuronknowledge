import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { knowledgeFetch, relay, resolveOrg, unavailable } from '@/lib/knowledge';

type Context = { params: Promise<{ id: string }> };

async function forward(request: Request, { params }: Context, method: 'GET' | 'DELETE') {
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
    return relay(await knowledgeFetch(`/documents/${encodeURIComponent(id)}`, resolved.org.org_id, { method }));
  } catch (error) {
    return unavailable(error);
  }
}

/** GET /api/knowledge/documents/[id]?org_id= — status, quality, error, chunk count, metadata. */
export async function GET(request: Request, context: Context) {
  return forward(request, context, 'GET');
}

/** DELETE /api/knowledge/documents/[id]?org_id= — queue the delete (points, file, then status "deleted"). */
export async function DELETE(request: Request, context: Context) {
  return forward(request, context, 'DELETE');
}
