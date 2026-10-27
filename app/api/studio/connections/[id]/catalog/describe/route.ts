import { NextResponse } from 'next/server';
import { draftDescriptions } from '@/lib/studio/connections/ai';
import { parseId, readJson, withStudio } from '@/lib/studio/connections/http';

/** POST /api/studio/connections/[id]/catalog/describe — { tableIds, modelId?, includeSamples } → { tables, skipped } */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withStudio(async (session) => {
    return NextResponse.json(await draftDescriptions(session, parseId((await params).id), await readJson(request), request));
  });
}
