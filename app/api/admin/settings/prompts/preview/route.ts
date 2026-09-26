import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { ensureDatabaseSchema } from '@/lib/db';
import { getAccessibleAgent, getAgentRuntime } from '@/lib/agents';
import { getEffortConfig } from '@/lib/llm-core';
import { prepareTurnContext } from '@/lib/turn-context';

/**
 * GET /api/admin/settings/prompts/preview?agent_id=
 * The full system prompt a new chat with this agent gets (medium effort, tools on),
 * built by the same code as the agent loop.
 */
export async function GET(request: Request) {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAdmin();
    if (auth.error || !auth.session) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const agentId = parseInt(new URL(request.url).searchParams.get('agent_id') || '', 10);
    const agent = isNaN(agentId) ? null : await getAccessibleAgent(agentId, auth.session);
    if (!agent) {
      return NextResponse.json({ error: 'ไม่พบ agent นี้ หรือ agent ถูกปิดใช้งาน' }, { status: 404 });
    }

    const turn = await prepareTurnContext({
      agent: await getAgentRuntime(agent),
      mcpEnabled: true,
      toolsSupported: true,
      effortDirective: getEffortConfig('medium').systemDirective,
      userId: auth.session.id,
    });

    return NextResponse.json({
      prompt: turn.systemPromptFor(true),
      tools: turn.turnTools.tools.map((t) => t.function.name),
    });
  } catch (error: any) {
    console.error('Preview system prompt error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการสร้างตัวอย่าง' }, { status: 500 });
  }
}
