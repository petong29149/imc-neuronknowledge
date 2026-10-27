import { NextResponse } from 'next/server';
import { syncCatalog } from '@/lib/studio/connections/catalog';
import { parseId, withStudio } from '@/lib/studio/connections/http';

/** POST /api/studio/connections/[id]/catalog/sync → { added, removed, tables } */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withStudio(async (session) => {
    return NextResponse.json(await syncCatalog(session, parseId((await params).id), request));
  });
}
