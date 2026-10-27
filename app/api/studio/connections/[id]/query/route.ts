import { NextResponse } from 'next/server';
import { parseId, readJson, withStudio } from '@/lib/studio/connections/http';
import { runStudioQuery } from '@/lib/studio/connections/query';

/** POST /api/studio/connections/[id]/query — { sql } → { columns, rows, rowCount, truncated, durationMs } */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withStudio(async (session) => {
    return NextResponse.json(await runStudioQuery(session, parseId((await params).id), await readJson(request), request));
  });
}
