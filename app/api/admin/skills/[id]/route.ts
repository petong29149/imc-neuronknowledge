import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { query, ensureDatabaseSchema } from '@/lib/db';
import { validateSkillInput } from '@/lib/skills';

const SKILL_COLUMNS = 'id, slug, name, description, content, is_active, created_at, updated_at';

/**
 * GET /api/admin/skills/[id]
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const skillId = parseInt(id, 10);
    if (isNaN(skillId)) {
      return NextResponse.json({ error: 'รหัส skill ไม่ถูกต้อง' }, { status: 400 });
    }

    const result = await query(`SELECT ${SKILL_COLUMNS} FROM skills WHERE id = $1`, [skillId]);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบ skill นี้ในระบบ' }, { status: 404 });
    }
    return NextResponse.json({ skill: result.rows[0] });
  } catch (error: any) {
    console.error('Fetch skill error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการโหลด skill' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/skills/[id]
 * Partial update: only the fields that were sent are changed.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const skillId = parseInt(id, 10);
    if (isNaN(skillId)) {
      return NextResponse.json({ error: 'รหัส skill ไม่ถูกต้อง' }, { status: 400 });
    }

    const existing = await query('SELECT id FROM skills WHERE id = $1', [skillId]);
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบ skill นี้ในระบบ' }, { status: 404 });
    }

    const body = await request.json();
    const validationError = validateSkillInput(body, true);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    if (body.slug !== undefined) {
      const dupe = await query('SELECT id FROM skills WHERE slug = $1 AND id != $2 LIMIT 1', [
        body.slug.trim(),
        skillId,
      ]);
      if (dupe.rows.length > 0) {
        return NextResponse.json(
          { error: `slug "${body.slug.trim()}" ถูกใช้งานโดย skill อื่นแล้ว` },
          { status: 409 }
        );
      }
    }

    const updates: string[] = [];
    const values: any[] = [];
    for (const field of ['slug', 'name', 'description', 'content'] as const) {
      if (body[field] !== undefined) {
        values.push(body[field].trim());
        updates.push(`${field} = $${values.length}`);
      }
    }
    if (body.is_active !== undefined) {
      values.push(Boolean(body.is_active));
      updates.push(`is_active = $${values.length}`);
    }
    updates.push('updated_at = NOW()');
    values.push(skillId);

    const result = await query(
      `UPDATE skills SET ${updates.join(', ')} WHERE id = $${values.length}
       RETURNING ${SKILL_COLUMNS}`,
      values
    );

    return NextResponse.json({ message: 'อัปเดต skill เรียบร้อยแล้ว', skill: result.rows[0] });
  } catch (error: any) {
    console.error('Update skill error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการอัปเดต skill' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/skills/[id]
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const skillId = parseInt(id, 10);
    if (isNaN(skillId)) {
      return NextResponse.json({ error: 'รหัส skill ไม่ถูกต้อง' }, { status: 400 });
    }

    const result = await query('DELETE FROM skills WHERE id = $1 RETURNING name', [skillId]);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบ skill นี้ในระบบ' }, { status: 404 });
    }

    return NextResponse.json({
      message: `ลบ skill "${result.rows[0].name}" เรียบร้อยแล้ว`,
      deletedId: skillId,
    });
  } catch (error: any) {
    console.error('Delete skill error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการลบ skill' }, { status: 500 });
  }
}
