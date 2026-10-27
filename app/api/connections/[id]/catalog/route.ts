import { NextResponse } from 'next/server';
import { publicCatalog, withApiKey } from '@/lib/studio/connections/external';

/** GET /api/connections/[id]/catalog — for MCP servers (Authorization: Bearer nkc_...) */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApiKey(request, (await params).id, async (id) => NextResponse.json(await publicCatalog(id)));
}
