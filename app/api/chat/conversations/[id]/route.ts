import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query, ensureDatabaseSchema } from '@/lib/db';
import { isChatProcessing } from '@/lib/chat-runs';

async function requireAuth() {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized', status: 401, session: null };
  return { error: null, status: 200, session };
}

/**
 * GET /api/chat/conversations/[id]
 * Get a single chat session with its full chat_history
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAuth();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const isInt = /^\d+$/.test(id);

    if (!isUuid && !isInt) {
      return NextResponse.json({ error: 'ไม่พบ Chat' }, { status: 404 });
    }

    const whereClause = isUuid ? 'ch.session_id = $1::uuid' : 'ch.id = $1';
    const paramVal = isUuid ? id : parseInt(id, 10);

    const result = await query(
      `SELECT
        ch.*,
        m.display_name as model_name,
        m.model_id as model_id_str,
        a.name as agent_name,
        a.icon as agent_icon
      FROM chats ch
      LEFT JOIN models m ON m.id = ch.model_id
      LEFT JOIN agents a ON a.id = ch.agent_id
      WHERE ${whereClause} AND ch.user_id = $2`,
      [paramVal, auth.session!.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบ Chat' }, { status: 404 });
    }

    const row = result.rows[0];

    // Parse chat_history if it's still a string
    let chatHistory = row.chat_history;
    if (typeof chatHistory === 'string') {
      chatHistory = JSON.parse(chatHistory);
    }

    return NextResponse.json({
      conversation: {
        id: row.id,
        session_id: row.session_id,
        title: row.title,
        model_id: row.model_id,
        model_name: row.model_name,
        model_id_str: row.model_id_str,
        agent_id: row.agent_id,
        agent_name: row.agent_name,
        agent_icon: row.agent_icon,
        system_prompt: row.system_prompt,
        effort_level: row.effort_level,
        tools_enabled: row.tools_enabled,
        is_archived: row.is_archived,
        user_message_count: row.user_message_count,
        total_input_tokens: row.total_input_tokens,
        total_output_tokens: row.total_output_tokens,
        total_tokens: row.total_tokens,
        created_at: row.created_at,
        updated_at: row.updated_at,
        is_processing: isChatProcessing(row.id),
      },
      messages: chatHistory,
    });
  } catch (error: any) {
    console.error('Fetch chat error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

/**
 * PUT /api/chat/conversations/[id]
 * Update chat session (title, model, archive, etc.)
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAuth();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const isInt = /^\d+$/.test(id);

    if (!isUuid && !isInt) {
      return NextResponse.json({ error: 'ไม่พบ Chat' }, { status: 404 });
    }

    const body = await request.json();

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (body.title !== undefined) {
      updates.push(`title = $${idx++}`);
      values.push(body.title);
    }
    if (body.model_id !== undefined) {
      updates.push(`model_id = $${idx++}`);
      values.push(body.model_id);
    }
    if (body.system_prompt !== undefined) {
      updates.push(`system_prompt = $${idx++}`);
      values.push(body.system_prompt);
    }
    if (body.is_archived !== undefined) {
      updates.push(`is_archived = $${idx++}`);
      values.push(body.is_archived);
    }
    if (body.effort_level !== undefined) {
      updates.push(`effort_level = $${idx++}`);
      values.push(body.effort_level);
    }
    if (body.tools_enabled !== undefined) {
      updates.push(`tools_enabled = $${idx++}`);
      values.push(body.tools_enabled);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'ไม่มีข้อมูลให้อัปเดต' }, { status: 400 });
    }

    updates.push('updated_at = NOW()');
    values.push(isUuid ? id : parseInt(id, 10));
    values.push(auth.session!.id);

    const whereClause = isUuid ? `session_id = $${idx}::uuid` : `id = $${idx}`;
    const result = await query(
      `UPDATE chats SET ${updates.join(', ')} WHERE ${whereClause} AND user_id = $${idx + 1} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบ Chat' }, { status: 404 });
    }

    return NextResponse.json({ conversation: result.rows[0] });
  } catch (error: any) {
    console.error('Update chat error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

/**
 * DELETE /api/chat/conversations/[id]
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAuth();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const isInt = /^\d+$/.test(id);

    if (!isUuid && !isInt) {
      return NextResponse.json({ error: 'ไม่พบ Chat' }, { status: 404 });
    }

    const whereClause = isUuid ? 'session_id = $1::uuid' : 'id = $1';
    const paramVal = isUuid ? id : parseInt(id, 10);

    const result = await query(
      `DELETE FROM chats WHERE ${whereClause} AND user_id = $2 RETURNING id, session_id`,
      [paramVal, auth.session!.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบ Chat' }, { status: 404 });
    }

    return NextResponse.json({ message: 'ลบ Chat เรียบร้อยแล้ว' });
  } catch (error: any) {
    console.error('Delete chat error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
