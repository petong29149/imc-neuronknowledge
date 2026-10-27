import { NextResponse } from 'next/server';
import { parseId, readJson, withStudio } from '@/lib/studio/connections/http';
import { updateConnectionIcon } from '@/lib/studio/connections/profile';

/** PUT /api/studio/connections/[id]/icon — { kind: 'auto'|'preset'|'custom', preset?, color?, dataUrl? } */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withStudio(async (session) => {
    const connection = await updateConnectionIcon(session, parseId((await params).id), await readJson(request, 700_000), request);
    return NextResponse.json({ connection });
  });
}
