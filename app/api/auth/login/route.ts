import { NextResponse } from 'next/server';
import { query, ensureDatabaseSchema } from '@/lib/db';
import { verifyPassword, signToken, setSessionCookie, UserRole } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    await ensureDatabaseSchema();

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'กรุณากรอกอีเมลและรหัสผ่าน' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Query user by email
    const result = await query(
      `SELECT id, name, email, password_hash, role, is_active 
       FROM users 
       WHERE LOWER(email) = $1 
       LIMIT 1`,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    // Check account active status
    if (!user.is_active) {
      return NextResponse.json(
        { error: 'บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ' },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    // Safety fallback: If no admin currently exists in the system, promote this user
    let userRole: UserRole = user.role as UserRole;
    const adminCountResult = await query(
      "SELECT COUNT(*) as admin_count FROM users WHERE role = 'admin'"
    );
    const adminCount = parseInt(adminCountResult.rows[0].admin_count, 10);
    if (adminCount === 0) {
      userRole = 'admin';
      await query("UPDATE users SET role = 'admin', updated_at = NOW() WHERE id = $1", [
        user.id,
      ]);
    }

    // Generate JWT token
    const token = await signToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: userRole,
    });

    // Set cookie
    await setSessionCookie(token);

    return NextResponse.json({
      message: 'เข้าสู่ระบบสำเร็จ',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: userRole,
      },
    });
  } catch (error: any) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
