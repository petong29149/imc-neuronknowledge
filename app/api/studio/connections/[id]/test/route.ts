import { NextResponse } from 'next/server';
import { parseId, withStudio } from '@/lib/studio/connections/http';
import { testSaved } from '@/lib/studio/connections/service';

/** POST /api/studio/connections/[id]/test → { ok, readOnly, error?, connection } */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withStudio(async (session) => {
    const { test, connection } = await testSaved(session, parseId((await params).id), request);
    return NextResponse.json({ ...test, connection });
  });
}
