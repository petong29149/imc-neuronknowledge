import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { query, ensureDatabaseSchema } from '@/lib/db';

/**
 * GET /api/admin/groups
 * Group list with member counts, plus aggregate stats for the metric cards.
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
    const statusFilter = searchParams.get('status')?.trim().toLowerCase() || 'all';

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(
        `(LOWER(g.name) LIKE $${paramIndex} OR LOWER(g.description) LIKE $${paramIndex})`
      );
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (statusFilter === 'active') {
      conditions.push('g.is_active = true');
    } else if (statusFilter === 'inactive') {
      conditions.push('g.is_active = false');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const groupsResult = await query(
      `
      SELECT
        g.id,
        g.name,
        g.description,
        g.is_active,
        g.created_at,
        g.updated_at,
        COUNT(gm.id)::int AS member_count,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', u.id,
              'name', u.name,
              'email', u.email,
              'role', u.role,
              'is_active', u.is_active,
              'member_role', gm.member_role
            )
            ORDER BY gm.member_role DESC, u.name ASC
          ) FILTER (WHERE u.id IS NOT NULL),
          '[]'
        ) AS members
      FROM groups g
      LEFT JOIN group_members gm ON gm.group_id = g.id
      LEFT JOIN users u ON u.id = gm.user_id
      ${whereClause}
      GROUP BY g.id
      ORDER BY g.name ASC
      `,
      params
    );

    const statsResult = await query(`
      SELECT
        (SELECT COUNT(*) FROM groups) AS total_groups,
        (SELECT COUNT(*) FROM groups WHERE is_active = true) AS total_active,
        (SELECT COUNT(*) FROM groups WHERE is_active = false) AS total_inactive,
        (SELECT COUNT(DISTINCT user_id) FROM group_members) AS total_assigned_users,
        (SELECT COUNT(*) FROM users u
          WHERE NOT EXISTS (SELECT 1 FROM group_members gm WHERE gm.user_id = u.id)
        ) AS total_ungrouped_users
    `);

    const row = statsResult.rows[0];
    const stats = {
      totalGroups: parseInt(row.total_groups || '0', 10),
      totalActive: parseInt(row.total_active || '0', 10),
      totalInactive: parseInt(row.total_inactive || '0', 10),
      totalAssignedUsers: parseInt(row.total_assigned_users || '0', 10),
      totalUngroupedUsers: parseInt(row.total_ungrouped_users || '0', 10),
    };

    return NextResponse.json({ groups: groupsResult.rows, stats });
  } catch (error: any) {
    console.error('Fetch groups error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการโหลดข้อมูลกลุ่มผู้ใช้งาน' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/groups
 * Create a group, optionally seeding it with members.
 */
export async function POST(request: Request) {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { name, description = '', is_active = true, member_ids = [] } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อกลุ่ม' }, { status: 400 });
    }

    const trimmedName = name.trim();
    const existing = await query('SELECT id FROM groups WHERE LOWER(name) = $1 LIMIT 1', [
      trimmedName.toLowerCase(),
    ]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'ชื่อกลุ่มนี้ถูกใช้งานแล้วในระบบ' }, { status: 409 });
    }

    const insertResult = await query(
      `INSERT INTO groups (name, description, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING id, name, description, is_active, created_at, updated_at`,
      [trimmedName, String(description || '').trim(), Boolean(is_active)]
    );

    const group = insertResult.rows[0];

    // Seed membership when the create form picked users up front
    const memberIds = Array.isArray(member_ids)
      ? member_ids.map((id: any) => parseInt(id, 10)).filter((id: number) => !isNaN(id))
      : [];

    if (memberIds.length > 0) {
      await query(
        `INSERT INTO group_members (group_id, user_id)
         SELECT $1, u.id FROM users u WHERE u.id = ANY($2::int[])
         ON CONFLICT (group_id, user_id) DO NOTHING`,
        [group.id, memberIds]
      );
    }

    return NextResponse.json(
      { message: `สร้างกลุ่ม "${group.name}" เรียบร้อยแล้ว`, group },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create group error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการสร้างกลุ่ม' }, { status: 500 });
  }
}
