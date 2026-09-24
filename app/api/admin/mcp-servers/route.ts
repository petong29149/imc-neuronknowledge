import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query, ensureDatabaseSchema } from '@/lib/db';
import { testAndSyncMCPServer } from '@/lib/mcp';

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
 * GET /api/admin/mcp-servers
 * List all MCP servers with tool counts
 */
export async function GET() {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const result = await query(`
      SELECT 
        s.*,
        COUNT(t.id) as tool_count,
        COUNT(t.id) FILTER (WHERE t.is_enabled = true) as active_tool_count
      FROM mcp_servers s
      LEFT JOIN mcp_tools t ON t.server_id = s.id
      GROUP BY s.id
      ORDER BY s.created_at ASC
    `);

    return NextResponse.json({ servers: result.rows });
  } catch (error: any) {
    console.error('Fetch MCP servers error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการโหลด MCP Servers' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/mcp-servers
 * Create a new MCP server connection
 */
export async function POST(request: Request) {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const {
      name,
      transport_type = 'sse',
      url = '',
      command = '',
      args = [],
      env = {},
      headers = {},
      is_active = true,
      auto_sync = true,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อ MCP Server' }, { status: 400 });
    }

    const validTransport = ['sse', 'streamable_http', 'stdio'].includes(transport_type)
      ? transport_type
      : 'sse';

    if (validTransport === 'stdio' && (!command || !command.trim())) {
      return NextResponse.json({ error: 'กรุณากรอกคำสั่ง Command สำหรับ Stdio Transport' }, { status: 400 });
    }

    if ((validTransport === 'sse' || validTransport === 'streamable_http') && (!url || !url.trim())) {
      return NextResponse.json({ error: 'กรุณากรอก Server URL สำหรับ SSE/HTTP Transport' }, { status: 400 });
    }

    const parsedArgs = Array.isArray(args)
      ? JSON.stringify(args)
      : typeof args === 'string'
      ? JSON.stringify(args.split(' ').filter(Boolean))
      : '[]';

    const parsedEnv = typeof env === 'object' ? JSON.stringify(env) : '{}';
    const parsedHeaders = typeof headers === 'object' ? JSON.stringify(headers) : '{}';

    const insertResult = await query(
      `INSERT INTO mcp_servers (
         name, transport_type, url, command, args, env, headers, is_active, status, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'untested', NOW(), NOW())
       RETURNING *`,
      [
        name.trim(),
        validTransport,
        url ? url.trim() : '',
        command ? command.trim() : '',
        parsedArgs,
        parsedEnv,
        parsedHeaders,
        Boolean(is_active),
      ]
    );

    const createdServer = insertResult.rows[0];

    // Optionally auto-sync tools upon creation
    let syncResult = null;
    if (auto_sync && createdServer.is_active) {
      try {
        syncResult = await testAndSyncMCPServer(createdServer.id);
      } catch (syncErr: any) {
        console.error('Initial auto-sync warning:', syncErr);
      }
    }

    return NextResponse.json(
      {
        message: 'เพิ่ม MCP Server เรียบร้อยแล้ว',
        server: createdServer,
        sync: syncResult,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create MCP server error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการสร้าง MCP Server' },
      { status: 500 }
    );
  }
}
