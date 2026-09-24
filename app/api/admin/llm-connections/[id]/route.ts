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
 * GET /api/admin/llm-connections/[id]
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const result = await query('SELECT * FROM llm_connections WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบ Connection นี้' }, { status: 404 });
    }

    return NextResponse.json({ connection: result.rows[0] });
  } catch (error: any) {
    console.error('Fetch connection error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/llm-connections/[id]
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const body = await request.json();

    // Build dynamic SET clause
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (body.name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(body.name.trim());
    }
    if (body.provider !== undefined) {
      const validProvider = ['openai', 'ollama'].includes(body.provider) ? body.provider : 'openai';
      updates.push(`provider = $${idx++}`);
      values.push(validProvider);
    }
    if (body.base_url !== undefined) {
      updates.push(`base_url = $${idx++}`);
      values.push(body.base_url.trim());
    }
    if (body.api_key !== undefined) {
      updates.push(`api_key = $${idx++}`);
      values.push(body.api_key);
    }
    if (body.is_active !== undefined) {
      updates.push(`is_active = $${idx++}`);
      values.push(Boolean(body.is_active));
    }
    if (body.priority !== undefined) {
      updates.push(`priority = $${idx++}`);
      values.push(Number(body.priority));
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'ไม่มีข้อมูลให้อัปเดต' }, { status: 400 });
    }

    updates.push('updated_at = NOW()');
    values.push(id);

    const result = await query(
      `UPDATE llm_connections SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบ Connection นี้' }, { status: 404 });
    }

    return NextResponse.json({ message: 'อัปเดตเรียบร้อยแล้ว', connection: result.rows[0] });
  } catch (error: any) {
    console.error('Update connection error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/llm-connections/[id]
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const result = await query('DELETE FROM llm_connections WHERE id = $1 RETURNING id, name', [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบ Connection นี้' }, { status: 404 });
    }

    return NextResponse.json({ message: `ลบ "${result.rows[0].name}" เรียบร้อยแล้ว` });
  } catch (error: any) {
    console.error('Delete connection error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
