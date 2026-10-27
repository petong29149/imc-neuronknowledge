import { NextResponse } from 'next/server';
import { getCatalog } from '@/lib/studio/connections/catalog';
import { parseId, withStudio } from '@/lib/studio/connections/http';

/** GET /api/studio/connections/[id]/catalog → { tables } */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withStudio(async (session) => {
    return NextResponse.json({ tables: await getCatalog(session, parseId((await params).id)) });
  });
}
