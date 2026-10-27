import { NextResponse } from 'next/server';
import { parseId, readJson, withStudio } from '@/lib/studio/connections/http';
import { publishConnection } from '@/lib/studio/connections/profile';

/** PUT /api/studio/connections/[id]/publish — { published } (409 until tested and at least one table is enabled) */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withStudio(async (session) => {
    const connection = await publishConnection(session, parseId((await params).id), await readJson(request), request);
    return NextResponse.json({ connection });
  });
}
