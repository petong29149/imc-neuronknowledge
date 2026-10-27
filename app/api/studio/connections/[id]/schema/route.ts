import { NextResponse } from 'next/server';
import { parseId, withStudio } from '@/lib/studio/connections/http';
import { getSchema } from '@/lib/studio/connections/service';

/** GET /api/studio/connections/[id]/schema → { tables } */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withStudio(async (session) => {
    return NextResponse.json({ tables: await getSchema(session, parseId((await params).id)) });
  });
}
