import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { ensureDatabaseSchema } from '@/lib/db';
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
 * POST /api/admin/mcp-servers/[id]/sync
 * Connects to MCP server, validates handshake, lists tools, and synchronizes to database
 */
export async function POST(
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
    const serverId = parseInt(id, 10);
    if (isNaN(serverId)) {
      return NextResponse.json({ error: 'Invalid server ID' }, { status: 400 });
    }

    const result = await testAndSyncMCPServer(serverId);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Connection failed',
          result,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: `เชื่อมต่อสำเร็จและพบ ${result.tools_count} Tools`,
      result,
    });
  } catch (error: any) {
    console.error('MCP Sync error:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการ Sync MCP Server' },
      { status: 500 }
    );
  }
}
