import { NextResponse } from 'next/server';
import { parseId, readJson, withStudio } from '@/lib/studio/connections/http';
import { enableConnection } from '@/lib/studio/connections/profile';

/** PUT /api/studio/connections/[id]/enabled — { enabled } master switch for AI, MCP and users */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withStudio(async (session) => {
    const connection = await enableConnection(session, parseId((await params).id), await readJson(request), request);
    return NextResponse.json({ connection });
  });
}
