import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { ensureDatabaseSchema } from '@/lib/db';
import { executeMCPTool } from '@/lib/mcp';
import { listActiveSkills } from '@/lib/skills';
import { executeTool } from '@/lib/tool-executor';

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
 * Test-run an MCP tool (or a built-in tool, with `source: 'builtin'`) directly with sample inputs
 */
export async function POST(request: Request) {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { tool_name, arguments: toolArgs = {}, timeout_ms, source = 'mcp' } = body;

    if (!tool_name || !tool_name.trim()) {
      return NextResponse.json({ error: 'Missing tool_name' }, { status: 400 });
    }

    // `source` picks the implementation explicitly, so testing an MCP tool that shares
    // a built-in's name still reaches the MCP server
    const startTime = Date.now();
    const result =
      source === 'builtin'
        ? await executeTool(
            tool_name.trim(),
            toolArgs,
            { userId: auth.session?.id, skills: await listActiveSkills() },
            null
          )
        : await executeMCPTool(tool_name.trim(), toolArgs, timeout_ms);
    const executionTimeMs = Date.now() - startTime;

    return NextResponse.json({
      success: !result.isError,
      tool_name,
      execution_time_ms: executionTimeMs,
      server_name: source === 'builtin' ? 'Built-in' : result.server_name,
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
