import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { query } from '@/lib/db';

async function resolveGroup(id: string) {
  const groupId = parseInt(id, 10);
  if (isNaN(groupId)) {
    return { groupId: null, error: 'รหัสกลุ่มไม่ถูกต้อง', status: 400 as const };
  }
  const res = await query('SELECT id, name FROM groups WHERE id = $1', [groupId]);
  if (res.rows.length === 0) {
    return { groupId: null, error: 'ไม่พบกลุ่มนี้ในระบบ', status: 404 as const };
  }
  return { groupId, group: res.rows[0], error: null, status: 200 as const };
}

/**
 * POST /api/admin/groups/[id]/members
 * Add one or more users to the group. Already-members are skipped silently.
 * Body: { user_id } or { user_ids: number[] }, optional member_role.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const resolved = await resolveGroup(id);
    if (resolved.error) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    const body = await request.json();
    const rawIds = Array.isArray(body.user_ids) ? body.user_ids : [body.user_id];
    const userIds = rawIds
      .map((uid: any) => parseInt(uid, 10))
      .filter((uid: number) => !isNaN(uid));

    if (userIds.length === 0) {
      return NextResponse.json({ error: 'กรุณาเลือกผู้ใช้งานที่ต้องการเพิ่ม' }, { status: 400 });
    }

    const memberRole = body.member_role === 'owner' ? 'owner' : 'member';

    const inserted = await query(
      `INSERT INTO group_members (group_id, user_id, member_role)
       SELECT $1, u.id, $3 FROM users u WHERE u.id = ANY($2::int[])
       ON CONFLICT (group_id, user_id) DO NOTHING
       RETURNING user_id`,
      [resolved.groupId, userIds, memberRole]
    );

    if (inserted.rows.length === 0) {
      return NextResponse.json(
        { error: 'ผู้ใช้งานที่เลือกอยู่ในกลุ่มนี้แล้ว หรือไม่พบในระบบ' },
        { status: 409 }
      );
    }

    return NextResponse.json({
      message: `เพิ่มสมาชิก ${inserted.rows.length} คน เข้ากลุ่ม "${resolved.group.name}" เรียบร้อยแล้ว`,
      addedUserIds: inserted.rows.map((r: any) => r.user_id),
    });
  } catch (error: any) {
    console.error('Add group member error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการเพิ่มสมาชิก' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/groups/[id]/members
 * Change one member's role within the group.
 * Body: { user_id, member_role: 'owner' | 'member' }
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const resolved = await resolveGroup(id);
    if (resolved.error) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    const body = await request.json();
    const userId = parseInt(body.user_id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'รหัสผู้ใช้ไม่ถูกต้อง' }, { status: 400 });
    }

    const memberRole = body.member_role === 'owner' ? 'owner' : 'member';

    const result = await query(
      `UPDATE group_members SET member_role = $3
       WHERE group_id = $1 AND user_id = $2
       RETURNING user_id, member_role`,
      [resolved.groupId, userId, memberRole]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบสมาชิกคนนี้ในกลุ่ม' }, { status: 404 });
    }

    return NextResponse.json({
      message: memberRole === 'owner' ? 'ตั้งเป็นหัวหน้ากลุ่มเรียบร้อยแล้ว' : 'เปลี่ยนเป็นสมาชิกทั่วไปเรียบร้อยแล้ว',
      member: result.rows[0],
    });
  } catch (error: any) {
    console.error('Update group member error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการเปลี่ยนบทบาทสมาชิก' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/groups/[id]/members?user_id=123
 * Remove a single user from the group.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const resolved = await resolveGroup(id);
    if (resolved.error) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    const { searchParams } = new URL(request.url);
    const userId = parseInt(searchParams.get('user_id') || '', 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'รหัสผู้ใช้ไม่ถูกต้อง' }, { status: 400 });
    }

    const result = await query(
      'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2 RETURNING user_id',
      [resolved.groupId, userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบสมาชิกคนนี้ในกลุ่ม' }, { status: 404 });
    }

    return NextResponse.json({
      message: `นำสมาชิกออกจากกลุ่ม "${resolved.group.name}" เรียบร้อยแล้ว`,
      removedUserId: userId,
    });
  } catch (error: any) {
    console.error('Remove group member error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการนำสมาชิกออกจากกลุ่ม' }, { status: 500 });
  }
}
