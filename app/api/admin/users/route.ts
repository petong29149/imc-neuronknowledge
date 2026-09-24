import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query, ensureDatabaseSchema } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

/**
 * Helper to enforce admin authorization
 */
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
 * GET /api/admin/users
 * Returns user list with filtering, search and metrics
 */
export async function GET(request: Request) {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const roleFilter = searchParams.get('role')?.trim().toLowerCase() || 'all';
    const statusFilter = searchParams.get('status')?.trim().toLowerCase() || 'all';

    // Build SQL query conditions
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(
        `(LOWER(name) LIKE $${paramIndex} OR LOWER(email) LIKE $${paramIndex})`
      );
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (roleFilter === 'admin' || roleFilter === 'user') {
      conditions.push(`role = $${paramIndex}`);
      params.push(roleFilter);
      paramIndex++;
    }

    if (statusFilter === 'active') {
      conditions.push(`is_active = true`);
    } else if (statusFilter === 'inactive') {
      conditions.push(`is_active = false`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const usersQuery = `
      SELECT id, name, email, role, is_active, created_at, updated_at
      FROM users
      ${whereClause}
      ORDER BY id ASC
    `;

    const usersResult = await query(usersQuery, params);

    // Compute system stats
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE role = 'admin') as total_admins,
        COUNT(*) FILTER (WHERE role = 'user') as total_regular_users,
        COUNT(*) FILTER (WHERE is_active = true) as total_active,
        COUNT(*) FILTER (WHERE is_active = false) as total_inactive
      FROM users
    `);

    const stats = {
      totalUsers: parseInt(statsResult.rows[0].total_users || '0', 10),
      totalAdmins: parseInt(statsResult.rows[0].total_admins || '0', 10),
      totalRegularUsers: parseInt(statsResult.rows[0].total_regular_users || '0', 10),
      totalActive: parseInt(statsResult.rows[0].total_active || '0', 10),
      totalInactive: parseInt(statsResult.rows[0].total_inactive || '0', 10),
    };

    return NextResponse.json({
      users: usersResult.rows,
      stats,
      currentUserId: auth.session?.id,
    });
  } catch (error: any) {
    console.error('Fetch users error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้งาน' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users
 * Admin creates a new user
 */
export async function POST(request: Request) {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { name, email, password, role = 'user', is_active = true } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อ-นามสกุล' }, { status: 400 });
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'รูปแบบอีเมลไม่ถูกต้อง' }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await query(
      'SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1',
      [normalizedEmail]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'อีเมลนี้ถูกใช้งานแล้วในระบบ' },
        { status: 409 }
      );
    }

    const validRole = role === 'admin' ? 'admin' : 'user';
    const hashedPassword = await hashPassword(password);

    const insertResult = await query(
      `INSERT INTO users (name, email, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, name, email, role, is_active, created_at, updated_at`,
      [name.trim(), normalizedEmail, hashedPassword, validRole, Boolean(is_active)]
    );

    return NextResponse.json(
      {
        message: 'เพิ่มผู้ใช้งานเรียบร้อยแล้ว',
        user: insertResult.rows[0],
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการสร้างผู้ใช้' },
      { status: 500 }
    );
  }
}
