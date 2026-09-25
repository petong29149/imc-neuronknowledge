import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query, ensureDatabaseSchema } from '@/lib/db';
import { getProcessingChatIds } from '@/lib/chat-runs';

async function requireAuth() {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized', status: 401, session: null };
  return { error: null, status: 200, session };
}

/**
 * GET /api/chat/conversations
 * List chat sessions for the current user
 */
export async function GET() {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAuth();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const result = await query(
      `SELECT
        ch.id,
        ch.session_id,
        ch.title,
        ch.model_id,
        ch.effort_level,
        ch.tools_enabled,
        ch.is_archived,
        ch.user_message_count,
        ch.total_input_tokens,
        ch.total_output_tokens,
        ch.total_tokens,
        ch.created_at,
        ch.updated_at,
        m.display_name as model_name,
        m.model_id as model_id_str
      FROM chats ch
      LEFT JOIN models m ON m.id = ch.model_id
      WHERE ch.user_id = $1 AND ch.is_archived = false
      ORDER BY ch.updated_at DESC`,
      [auth.session!.id]
    );

    const processing = getProcessingChatIds(auth.session!.id);
    const conversations = result.rows.map((row) => ({ ...row, is_processing: processing.has(row.id) }));

    return NextResponse.json({ conversations });
  } catch (error: any) {
    console.error('Fetch conversations error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

/**
 * POST /api/chat/conversations
 * Create a new chat session
 */
export async function POST(request: Request) {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAuth();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { title = 'New Chat', model_id, system_prompt = '' } = body;

    const result = await query(
      `INSERT INTO chats (user_id, title, model_id, system_prompt, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [auth.session!.id, title, model_id || null, system_prompt]
    );

    return NextResponse.json(
      { conversation: result.rows[0] },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create conversation error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
