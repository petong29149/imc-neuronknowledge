import { NextResponse } from 'next/server';
import { readJson, withStudio } from '@/lib/studio/connections/http';
import { createConnection, listConnections } from '@/lib/studio/connections/service';

/** GET /api/studio/connections → { connections } */
export async function GET() {
  return withStudio(async (session) => {
    return NextResponse.json({ connections: await listConnections(session) });
  });
}

/** POST /api/studio/connections → { connection, test } (409 code=writable until acknowledged) */
export async function POST(request: Request) {
  return withStudio(async (session) => {
    const result = await createConnection(session, await readJson(request), request);
    return NextResponse.json(result, { status: 201 });
  });
}
