import { NextResponse } from 'next/server';
import { getSession, signToken, setSessionCookie, UserRole } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * Update the signed-in user's own profile (currently: display name).
 */
export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' }, { status: 401 });
    }

    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';

    if (!name) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อ' }, { status: 400 });
    }
    if (name.length > 100) {
      return NextResponse.json({ error: 'ชื่อต้องไม่เกิน 100 ตัวอักษร' }, { status: 400 });
    }

    const result = await query(
      `UPDATE users SET name = $1, updated_at = NOW()
       WHERE id = $2 AND is_active = true
       RETURNING id, name, email, role`,
      [name, session.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบบัญชีผู้ใช้งาน' }, { status: 404 });
    }

    const user = result.rows[0];

    // The JWT carries the name, so re-issue it to keep the session in sync
    const token = await signToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
    });
    await setSessionCookie(token);

    return NextResponse.json({
      message: 'บันทึกชื่อเรียบร้อยแล้ว',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง' }, { status: 500 });
  }
}
