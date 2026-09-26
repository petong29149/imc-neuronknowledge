import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * GET /api/admin/groups/[id]
 * Group detail with its member list.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const groupId = parseInt(id, 10);
    if (isNaN(groupId)) {
      return NextResponse.json({ error: 'รหัสกลุ่มไม่ถูกต้อง' }, { status: 400 });
    }

    const groupRes = await query(
      'SELECT id, name, description, is_active, created_at, updated_at FROM groups WHERE id = $1',
      [groupId]
    );
    if (groupRes.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบกลุ่มนี้ในระบบ' }, { status: 404 });
    }

    const membersRes = await query(
      `SELECT u.id, u.name, u.email, u.role, u.is_active, gm.member_role, gm.created_at AS joined_at
       FROM group_members gm
       JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = $1
       ORDER BY gm.member_role DESC, u.name ASC`,
      [groupId]
    );

    return NextResponse.json({
      group: { ...groupRes.rows[0], members: membersRes.rows },
    });
  } catch (error: any) {
    console.error('Fetch group error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการโหลดข้อมูลกลุ่ม' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/groups/[id]
 * Update name, description or status. Passing `member_ids` replaces the whole
 * membership list in one shot (what the edit modal does).
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const groupId = parseInt(id, 10);
    if (isNaN(groupId)) {
      return NextResponse.json({ error: 'รหัสกลุ่มไม่ถูกต้อง' }, { status: 400 });
    }

    const groupRes = await query('SELECT * FROM groups WHERE id = $1', [groupId]);
    if (groupRes.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบกลุ่มนี้ในระบบ' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, is_active, member_ids } = body;

    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อกลุ่ม' }, { status: 400 });
    }

    if (name !== undefined) {
      const dupe = await query(
        'SELECT id FROM groups WHERE LOWER(name) = $1 AND id != $2 LIMIT 1',
        [name.trim().toLowerCase(), groupId]
      );
      if (dupe.rows.length > 0) {
        return NextResponse.json(
          { error: 'ชื่อกลุ่มนี้ถูกใช้งานโดยกลุ่มอื่นแล้ว' },
          { status: 409 }
        );
      }
    }

    const updates: string[] = [];
    const values: any[] = [];
    let valIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${valIndex}`);
      values.push(name.trim());
      valIndex++;
    }

    if (description !== undefined) {
      updates.push(`description = $${valIndex}`);
      values.push(String(description || '').trim());
      valIndex++;
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${valIndex}`);
      values.push(Boolean(is_active));
      valIndex++;
    }

    updates.push('updated_at = NOW()');
    values.push(groupId);

    const result = await query(
      `UPDATE groups SET ${updates.join(', ')} WHERE id = $${valIndex}
       RETURNING id, name, description, is_active, created_at, updated_at`,
      values
    );

    // Replace membership wholesale when the caller sent an explicit list
    if (Array.isArray(member_ids)) {
      const memberIds = member_ids
        .map((mid: any) => parseInt(mid, 10))
        .filter((mid: number) => !isNaN(mid));

      await query('DELETE FROM group_members WHERE group_id = $1 AND user_id <> ALL($2::int[])', [
        groupId,
        memberIds,
      ]);

      if (memberIds.length > 0) {
        await query(
          `INSERT INTO group_members (group_id, user_id)
           SELECT $1, u.id FROM users u WHERE u.id = ANY($2::int[])
           ON CONFLICT (group_id, user_id) DO NOTHING`,
          [groupId, memberIds]
        );
      }
    }

    return NextResponse.json({
      message: 'อัปเดตข้อมูลกลุ่มเรียบร้อยแล้ว',
      group: result.rows[0],
    });
  } catch (error: any) {
    console.error('Update group error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการอัปเดตกลุ่ม' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/groups/[id]
 * Removes the group; memberships go with it via ON DELETE CASCADE.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const groupId = parseInt(id, 10);
    if (isNaN(groupId)) {
      return NextResponse.json({ error: 'รหัสกลุ่มไม่ถูกต้อง' }, { status: 400 });
    }

    const groupRes = await query('SELECT name FROM groups WHERE id = $1', [groupId]);
    if (groupRes.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบกลุ่มนี้ในระบบ' }, { status: 404 });
    }

    await query('DELETE FROM groups WHERE id = $1', [groupId]);

    return NextResponse.json({
      message: `ลบกลุ่ม "${groupRes.rows[0].name}" เรียบร้อยแล้ว`,
      deletedId: groupId,
    });
  } catch (error: any) {
    console.error('Delete group error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการลบกลุ่ม' }, { status: 500 });
  }
}
