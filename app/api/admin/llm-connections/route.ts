import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query, ensureDatabaseSchema } from '@/lib/db';

async function requireAdmin() {
  const session = await getSession();
  if (!session) {
    return { error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ', status: 401, session: null };
  }
  if (session.role !== 'admin') {
    return { error: 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้', status: 403, session: null };
  }
  return { error: null, status: 200, session };
}

/**
 * GET /api/admin/llm-connections
 * List all LLM connections with model counts
 */
export async function GET() {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const result = await query(`
      SELECT 
        c.*,
        COUNT(m.id) as model_count,
        COUNT(m.id) FILTER (WHERE m.is_active = true) as active_model_count
      FROM llm_connections c
      LEFT JOIN models m ON m.connection_id = c.id
      GROUP BY c.id
      ORDER BY c.priority DESC, c.created_at ASC
    `);

    return NextResponse.json({ connections: result.rows });
  } catch (error: any) {
    console.error('Fetch connections error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการโหลด LLM Connections' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/llm-connections
 * Create a new LLM connection
 */
export async function POST(request: Request) {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { name, provider = 'openai', base_url, api_key = '', is_active = true, priority = 0 } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อ Connection' }, { status: 400 });
    }
    if (!base_url || !base_url.trim()) {
      return NextResponse.json({ error: 'กรุณากรอก Base URL' }, { status: 400 });
    }

    const validProvider = ['openai', 'ollama'].includes(provider) ? provider : 'openai';

    const result = await query(
      `INSERT INTO llm_connections (name, provider, base_url, api_key, is_active, priority, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [name.trim(), validProvider, base_url.trim(), api_key || '', Boolean(is_active), Number(priority) || 0]
    );

    return NextResponse.json(
      { message: 'เพิ่ม LLM Connection เรียบร้อยแล้ว', connection: result.rows[0] },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create connection error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการสร้าง LLM Connection' },
      { status: 500 }
    );
  }
}
