import { NextResponse } from 'next/server';
import { createApiKey, listApiKeys } from '@/lib/studio/connections/apikeys';
import { parseId, readJson, withStudio } from '@/lib/studio/connections/http';

/** GET /api/studio/connections/[id]/api-keys → { apiKeys } */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withStudio(async (session) => {
    return NextResponse.json({ apiKeys: await listApiKeys(session, parseId((await params).id)) });
  });
}

/** POST /api/studio/connections/[id]/api-keys — { name } → { key, apiKey } (the full key is shown only here) */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withStudio(async (session) => {
    const result = await createApiKey(session, parseId((await params).id), await readJson(request), request);
    return NextResponse.json(result, { status: 201 });
  });
}
