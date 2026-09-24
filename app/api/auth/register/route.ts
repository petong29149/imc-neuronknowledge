import { NextResponse } from 'next/server';
import { query, ensureDatabaseSchema } from '@/lib/db';
import { hashPassword, signToken, setSessionCookie, UserRole } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    await ensureDatabaseSchema();

    const body = await request.json();
    const { name, email, password } = body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'กรุณากรอกชื่อ-นามสกุล' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'รูปแบบอีเมลไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1',
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'อีเมลนี้ถูกใช้งานแล้วในระบบ' },
        { status: 409 }
      );
    }

    // Check count of existing users
    // RULE: The first user to register/login is automatically assigned the 'admin' role!
    const countResult = await query('SELECT COUNT(*) as total FROM users');
    const totalUsers = parseInt(countResult.rows[0].total, 10);
    const assignedRole: UserRole = totalUsers === 0 ? 'admin' : 'user';

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Insert user
    const insertResult = await query(
      `INSERT INTO users (name, email, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, true, NOW(), NOW())
       RETURNING id, name, email, role, is_active, created_at`,
      [name.trim(), normalizedEmail, hashedPassword, assignedRole]
    );

    const newUser = insertResult.rows[0];

    // Issue JWT token and set HTTP-only cookie
    const token = await signToken({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role as UserRole,
    });

    await setSessionCookie(token);

    return NextResponse.json(
      {
        message:
          assignedRole === 'admin'
            ? 'ยินดีต้อนรับ! คุณเป็นผู้ใช้คนแรกของระบบ จึงได้รับการกำหนดสิทธิ์เป็น Admin อัตโนมัติ'
            : 'สมัครสมาชิกสำเร็จ',
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          is_active: newUser.is_active,
          isFirstUserAdmin: assignedRole === 'admin',
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration API error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการสมัครสมาชิก กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
