import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

async function requireAdmin() {
  const session = await getSession();
  if (!session) {
    return { error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ', status: 401, session: null };
  }
  if (session.role !== 'admin') {
    return {
      error: 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้ (สำหรับ Admin เท่านั้น)',
      status: 403,
      session: null,
    };
  }
  return { error: null, status: 200, session };
}

/**
 * PUT /api/admin/users/[id]
 * Update user details, role, status, or reset password
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const targetUserId = parseInt(id, 10);

    if (isNaN(targetUserId)) {
      return NextResponse.json({ error: 'รหัสผู้ใช้ไม่ถูกต้อง' }, { status: 400 });
    }

    const targetUserRes = await query('SELECT * FROM users WHERE id = $1', [targetUserId]);
    if (targetUserRes.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้งานนี้ในระบบ' }, { status: 404 });
    }

    const currentTargetUser = targetUserRes.rows[0];
    const body = await request.json();
    const { name, email, role, is_active, password } = body;

    // Validate email if changed
    if (email && email.trim().toLowerCase() !== currentTargetUser.email.toLowerCase()) {
      const emailCheck = await query(
        'SELECT id FROM users WHERE LOWER(email) = $1 AND id != $2',
        [email.trim().toLowerCase(), targetUserId]
      );
      if (emailCheck.rows.length > 0) {
        return NextResponse.json(
          { error: 'อีเมลนี้ถูกใช้งานโดยผู้ใช้อื่นแล้ว' },
          { status: 409 }
        );
      }
    }

    // Guard: Prevent demoting or deactivating the last active admin
    const newRole = role !== undefined ? (role === 'admin' ? 'admin' : 'user') : currentTargetUser.role;
    const newIsActive = is_active !== undefined ? Boolean(is_active) : currentTargetUser.is_active;

    if (
      currentTargetUser.role === 'admin' &&
      (newRole !== 'admin' || !newIsActive)
    ) {
      const activeAdminCountRes = await query(
        "SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = true"
      );
      const activeAdminCount = parseInt(activeAdminCountRes.rows[0].count, 10);

      if (activeAdminCount <= 1) {
        return NextResponse.json(
          {
            error:
              'ไม่สามารถลดระดับหรือระงับสิทธิ์ Admin คนสุดท้ายของระบบได้ ต้องมี Admin ที่ใช้งานอยู่อย่างน้อย 1 คน',
          },
          { status: 400 }
        );
      }
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let valIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${valIndex}`);
      values.push(name.trim());
      valIndex++;
    }

    if (email !== undefined) {
      updates.push(`email = $${valIndex}`);
      values.push(email.trim().toLowerCase());
      valIndex++;
    }

    if (role !== undefined) {
      updates.push(`role = $${valIndex}`);
      values.push(newRole);
      valIndex++;
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${valIndex}`);
      values.push(newIsActive);
      valIndex++;
    }

    if (password && typeof password === 'string' && password.trim().length >= 6) {
      const hashedPassword = await hashPassword(password.trim());
      updates.push(`password_hash = $${valIndex}`);
      values.push(hashedPassword);
      valIndex++;
    }

    updates.push(`updated_at = NOW()`);
    values.push(targetUserId);

    const updateQuery = `
      UPDATE users 
      SET ${updates.join(', ')} 
      WHERE id = $${valIndex}
      RETURNING id, name, email, role, is_active, created_at, updated_at
    `;

    const result = await query(updateQuery, values);

    return NextResponse.json({
      message: 'อัปเดตข้อมูลผู้ใช้งานเรียบร้อยแล้ว',
      user: result.rows[0],
    });
  } catch (error: any) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการอัปเดตผู้ใช้งาน' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Delete user account with strict guards
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const targetUserId = parseInt(id, 10);

    if (isNaN(targetUserId)) {
      return NextResponse.json({ error: 'รหัสผู้ใช้ไม่ถูกต้อง' }, { status: 400 });
    }

    // Guard 1: Cannot delete self
    if (auth.session?.id === targetUserId) {
      return NextResponse.json(
        { error: 'คุณไม่สามารถลบบัญชีของคุณเองได้' },
        { status: 400 }
      );
    }

    // Check target user
    const targetUserRes = await query('SELECT * FROM users WHERE id = $1', [targetUserId]);
    if (targetUserRes.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้งานนี้ในระบบ' }, { status: 404 });
    }

    const targetUser = targetUserRes.rows[0];

    // Guard 2: Cannot delete the last admin
    if (targetUser.role === 'admin') {
      const adminCountRes = await query(
        "SELECT COUNT(*) as count FROM users WHERE role = 'admin'"
      );
      const adminCount = parseInt(adminCountRes.rows[0].count, 10);

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'ไม่สามารถลบ Admin คนสุดท้ายของระบบได้' },
          { status: 400 }
        );
      }
    }

    // Delete user
    await query('DELETE FROM users WHERE id = $1', [targetUserId]);

    return NextResponse.json({
      message: `ลบผู้ใช้งาน "${targetUser.name}" เรียบร้อยแล้ว`,
      deletedId: targetUserId,
    });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการลบผู้ใช้งาน' },
      { status: 500 }
    );
  }
}
