import { NextResponse } from 'next/server';
import { askForSql } from '@/lib/studio/connections/ai';
import { parseId, readJson, withStudio } from '@/lib/studio/connections/http';

/** POST /api/studio/connections/[id]/query/ask — { question, modelId? } → { sql, explanation } (not executed) */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withStudio(async (session) => {
    return NextResponse.json(await askForSql(session, parseId((await params).id), await readJson(request), request));
  });
}
