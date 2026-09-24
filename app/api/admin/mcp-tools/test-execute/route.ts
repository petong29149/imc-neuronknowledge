import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { ensureDatabaseSchema } from '@/lib/db';
import { executeMCPTool } from '@/lib/mcp';

export const maxDuration = 600; // 10 minutes
export const dynamic = 'force-dynamic';

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
 * POST /api/admin/mcp-tools/test-execute
 * Test-run an MCP tool directly with sample inputs
 */
export async function POST(request: Request) {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { tool_name, arguments: toolArgs = {}, timeout_ms } = body;

    if (!tool_name || !tool_name.trim()) {
      return NextResponse.json({ error: 'Missing tool_name' }, { status: 400 });
    }

    const startTime = Date.now();
    const result = await executeMCPTool(tool_name.trim(), toolArgs, timeout_ms);
    const executionTimeMs = Date.now() - startTime;

    return NextResponse.json({
      success: !result.isError,
      tool_name,
      execution_time_ms: executionTimeMs,
      server_name: result.server_name,
      output: result.content,
      is_error: result.isError,
    });
  } catch (error: any) {
    console.error('Test execute tool error:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการทดสอบ Tool' },
      { status: 500 }
    );
  }
}
