import { NextResponse } from 'next/server';
import { runApiQuery, withApiKey } from '@/lib/studio/connections/external';

/** POST /api/connections/[id]/query — { sql, maxRows? } for MCP servers (Authorization: Bearer nkc_...) */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApiKey(request, (await params).id, async (id, keyId) =>
    NextResponse.json(await runApiQuery(id, keyId, request))
  );
}
