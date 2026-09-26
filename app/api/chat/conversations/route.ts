import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query, ensureDatabaseSchema } from '@/lib/db';
import { getProcessingChatIds } from '@/lib/chat-runs';

async function requireAuth() {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized', status: 401, session: null };
  return { error: null, status: 200, session };
}

const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 200;

/**
 * GET /api/chat/conversations
 * List chat sessions for the current user, newest first, one page at a time.
 *
 * Query params:
 *  - limit:  page size (default 30, max 200)
 *  - cursor: `next_cursor` from the previous page (keyset on updated_at + id,
 *            so chats updated meanwhile never cause duplicates or gaps)
 *  - q:      case-insensitive title search
 */
export async function GET(request: Request) {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAuth();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const limitParam = parseInt(searchParams.get('limit') || '', 10);
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;
    const search = (searchParams.get('q') || '').trim();
    const cursor = searchParams.get('cursor');

    const params: unknown[] = [auth.session!.id];
    const conditions = ['ch.user_id = $1', 'ch.is_archived = false'];

    if (search) {
      // Escape LIKE wildcards so the search is literal
      params.push(`%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
      conditions.push(`ch.title ILIKE $${params.length}`);
    }

    if (cursor) {
      const sep = cursor.lastIndexOf('_');
      const cursorTime = cursor.slice(0, sep);
      const cursorId = parseInt(cursor.slice(sep + 1), 10);
      if (sep <= 0 || !Number.isFinite(cursorId)) {
        return NextResponse.json({ error: 'Invalid cursor' }, { status: 400 });
      }
      params.push(cursorTime, cursorId);
      conditions.push(`(ch.updated_at, ch.id) < ($${params.length - 1}::timestamptz, $${params.length})`);
    }

    // Fetch one extra row to know whether another page exists
    params.push(limit + 1);

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
        ch.updated_at::text AS cursor_time,
        m.display_name as model_name,
        m.model_id as model_id_str
      FROM chats ch
      LEFT JOIN models m ON m.id = ch.model_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ch.updated_at DESC, ch.id DESC
      LIMIT $${params.length}`,
      params
    );

    const hasMore = result.rows.length > limit;
    const rows = hasMore ? result.rows.slice(0, limit) : result.rows;
    const last = rows[rows.length - 1];
    // cursor_time keeps full microsecond precision (a JS Date would truncate to ms)
    const nextCursor = hasMore && last ? `${last.cursor_time}_${last.id}` : null;

    const processing = getProcessingChatIds(auth.session!.id);
    const conversations = rows.map((row) => {
      delete row.cursor_time;
      return { ...row, is_processing: processing.has(row.id) };
    });

    return NextResponse.json({ conversations, next_cursor: nextCursor });
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
