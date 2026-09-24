import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query, ensureDatabaseSchema } from '@/lib/db';

async function requireAdmin() {
  const session = await getSession();
  if (!session) {
    return { error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ', status: 401, session: null };
  }
  if (session.role !== 'admin') {
    return { error: 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้', status: 403, session: null };
  }
  return { error: null, status: 200, session };
}

/**
 * GET /api/admin/mcp-tools
 * List tools with filters
 */
export async function GET(request: Request) {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const serverId = searchParams.get('server_id');
    const enabled = searchParams.get('enabled');
    const search = searchParams.get('search');

    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (serverId && serverId !== 'all') {
      conditions.push(`t.server_id = $${idx++}`);
      params.push(parseInt(serverId, 10));
    }

    if (enabled === 'true') {
      conditions.push(`t.is_enabled = true`);
    } else if (enabled === 'false') {
      conditions.push(`t.is_enabled = false`);
    }

    if (search && search.trim()) {
      conditions.push(`(t.name ILIKE $${idx} OR t.description ILIKE $${idx})`);
      params.push(`%${search.trim()}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        t.*,
        s.name as server_name,
        s.transport_type,
        s.is_active as server_active
      FROM mcp_tools t
      JOIN mcp_servers s ON s.id = t.server_id
      ${whereClause}
      ORDER BY s.id, t.name ASC
    `;

    const result = await query(sql, params);

    return NextResponse.json({ tools: result.rows });
  } catch (error: any) {
    console.error('Fetch MCP tools error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการโหลด MCP Tools' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/mcp-tools
 * Bulk toggle enable/disable tools
 */
export async function PUT(request: Request) {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { server_id, is_enabled } = body;

    if (server_id === undefined || is_enabled === undefined) {
      return NextResponse.json({ error: 'Missing server_id or is_enabled' }, { status: 400 });
    }

    await query(
      'UPDATE mcp_tools SET is_enabled = $1, updated_at = NOW() WHERE server_id = $2',
      [Boolean(is_enabled), server_id]
    );

    return NextResponse.json({
      message: `ปรับปรุงสถานะ Tools ทั้งหมดของเซิร์ฟเวอร์เป็น ${is_enabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'} เรียบร้อยแล้ว`,
    });
  } catch (error: any) {
    console.error('Bulk update tools error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการอัปเดต' },
      { status: 500 }
    );
  }
}
