import { NextResponse } from 'next/server';
import { withUser } from '@/lib/studio/connections/session';
import { listPublished } from '@/lib/studio/connections/userside';

/** GET /api/connections → { connections } published databases with this user's `selected` flag */
export async function GET() {
  return withUser(async (session) => NextResponse.json({ connections: await listPublished(session) }));
}
