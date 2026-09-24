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
 * GET /api/admin/mcp-servers/[id]
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const serverResult = await query('SELECT * FROM mcp_servers WHERE id = $1', [id]);
    if (serverResult.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบ MCP Server' }, { status: 404 });
    }

    const toolsResult = await query(
      'SELECT * FROM mcp_tools WHERE server_id = $1 ORDER BY name ASC',
      [id]
    );

    return NextResponse.json({
      server: serverResult.rows[0],
      tools: toolsResult.rows,
    });
  } catch (error: any) {
    console.error('Get MCP server error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/mcp-servers/[id]
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await query('SELECT * FROM mcp_servers WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบ MCP Server' }, { status: 404 });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (body.name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(body.name.trim());
    }
    if (body.transport_type !== undefined) {
      updates.push(`transport_type = $${idx++}`);
      values.push(body.transport_type);
    }
    if (body.url !== undefined) {
      updates.push(`url = $${idx++}`);
      values.push(body.url.trim());
    }
    if (body.command !== undefined) {
      updates.push(`command = $${idx++}`);
      values.push(body.command.trim());
    }
    if (body.args !== undefined) {
      updates.push(`args = $${idx++}`);
      values.push(
        Array.isArray(body.args)
          ? JSON.stringify(body.args)
          : typeof body.args === 'string'
          ? JSON.stringify(body.args.split(' ').filter(Boolean))
          : '[]'
      );
    }
    if (body.env !== undefined) {
      updates.push(`env = $${idx++}`);
      values.push(typeof body.env === 'object' ? JSON.stringify(body.env) : '{}');
    }
    if (body.headers !== undefined) {
      updates.push(`headers = $${idx++}`);
      values.push(typeof body.headers === 'object' ? JSON.stringify(body.headers) : '{}');
    }
    if (body.is_active !== undefined) {
      updates.push(`is_active = $${idx++}`);
      values.push(Boolean(body.is_active));
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'ไม่มีข้อมูลให้อัปเดต' }, { status: 400 });
    }

    updates.push('updated_at = NOW()');
    values.push(id);

    const updateQuery = `UPDATE mcp_servers SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await query(updateQuery, values);

    return NextResponse.json({
      message: 'อัปเดต MCP Server เรียบร้อยแล้ว',
      server: result.rows[0],
    });
  } catch (error: any) {
    console.error('Update MCP server error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการอัปเดต' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/mcp-servers/[id]
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const result = await query('DELETE FROM mcp_servers WHERE id = $1 RETURNING id, name', [id]);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบ MCP Server' }, { status: 404 });
    }

    return NextResponse.json({
      message: `ลบ MCP Server "${result.rows[0].name}" เรียบร้อยแล้ว`,
      deleted_id: result.rows[0].id,
    });
  } catch (error: any) {
    console.error('Delete MCP server error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการลบ' }, { status: 500 });
  }
}
