import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query, ensureDatabaseSchema } from '@/lib/db';

async function requireAdmin() {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized', status: 401 };
  if (session.role !== 'admin') return { error: 'Forbidden', status: 403 };
  return { error: null, status: 200 };
}

/**
 * PUT /api/admin/models/[id]
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

    const allowedFields = [
      'connection_id', 'model_id', 'display_name', 'description',
      'context_length', 'max_tokens', 'temperature', 'top_p',
      'is_active', 'is_default', 'supports_tools',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = $${idx++}`);
        values.push(body[field]);
      }
    }

    if (body.capabilities !== undefined) {
      updates.push(`capabilities = $${idx++}`);
      values.push(JSON.stringify(body.capabilities));
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'ไม่มีข้อมูลให้อัปเดต' }, { status: 400 });
    }

    // If marking as default, unset existing defaults first
    if (body.is_default === true) {
      await query('UPDATE models SET is_default = false WHERE is_default = true');
    }

    updates.push('updated_at = NOW()');
    values.push(id);

    const result = await query(
      `UPDATE models SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบ Model นี้' }, { status: 404 });
    }

    return NextResponse.json({ message: 'อัปเดตเรียบร้อยแล้ว', model: result.rows[0] });
  } catch (error: any) {
    console.error('Update model error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/models/[id]
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
    const result = await query('DELETE FROM models WHERE id = $1 RETURNING id, display_name', [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบ Model นี้' }, { status: 404 });
    }

    return NextResponse.json({ message: `ลบ "${result.rows[0].display_name}" เรียบร้อยแล้ว` });
  } catch (error: any) {
    console.error('Delete model error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
