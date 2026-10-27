import { NextResponse } from 'next/server';
import { parseId, readJson } from '@/lib/studio/connections/http';
import { withUser } from '@/lib/studio/connections/session';
import { setSelection } from '@/lib/studio/connections/userside';

/** PUT /api/connections/[id]/selection — { selected } */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withUser(async (session) => {
    const connection = await setSelection(session, parseId((await params).id), await readJson(request), request);
    return NextResponse.json({ connection });
  });
}
