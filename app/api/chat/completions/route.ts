import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query, ensureDatabaseSchema, ChatHistoryMessage } from '@/lib/db';
import { runLLMAgentLoop, EffortLevel } from '@/lib/llm-core';
import { generateChatTitle } from '@/lib/chat-title';
import { startChatRun, streamChatRun, isChatProcessing } from '@/lib/chat-runs';
import {
  getAccessibleAgent,
  getDefaultAgent,
  getAgentRuntime,
  type AgentRecord,
} from '@/lib/agents';
import { randomUUID } from 'crypto';

export const maxDuration = 600; // Allow long-running tool queries up to 10 minutes (600s)
export const dynamic = 'force-dynamic';

async function requireAuth() {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized', status: 401, session: null };
  return { error: null, status: 200, session };
}

/**
 * POST /api/chat/completions
 * Advanced LLM completion endpoint with MCP tool calling, loop execution, and effort levels.
 */
export async function POST(request: Request) {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAuth();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const {
      conversation_id,
      message,
      model_id,
      agent_id,
      effort_level = 'medium',
      tools_enabled = true,
    } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'กรุณากรอกข้อความ' }, { status: 400 });
    }

    // Resolve model and connection details
    let modelInfo: any = null;
    if (model_id) {
      const modelResult = await query(
        `SELECT m.*, c.base_url, c.api_key, c.provider
         FROM models m
         JOIN llm_connections c ON c.id = m.connection_id
         WHERE m.id = $1 AND m.is_active = true AND c.is_active = true`,
        [model_id]
      );
      if (modelResult.rows.length > 0) {
        modelInfo = modelResult.rows[0];
      }
    }

    // Fallback to active default model
    if (!modelInfo) {
      const defaultResult = await query(
        `SELECT m.*, c.base_url, c.api_key, c.provider
         FROM models m
         JOIN llm_connections c ON c.id = m.connection_id
         WHERE m.is_active = true AND c.is_active = true
         ORDER BY m.is_default DESC, m.created_at ASC
         LIMIT 1`
      );
      if (defaultResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'ไม่พบ Model ที่พร้อมใช้งาน กรุณาตั้งค่า LLM Connection และ Model ใน Admin ก่อน' },
          { status: 400 }
        );
      }
      modelInfo = defaultResult.rows[0];
    }

    // Ensure chat exists or create one
    let chatRow: any = null;
    let isNewChat = false;
    if (conversation_id) {
      const convStr = String(conversation_id).trim();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(convStr);
      const isInt = /^\d+$/.test(convStr);
      if (isUuid) {
        const res = await query('SELECT * FROM chats WHERE session_id = $1 AND user_id = $2', [convStr, auth.session!.id]);
        if (res.rows.length > 0) chatRow = res.rows[0];
      } else if (isInt) {
        const res = await query('SELECT * FROM chats WHERE id = $1 AND user_id = $2', [parseInt(convStr, 10), auth.session!.id]);
        if (res.rows.length > 0) chatRow = res.rows[0];
      }
    }

    // Resolve the agent: an existing chat keeps the agent it started with (chats from
    // before agents existed adopt the default); a new chat uses the requested agent or
    // the default. Access is checked every turn, so leaving a group revokes it.
    const viewer = auth.session!;
    let agent: AgentRecord | null;
    if (chatRow?.agent_id) {
      agent = await getAccessibleAgent(chatRow.agent_id, viewer);
      if (!agent) {
        return NextResponse.json(
          { error: 'คุณไม่มีสิทธิ์ใช้ AI Agent ของแชทนี้แล้ว หรือ Agent ถูกปิดใช้งาน' },
          { status: 403 }
        );
      }
    } else if (!chatRow && agent_id != null && agent_id !== '') {
      const requestedId = parseInt(String(agent_id), 10);
      agent = isNaN(requestedId) ? null : await getAccessibleAgent(requestedId, viewer);
      if (!agent) {
        return NextResponse.json({ error: 'คุณไม่มีสิทธิ์ใช้ AI Agent นี้' }, { status: 403 });
      }
    } else {
      agent = await getDefaultAgent(viewer);
    }
    if (!agent) {
      return NextResponse.json(
        { error: 'ไม่มี AI Agent ที่คุณใช้งานได้ กรุณาติดต่อผู้ดูแลระบบ' },
        { status: 403 }
      );
    }
    if (chatRow && !chatRow.agent_id) {
      await query('UPDATE chats SET agent_id = $2 WHERE id = $1', [chatRow.id, agent.id]);
    }

    if (!chatRow) {
      isNewChat = true;
      const chatResult = await query(
        `INSERT INTO chats (user_id, title, model_id, agent_id, effort_level, tools_enabled, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING *`,
        [
          auth.session!.id,
          message.substring(0, 80).trim() || 'New Chat',
          modelInfo.id,
          agent.id,
          effort_level,
          tools_enabled,
        ]
      );
      chatRow = chatResult.rows[0];
    } else {
      if (isChatProcessing(chatRow.id)) {
        return NextResponse.json(
          { error: 'แชทนี้กำลังประมวลผลคำถามก่อนหน้าอยู่ กรุณารอให้เสร็จก่อน' },
          { status: 409 }
        );
      }

      // Remember the last selected effort_level / tools_enabled for this chat
      // (the per-message effort_level is stored in chat_history)
      await query(
        `UPDATE chats
         SET effort_level = $2, tools_enabled = $3, updated_at = NOW()
         WHERE id = $1`,
        [chatRow.id, effort_level, tools_enabled]
      );
    }

    const chatId = chatRow.id;
    const sessionId = chatRow.session_id;

    // Save user message into chat_history JSONB
    const userMsg: ChatHistoryMessage = {
      id: randomUUID(),
      role: 'user',
      content: message.trim(),
      model_id: null,
      model_name: null,
      tool_calls: null,
      tool_call_id: null,
      name: null,
      finish_reason: null,
      effort_level,
      input_tokens: null,
      output_tokens: null,
      total_tokens: null,
      reasoning_content: null,
      created_at: new Date().toISOString(),
    };

    await query(
      `UPDATE chats
       SET chat_history = chat_history || $2::jsonb,
           user_message_count = user_message_count + 1,
           updated_at = NOW()
       WHERE id = $1`,
      [chatId, JSON.stringify([userMsg])]
    );

    // Retrieve system prompt for this chat
    const chatData = await query(
      'SELECT system_prompt FROM chats WHERE id = $1',
      [chatId]
    );
    const systemPrompt = chatData.rows[0]?.system_prompt || '';
    const agentRuntime = await getAgentRuntime(agent);

    // Process the turn in the background so it survives the client disconnecting
    // (refresh, closed tab, navigation). Clients re-attach via /api/chat/conversations/[id]/stream.
    const run = startChatRun({ chatId, sessionId, userId: auth.session!.id }, async (emit, signal) => {
      // Name new chats with an LLM-generated topic title, in parallel with the answer.
      // The truncated first message stays as the title if generation fails.
      const titlePromise = isNewChat
        ? generateChatTitle(chatId, message.trim(), chatRow.title, modelInfo).then((title) => {
            if (title) emit({ type: 'title', chat_id: chatId, session_id: sessionId, title });
          })
        : Promise.resolve();

      try {
        await runLLMAgentLoop(
          {
            chatId,
            sessionId,
            message: message.trim(),
            modelInfo,
            effortLevel: effort_level as EffortLevel,
            toolsEnabled: !!tools_enabled,
            systemPrompt,
            agent: agentRuntime,
            userId: auth.session!.id,
            signal,
          },
          emit
        );
      } catch (err: any) {
        console.error('LLM Loop error:', err);
        emit({
          type: 'error',
          error: err.message || 'An error occurred during LLM reasoning loop',
        });
      } finally {
        await titlePromise;
      }
    });

    return streamChatRun(run);
  } catch (error: any) {
    console.error('Chat completion endpoint error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการประมวลผล' }, { status: 500 });
  }
}
