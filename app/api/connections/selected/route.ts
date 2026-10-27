import { NextResponse } from 'next/server';
import { withUser } from '@/lib/studio/connections/session';
import { listSelected } from '@/lib/studio/connections/userside';

/** GET /api/connections/selected → { connections } the databases this user chose (for chat / agents) */
export async function GET() {
  return withUser(async (session) => NextResponse.json({ connections: await listSelected(session) }));
}
