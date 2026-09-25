import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query, ensureDatabaseSchema } from '@/lib/db';
import { stopChatRun } from '@/lib/chat-runs';

/**
 * POST /api/chat/conversations/[id]/stop
 * Stops the answer being generated for this chat. The partial answer is saved and
 * the chat's stream ends with a 'done' event carrying `stopped: true`.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabaseSchema();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const isInt = /^\d+$/.test(id);
    if (!isUuid && !isInt) {
      return NextResponse.json({ error: 'ไม่พบ Chat' }, { status: 404 });
    }

    const result = await query(
      `SELECT id FROM chats WHERE ${isUuid ? 'session_id = $1::uuid' : 'id = $1'} AND user_id = $2`,
      [isUuid ? id : parseInt(id, 10), session.id]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบ Chat' }, { status: 404 });
    }

    return NextResponse.json({ stopped: stopChatRun(result.rows[0].id, session.id) });
  } catch (error: any) {
    console.error('Stop chat error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
