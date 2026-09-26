import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { query, ensureDatabaseSchema } from '@/lib/db';
import { validateSkillInput } from '@/lib/skills';

/**
 * GET /api/admin/skills
 * Skill list (with content, for the edit form) plus counts for the metric cards.
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

    if (search) {
      params.push(`%${search}%`);
      conditions.push(
        `(LOWER(s.slug) LIKE $1 OR LOWER(s.name) LIKE $1 OR LOWER(s.description) LIKE $1)`
      );
    }
    if (statusFilter === 'active') {
      conditions.push('s.is_active = true');
    } else if (statusFilter === 'inactive') {
      conditions.push('s.is_active = false');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const skillsResult = await query(
      `SELECT s.id, s.slug, s.name, s.description, s.content, s.is_active,
              s.created_at, s.updated_at, u.name AS created_by_name
       FROM skills s
       LEFT JOIN users u ON u.id = s.created_by
       ${whereClause}
       ORDER BY s.slug ASC`,
      params
    );

    const statsResult = await query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE is_active)::int AS active,
        COUNT(*) FILTER (WHERE NOT is_active)::int AS inactive
      FROM skills
    `);

    const row = statsResult.rows[0];
    return NextResponse.json({
      skills: skillsResult.rows,
      stats: { total: row.total, active: row.active, inactive: row.inactive },
    });
  } catch (error: any) {
    console.error('Fetch skills error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการโหลดข้อมูล Skills' }, { status: 500 });
  }
}

/**
 * POST /api/admin/skills
 * Create a skill.
 */
export async function POST(request: Request) {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const validationError = validateSkillInput(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const slug = body.slug.trim();
    const existing = await query('SELECT id FROM skills WHERE slug = $1 LIMIT 1', [slug]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: `slug "${slug}" ถูกใช้งานแล้ว` }, { status: 409 });
    }

    const result = await query(
      `INSERT INTO skills (slug, name, description, content, is_active, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id, slug, name, description, content, is_active, created_at, updated_at`,
      [
        slug,
        body.name.trim(),
        body.description.trim(),
        body.content.trim(),
        body.is_active === undefined ? true : Boolean(body.is_active),
        auth.session?.id ?? null,
      ]
    );

    const skill = result.rows[0];
    return NextResponse.json(
      { message: `สร้าง skill "${skill.name}" เรียบร้อยแล้ว`, skill },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create skill error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการสร้าง skill' }, { status: 500 });
  }
}
