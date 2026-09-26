import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { ensureDatabaseSchema } from '@/lib/db';
import { getAccessibleAgents } from '@/lib/agents';

/**
 * GET /api/chat/agents
 * Agents the signed-in user may start a chat with (group restrictions applied).
 */
export async function GET() {
  try {
    await ensureDatabaseSchema();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agents = await getAccessibleAgents(session);
    return NextResponse.json({ agents });
  } catch (error: any) {
    console.error('Fetch chat agents error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
