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
 * PUT /api/admin/mcp-tools/[id]
 * Toggle tool enabled or update description
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

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (body.is_enabled !== undefined) {
      updates.push(`is_enabled = $${idx++}`);
      values.push(Boolean(body.is_enabled));
    }
    if (body.description !== undefined) {
      updates.push(`description = $${idx++}`);
      values.push(body.description);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'ไม่มีข้อมูลให้อัปเดต' }, { status: 400 });
    }

    updates.push('updated_at = NOW()');
    values.push(id);

    const result = await query(
      `UPDATE mcp_tools SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบ Tool' }, { status: 404 });
    }

    return NextResponse.json({
      message: `อัปเดตสถานะ Tool เรียบร้อยแล้ว`,
      tool: result.rows[0],
    });
  } catch (error: any) {
    console.error('Update tool error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการอัปเดต' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/mcp-tools/[id]
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
    const result = await query('DELETE FROM mcp_tools WHERE id = $1 RETURNING id, name', [id]);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบ Tool' }, { status: 404 });
    }

    return NextResponse.json({
      message: `ลบ Tool "${result.rows[0].name}" เรียบร้อยแล้ว`,
      deleted_id: result.rows[0].id,
    });
  } catch (error: any) {
    console.error('Delete tool error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการลบ' }, { status: 500 });
  }
}
