import { query, ChatHistoryMessage } from '@/lib/db';
import { resolveEndpointUrl, getLLMHeaders } from '@/lib/llm-utils';
import { getEnabledMCPTools, executeMCPTool, OpenAIToolDefinition } from '@/lib/mcp';
import { randomUUID } from 'crypto';

export type EffortLevel = 'low' | 'medium' | 'high';

export interface LLMCoreConfig {
  chatId: number;
  sessionId?: string;
  message: string;
  modelInfo: {
    id: number;
    model_id: string;
    display_name: string;
    base_url: string;
    api_key: string;
    provider: string;
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    context_length?: number;
  };
  effortLevel?: EffortLevel;
  toolsEnabled?: boolean;
  systemPrompt?: string;
  userId?: number;
}

export interface StreamEvent {
  type:
    | 'meta'
    | 'content'
    | 'reasoning'
    | 'status'
    | 'tool_call_start'
    | 'tool_call_result'
    | 'done'
    | 'error';
  content?: string;
  chat_id?: number;
  session_id?: string;
  model_name?: string;
  effort_level?: EffortLevel;
  step?: number;
  max_steps?: number;
  tool_name?: string;
  tool_call_id?: string;
  args?: Record<string, any>;
  result?: string;
  is_error?: boolean;
  error?: string;
  status_message?: string;
  is_synthesis?: boolean;
}

/**
 * Returns configuration values corresponding to the selected effort level
 */
export function getEffortConfig(level: EffortLevel = 'medium', baseTemp = 0.7) {
  switch (level) {
    case 'low':
      return {
        maxToolLoops: 5,
        temperature: Math.min(baseTemp, 0.3),
        reasoningEffort: 'low',
        systemDirective:
          'Provide concise, direct answers with minimal overhead. Execute tools only when strictly required.',
      };
    case 'high':
      return {
        maxToolLoops: 20,
        temperature: baseTemp,
        reasoningEffort: 'high',
        systemDirective:
          'Perform in-depth reasoning and rigorous analysis. Investigate thoroughly using available tools, verify hypotheses step-by-step, cross-check findings, and structure your final response comprehensively.',
      };
    case 'medium':
    default:
      return {
        maxToolLoops: 10,
        temperature: baseTemp,
        reasoningEffort: 'medium',
        systemDirective:
          'Think methodically. Use available tools when helpful to verify facts, retrieve data, and formulate a clear, well-supported response.',
      };
  }
}

// ────── Helpers to read / append the JSONB chat_history ──────

/**
 * Fetch the current chat_history array from the chats row.
 */
async function getChatHistory(chatId: number): Promise<ChatHistoryMessage[]> {
  const res = await query(
    'SELECT chat_history FROM chats WHERE id = $1',
    [chatId]
  );
  if (res.rows.length === 0) return [];
  const raw = res.rows[0].chat_history;
  // Postgres may return a string or already-parsed object depending on driver version
  if (typeof raw === 'string') return JSON.parse(raw);
  return raw ?? [];
}

/**
 * Append one or more messages to the chat_history JSONB array and bump counters.
 */
async function appendChatHistory(chatId: number, messages: ChatHistoryMessage[]) {
  // Use jsonb_concat to atomically append
  await query(
    `UPDATE chats
     SET chat_history = chat_history || $2::jsonb,
         message_count = message_count + $3,
         updated_at = NOW()
     WHERE id = $1`,
    [chatId, JSON.stringify(messages), messages.length]
  );
}

/**
 * Build a ChatHistoryMessage object with sensible defaults.
 */
function buildMessage(overrides: Partial<ChatHistoryMessage> & { role: string; content: string }): ChatHistoryMessage {
  return {
    id: randomUUID(),
    role: overrides.role,
    content: overrides.content,
    model_id: overrides.model_id ?? null,
    model_name: overrides.model_name ?? null,
    tool_calls: overrides.tool_calls ?? null,
    tool_call_id: overrides.tool_call_id ?? null,
    name: overrides.name ?? null,
    finish_reason: overrides.finish_reason ?? null,
    token_count: overrides.token_count ?? 0,
    reasoning_content: overrides.reasoning_content ?? null,
    created_at: overrides.created_at ?? new Date().toISOString(),
  };
}

/**
 * Executes the LLM orchestration loop with MCP tool calling, loop iterations,
 * and effort levels. Streams progress and outputs in real-time.
 */
export async function runLLMAgentLoop(
  config: LLMCoreConfig,
  emit: (event: StreamEvent) => void
) {
  const {
    chatId,
    sessionId,
    modelInfo,
    effortLevel = 'medium',
    toolsEnabled = true,
  } = config;

  const effortConfig = getEffortConfig(effortLevel, modelInfo.temperature || 0.7);

  // Send initial metadata to client
  emit({
    type: 'meta',
    chat_id: chatId,
    session_id: sessionId,
    model_name: modelInfo.display_name,
    effort_level: effortLevel,
    max_steps: effortConfig.maxToolLoops,
  });

  // Load enabled MCP tools if tool calling is active
  let tools: OpenAIToolDefinition[] = [];
  if (toolsEnabled) {
    try {
      const toolData = await getEnabledMCPTools();
      tools = toolData.tools;
    } catch (toolErr) {
      console.error('Error fetching MCP tools:', toolErr);
    }
  }

  // Fetch full chat history from the chats row
  const history = await getChatHistory(chatId);

  // Assemble initial messages array for the LLM
  const messages: any[] = [];

  // Combine system prompt with effort directive
  const systemParts = [
    config.systemPrompt || 'You are an intelligent AI assistant powered by NeuronKnowledge enterprise platform.',
    effortConfig.systemDirective,
  ];

  if (tools.length > 0) {
    systemParts.push(
      `You have access to ${tools.length} active MCP tools: [${tools.map((t) => t.function.name).join(', ')}]. Use them proactively when user queries require calculations, search, system operations, or specialized data.`
    );
  }

  messages.push({
    role: 'system',
    content: systemParts.join('\n\n'),
  });

  for (const msg of history) {
    const item: any = {
      role: msg.role,
      content: msg.content || '',
    };
    if (msg.tool_calls) {
      item.tool_calls = typeof msg.tool_calls === 'string' ? JSON.parse(msg.tool_calls) : msg.tool_calls;
    }
    if (msg.tool_call_id) {
      item.tool_call_id = msg.tool_call_id;
    }
    if (msg.name) {
      item.name = msg.name;
    }
    messages.push(item);
  }

  const apiUrl = resolveEndpointUrl(modelInfo.base_url, modelInfo.provider, 'chat');
  const headers = getLLMHeaders(modelInfo.api_key, modelInfo.provider);

  let currentLoop = 0;
  let finalAssistantContent = '';

  while (currentLoop < effortConfig.maxToolLoops) {
    currentLoop++;

    emit({
      type: 'status',
      status_message:
        currentLoop === 1
          ? `กำลังประมวลผล (Effort: ${effortLevel.toUpperCase()})...`
          : `กำลังคิดและสังเคราะห์ข้อมูลรอบที่ ${currentLoop}/${effortConfig.maxToolLoops}...`,
      step: currentLoop,
    });

    // Prepare LLM request payload
    const requestBody: any = {
      model: modelInfo.model_id,
      messages,
      stream: true,
      temperature: effortConfig.temperature,
      top_p: modelInfo.top_p ?? 1.0,
      max_tokens: Math.max(modelInfo.max_tokens ?? 4096, 4096),
    };

    // Include reasoning_effort for models that support it (e.g. OpenAI o1/o3/OpenRouter)
    if (effortConfig.reasoningEffort) {
      requestBody.reasoning_effort = effortConfig.reasoningEffort;
      requestBody.reasoning = {
        effort: effortConfig.reasoningEffort,
      };
    }

    // Attach tools if available and enabled
    if (tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = 'auto';
    }

    let llmResponse: Response;
    try {
      llmResponse = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });
    } catch (fetchErr: any) {
      throw new Error(`Cannot reach LLM API at ${apiUrl}: ${fetchErr.message}`);
    }

    if (!llmResponse.ok) {
      const errText = await llmResponse.text().catch(() => '');
      throw new Error(`LLM API returned status ${llmResponse.status}: ${errText.substring(0, 300)}`);
    }

    if (!llmResponse.body) {
      throw new Error('LLM API returned empty response body');
    }

    // Stream and accumulate chunk data
    const reader = llmResponse.body.getReader();
    const decoder = new TextDecoder();

    let stepContent = '';
    let stepReasoning = '';
    const pendingToolCalls: Record<
      number,
      { id: string; name: string; arguments: string }
    > = {};

    let finishReason = '';

    // Buffer for incomplete SSE lines split across TCP chunks
    let sseBuffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      sseBuffer += decoder.decode(value, { stream: true });

      // Process only complete lines (ending with \n); keep the trailing partial
      const parts = sseBuffer.split('\n');
      sseBuffer = parts.pop() || ''; // last element is either '' or an incomplete line

      for (const line of parts) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const dataStr = trimmed.slice(6);

        if (dataStr === '[DONE]') {
          continue;
        }

        try {
          const json = JSON.parse(dataStr);
          const choice = json.choices?.[0];
          if (!choice) continue;

          if (choice.finish_reason) {
            finishReason = choice.finish_reason;
          }

          // Normalise: some providers (Gemini) return `message` instead of `delta`
          const delta = choice.delta || choice.message;
          if (!delta) continue;

          // Handle streaming reasoning/thinking tokens (OpenRouter, DeepSeek-R1, Gemini, Qwen)
          const reasoningToken =
            delta.reasoning ??
            delta.reasoning_content ??
            delta.thought ??
            '';
          if (reasoningToken && typeof reasoningToken === 'string') {
            stepReasoning += reasoningToken;
            emit({
              type: 'reasoning',
              content: reasoningToken,
              step: currentLoop,
            });
          }

          // Handle standard content tokens
          if (delta.content) {
            const token = delta.content;
            stepContent += token;
            emit({
              type: 'content',
              content: token,
              step: currentLoop,
            });
          }

          // Handle tool calls delta chunks
          if (delta.tool_calls && Array.isArray(delta.tool_calls)) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              if (!pendingToolCalls[idx]) {
                pendingToolCalls[idx] = {
                  id: tc.id || `call_${Date.now()}_${idx}`,
                  name: tc.function?.name || '',
                  arguments: tc.function?.arguments || '',
                };
              } else {
                if (tc.id) pendingToolCalls[idx].id = tc.id;
                // Name is always delivered whole (never streamed in pieces) — overwrite, don't append
                if (tc.function?.name) pendingToolCalls[idx].name = tc.function.name;
                // Arguments ARE streamed in pieces — append
                if (tc.function?.arguments) pendingToolCalls[idx].arguments += tc.function.arguments;
              }
            }
          }
        } catch {
          // Skip unparseable chunks
        }
      }
    }

    // Process any remaining data left in the buffer
    if (sseBuffer.trim()) {
      const trimmed = sseBuffer.trim();
      if (trimmed.startsWith('data: ') && trimmed.slice(6) !== '[DONE]') {
        try {
          const json = JSON.parse(trimmed.slice(6));
          const choice = json.choices?.[0];
          if (choice) {
            if (choice.finish_reason) finishReason = choice.finish_reason;
            const delta = choice.delta || choice.message;
            const reasoningToken =
              delta?.reasoning ?? delta?.reasoning_content ?? delta?.thought ?? '';
            if (reasoningToken && typeof reasoningToken === 'string') {
              stepReasoning += reasoningToken;
              emit({ type: 'reasoning', content: reasoningToken, step: currentLoop });
            }
            if (delta?.content) {
              stepContent += delta.content;
              emit({ type: 'content', content: delta.content, step: currentLoop });
            }
            if (delta?.tool_calls && Array.isArray(delta.tool_calls)) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                if (!pendingToolCalls[idx]) {
                  pendingToolCalls[idx] = {
                    id: tc.id || `call_${Date.now()}_${idx}`,
                    name: tc.function?.name || '',
                    arguments: tc.function?.arguments || '',
                  };
                } else {
                  if (tc.id) pendingToolCalls[idx].id = tc.id;
                  if (tc.function?.name) pendingToolCalls[idx].name = tc.function.name;
                  if (tc.function?.arguments) pendingToolCalls[idx].arguments += tc.function.arguments;
                }
              }
            }
          }
        } catch {
          // Ignore trailing partial data
        }
      }
    }

    // Convert accumulated pending tool calls to array, filtering out any with empty names
    const toolCallList = Object.values(pendingToolCalls).filter((tc) => {
      if (!tc.name || !tc.name.trim()) {
        console.warn('[LLM Agent] Discarding tool call with empty name:', JSON.stringify(tc));
        return false;
      }
      return true;
    });

    // If tool calls were requested by the LLM
    if (toolCallList.length > 0) {
      // Save assistant's intermediate message with tool_calls in memory and DB
      const formattedToolCalls = toolCallList.map((tc) => ({
        id: tc.id,
        type: 'function',
        function: {
          name: tc.name,
          arguments: tc.arguments,
        },
      }));

      // Add to messages array for subsequent turns
      messages.push({
        role: 'assistant',
        content: stepContent || '',
        tool_calls: formattedToolCalls,
      });

      // Save intermediate assistant message to chat_history
      await appendChatHistory(chatId, [
        buildMessage({
          role: 'assistant',
          content: stepContent || '',
          model_id: modelInfo.id,
          model_name: modelInfo.display_name,
          tool_calls: formattedToolCalls,
          finish_reason: 'tool_calls',
          reasoning_content: stepReasoning || null,
        }),
      ]);

      // Execute each tool call sequentially
      for (const tc of toolCallList) {
        let parsedArgs: Record<string, any> = {};
        try {
          parsedArgs = tc.arguments ? JSON.parse(tc.arguments) : {};
        } catch {
          parsedArgs = { raw: tc.arguments };
        }

        emit({
          type: 'tool_call_start',
          tool_name: tc.name,
          tool_call_id: tc.id,
          args: parsedArgs,
          step: currentLoop,
        });

        emit({
          type: 'status',
          status_message: `🔧 กำลังเรียกใช้ MCP Tool: ${tc.name}...`,
          step: currentLoop,
        });

        // Periodic keep-alive heartbeat while tool is executing (prevents timeouts for long queries)
        let elapsedSec = 0;
        const heartbeatTimer = setInterval(() => {
          elapsedSec += 5;
          const mins = Math.floor(elapsedSec / 60);
          const secs = elapsedSec % 60;
          const timeText = mins > 0 ? `${mins} นาที ${secs} วินาที` : `${secs} วินาที`;
          emit({
            type: 'status',
            status_message: `🔧 กำลังประมวลผล Tool: ${tc.name}... (รอผลลัพธ์ ${timeText})`,
            step: currentLoop,
          });
        }, 5000);

        let execResult: any;
        try {
          // Execute tool via MCP manager with 10-minute timeout
          execResult = await executeMCPTool(tc.name, parsedArgs);
        } finally {
          clearInterval(heartbeatTimer);
        }

        emit({
          type: 'tool_call_result',
          tool_name: tc.name,
          tool_call_id: tc.id,
          result: execResult.content,
          is_error: execResult.isError,
          step: currentLoop,
        });

        // Add tool response to messages
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          name: tc.name,
          content: execResult.content,
        });

        // Save tool response message to chat_history
        await appendChatHistory(chatId, [
          buildMessage({
            role: 'tool',
            content: execResult.content,
            model_id: modelInfo.id,
            model_name: null,
            tool_call_id: tc.id,
            name: tc.name,
          }),
        ]);
      }

      // If we have now completed the maximum allowed tool iterations,
      // exit the tool loop so the final synthesis step can run
      if (currentLoop >= effortConfig.maxToolLoops) {
        break;
      }

      // Otherwise loop continues with tool results in context
    } else {
      // No tool calls requested: LLM produced final response
      finalAssistantContent = stepContent;

      if (finalAssistantContent) {
        // Save final assistant message to chat_history
        await appendChatHistory(chatId, [
          buildMessage({
            role: 'assistant',
            content: finalAssistantContent,
            model_id: modelInfo.id,
            model_name: modelInfo.display_name,
            finish_reason: finishReason || 'stop',
            reasoning_content: stepReasoning || null,
          }),
        ]);
      }

      // Agent loop terminates successfully
      break;
    }
  }

  // If tool loops were exhausted without producing a final text response,
  // execute one final synthesis turn with tools disabled so the model summarizes its findings.
  if (!finalAssistantContent) {
    emit({
      type: 'status',
      status_message: '✨ รวบรวมข้อมูลครบถ้วนแล้ว กำลังวิเคราะห์และสังเคราะห์คำตอบสุดท้าย...',
      step: currentLoop + 1,
    });

    // Prepare tailored context for final answer synthesis
    const synthMessages = messages.map((m) => {
      if (m.role === 'system') {
        return {
          role: 'system',
          content: `${config.systemPrompt || 'You are an intelligent AI assistant powered by NeuronKnowledge enterprise platform.'}\n\nIMPORTANT: All data collection from tools is finished. Do NOT call any tools. You must now synthesize, analyze the data thoroughly, and formulate a comprehensive, detailed, well-structured, professional final answer for the user in Thai.`,
        };
      }
      return m;
    });

    // Add an explicit directive to force final comprehensive response
    synthMessages.push({
      role: 'user',
      content: 'รวบรวมข้อมูลเสร็จสิ้นแล้ว โปรดสรุปและวิเคราะห์ผลลัพธ์ทั้งหมดอย่างละเอียด สมบูรณ์ และมีโครงสร้างที่ชัดเจนเพื่อตอบคำถามของผู้ใช้ทันที (ไม่ต้องเรียกใช้เครื่องมือใดๆ เพิ่มเติม)',
    });

    const synthRequestBody: any = {
      model: modelInfo.model_id,
      messages: synthMessages,
      stream: true,
      temperature: effortConfig.temperature,
      top_p: modelInfo.top_p ?? 1.0,
      max_tokens: Math.max(modelInfo.max_tokens ?? 4096, 4096),
    };

    if (effortConfig.reasoningEffort) {
      synthRequestBody.reasoning_effort = effortConfig.reasoningEffort;
      synthRequestBody.reasoning = {
        effort: effortConfig.reasoningEffort,
      };
    }

    try {
      const synthResponse = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(synthRequestBody),
      });

      if (synthResponse.ok && synthResponse.body) {
        const synthReader = synthResponse.body.getReader();
        const synthDecoder = new TextDecoder();
        let synthContent = '';
        let synthReasoning = '';
        let synthFinishReason = 'stop';
        let synthBuffer = '';

        while (true) {
          const { done, value } = await synthReader.read();
          if (done) break;

          synthBuffer += synthDecoder.decode(value, { stream: true });
          const parts = synthBuffer.split('\n');
          synthBuffer = parts.pop() || '';

          for (const line of parts) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const dataStr = trimmed.slice(6);
            if (dataStr === '[DONE]') continue;

            try {
              const json = JSON.parse(dataStr);
              const choice = json.choices?.[0];
              if (!choice) continue;

              if (choice.finish_reason) synthFinishReason = choice.finish_reason;
              const delta = choice.delta || choice.message;
              if (!delta) continue;

              const reasoningToken =
                delta.reasoning ??
                delta.reasoning_content ??
                delta.thought ??
                '';
              if (reasoningToken && typeof reasoningToken === 'string') {
                synthReasoning += reasoningToken;
                emit({
                  type: 'reasoning',
                  content: reasoningToken,
                  step: currentLoop + 1,
                  is_synthesis: true,
                });
              }

              if (delta.content) {
                synthContent += delta.content;
                emit({
                  type: 'content',
                  content: delta.content,
                  step: currentLoop + 1,
                  is_synthesis: true,
                });
              }
            } catch {}
          }
        }

        // Process any trailing data left in synthBuffer
        if (synthBuffer.trim()) {
          const trimmed = synthBuffer.trim();
          if (trimmed.startsWith('data: ') && trimmed.slice(6) !== '[DONE]') {
            try {
              const json = JSON.parse(trimmed.slice(6));
              const choice = json.choices?.[0];
              const delta = choice?.delta || choice?.message;
              const reasoningToken =
                delta?.reasoning ?? delta?.reasoning_content ?? delta?.thought ?? '';
              if (reasoningToken && typeof reasoningToken === 'string') {
                synthReasoning += reasoningToken;
                emit({ type: 'reasoning', content: reasoningToken, step: currentLoop + 1, is_synthesis: true });
              }
              if (delta?.content) {
                synthContent += delta.content;
                emit({ type: 'content', content: delta.content, step: currentLoop + 1, is_synthesis: true });
              }
            } catch {}
          }
        }

        finalAssistantContent = synthContent;

        if (finalAssistantContent) {
          await appendChatHistory(chatId, [
            buildMessage({
              role: 'assistant',
              content: finalAssistantContent,
              model_id: modelInfo.id,
              model_name: modelInfo.display_name,
              finish_reason: synthFinishReason || 'stop',
              reasoning_content: synthReasoning || null,
            }),
          ]);
        }
      }
    } catch (synthErr) {
      console.error('[LLM Agent] Synthesis step error:', synthErr);
    }
  }

  // Guaranteed fallback: If still empty, save a user-friendly error message so chat history is never orphaned
  if (!finalAssistantContent) {
    const fallbackText = 'ระบบประมวลผลเครื่องมือเสร็จสิ้น แต่แบบจำลองไม่ได้ส่งคำตอบสรุป กรุณาลองสอบถามใหม่อีกครั้ง';
    await appendChatHistory(chatId, [
      buildMessage({
        role: 'assistant',
        content: fallbackText,
        model_id: modelInfo.id,
        model_name: modelInfo.display_name,
        finish_reason: 'stop',
        reasoning_content: null,
      }),
    ]);
    emit({ type: 'content', content: fallbackText });
  }

  // Done event with chat_id and session_id
  emit({ type: 'done', chat_id: chatId, session_id: sessionId });
}
