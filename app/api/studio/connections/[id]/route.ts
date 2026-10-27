import { NextResponse } from 'next/server';
import { parseId, readJson, withStudio } from '@/lib/studio/connections/http';
import { deleteConnection, updateConnection } from '@/lib/studio/connections/service';

type Context = { params: Promise<{ id: string }> };

/** PUT /api/studio/connections/[id] — empty password keeps the stored one */
export async function PUT(request: Request, { params }: Context) {
  return withStudio(async (session) => {
    const id = parseId((await params).id);
    return NextResponse.json(await updateConnection(session, id, await readJson(request), request));
  });
}

/** DELETE /api/studio/connections/[id] — 409 when a Knowledge Set still uses it */
export async function DELETE(request: Request, { params }: Context) {
  return withStudio(async (session) => {
    const id = parseId((await params).id);
    await deleteConnection(session, id, request);
    return NextResponse.json({ ok: true });
  });
}
