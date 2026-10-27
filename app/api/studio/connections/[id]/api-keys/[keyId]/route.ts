import { NextResponse } from 'next/server';
import { revokeApiKey } from '@/lib/studio/connections/apikeys';
import { parseId, withStudio } from '@/lib/studio/connections/http';

/** DELETE /api/studio/connections/[id]/api-keys/[keyId] — revoke */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; keyId: string }> }) {
  return withStudio(async (session) => {
    const { id, keyId } = await params;
    await revokeApiKey(session, parseId(id), parseId(keyId), request);
    return NextResponse.json({ ok: true });
  });
}
