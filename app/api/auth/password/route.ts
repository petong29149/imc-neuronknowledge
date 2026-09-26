import { NextResponse } from 'next/server';
import { getSession, hashPassword, verifyPassword } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * Change the signed-in user's own password. Requires the current password.
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || typeof currentPassword !== 'string') {
      return NextResponse.json({ error: 'กรุณากรอกรหัสผ่านปัจจุบัน' }, { status: 400 });
    }
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json({ error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' }, { status: 400 });
    }
    if (newPassword === currentPassword) {
      return NextResponse.json({ error: 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม' }, { status: 400 });
    }

    const result = await query(
      'SELECT password_hash FROM users WHERE id = $1 AND is_active = true LIMIT 1',
      [session.id]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบบัญชีผู้ใช้งาน' }, { status: 404 });
    }

    const isValid = await verifyPassword(currentPassword, result.rows[0].password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' }, { status: 400 });
    }

    const newHash = await hashPassword(newPassword);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
      newHash,
      session.id,
    ]);

    return NextResponse.json({ message: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว' });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'ไม่สามารถเปลี่ยนรหัสผ่านได้ กรุณาลองใหม่อีกครั้ง' }, { status: 500 });
  }
}
