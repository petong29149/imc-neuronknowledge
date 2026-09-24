import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query, ensureDatabaseSchema, ChatHistoryMessage } from '@/lib/db';
import { runLLMAgentLoop, EffortLevel } from '@/lib/llm-core';
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

    if (!chatRow) {
      const chatResult = await query(
        `INSERT INTO chats (user_id, title, model_id, effort_level, tools_enabled, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING *`,
        [
          auth.session!.id,
          message.substring(0, 80).trim() || 'New Chat',
          modelInfo.id,
          effort_level,
          tools_enabled,
        ]
      );
      chatRow = chatResult.rows[0];
    } else {
      // Update chat effort_level and tools_enabled if provided
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
      token_count: 0,
      reasoning_content: null,
      created_at: new Date().toISOString(),
    };

    await query(
      `UPDATE chats
       SET chat_history = chat_history || $2::jsonb,
           message_count = message_count + 1,
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

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        const emit = (event: any) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          } catch {
            // Stream might be closed by client
          }
        };

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
              userId: auth.session!.id,
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
          try {
            controller.close();
          } catch {
            // Controller already closed
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Chat completion endpoint error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการประมวลผล' }, { status: 500 });
  }
}
