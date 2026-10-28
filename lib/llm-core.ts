import { query, ChatHistoryMessage } from '@/lib/db';
import { resolveEndpointUrl, getLLMHeaders } from '@/lib/llm-utils';
import type { AgentRuntime } from '@/lib/agents';
import { executeTool } from '@/lib/tool-executor';
import { prepareTurnContext } from '@/lib/turn-context';
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
    /** false = never send tools to this model (models.supports_tools) */
    supports_tools?: boolean;
  };
  effortLevel?: EffortLevel;
  toolsEnabled?: boolean;
  /** Per-chat prompt (chats.system_prompt) */
  systemPrompt?: string;
  /** The chat's agent: scopes skills and MCP tools. null = no agent (all active skills and MCP tools) */
  agent?: AgentRuntime | null;
  userId?: number;
  /** Aborted when the user presses Stop: the turn ends early and keeps what was generated so far */
  signal?: AbortSignal;
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
    | 'title'
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
  usage?: TokenUsage;
  title?: string;
  /** On 'done': the user stopped the turn before it finished */
  stopped?: boolean;
}

/** finish_reason saved on an assistant message that the user stopped */
export const STOPPED_FINISH_REASON = 'stopped';

const STOPPED_TOOL_RESULT = 'Tool execution was cancelled because the user stopped the response.';
const STOPPED_EMPTY_ANSWER = 'หยุดการตอบก่อนที่จะได้คำตอบ';

/** Error text of a 4xx response that means "this model/endpoint does not accept tools" */
const TOOLS_REJECTED_PATTERN = /tool|function[ _]?call/i;

/**
 * History without tool-calling turns, for a model that does not accept them:
 * tool results are dropped and assistant tool-call steps keep only their text.
 */
function withoutToolMessages(messages: any[]): any[] {
  return messages
    .filter((m) => m.role !== 'tool')
    .map((m) => {
      if (!m.tool_calls) return m;
      const rest = { ...m };
      delete rest.tool_calls;
      return rest;
    })
    .filter((m) => m.role !== 'assistant' || (m.content && String(m.content).trim()));
}

/**
 * Resolves with the promise's value, or with `null` as soon as the signal aborts.
 * (The underlying work is not cancelled, only no longer waited for.)
 */
function unlessAborted<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T | null> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const onAbort = () => resolve(null);
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (err) => {
        signal.removeEventListener('abort', onAbort);
        reject(err);
      }
    );
  });
}

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

/**
 * Reads the `usage` object from a streamed chunk, if present.
 * OpenAI-compatible providers send it in the final chunk (with empty `choices`)
 * when `stream_options.include_usage` is set.
 */
function extractUsage(json: any): TokenUsage | null {
  const u = json?.usage;
  if (!u || typeof u !== 'object') return null;
  const input = Number(u.prompt_tokens ?? u.input_tokens) || 0;
  const output = Number(u.completion_tokens ?? u.output_tokens) || 0;
  return {
    input_tokens: input,
    output_tokens: output,
    total_tokens: Number(u.total_tokens) || input + output,
  };
}

function mergeUsage(a: TokenUsage | null, b: TokenUsage | null): TokenUsage | null {
  if (!a || !b) return a ?? b;
  return {
    input_tokens: a.input_tokens + b.input_tokens,
    output_tokens: a.output_tokens + b.output_tokens,
    total_tokens: a.total_tokens + b.total_tokens,
  };
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
 * Append one or more assistant/tool messages to the chat_history JSONB array and
 * bump the token usage totals. (user_message_count is bumped by the completions route.)
 */
async function appendChatHistory(chatId: number, messages: ChatHistoryMessage[]) {
  const sum = (key: 'input_tokens' | 'output_tokens' | 'total_tokens') =>
    messages.reduce((acc, m) => acc + (m[key] ?? 0), 0);

  // Use jsonb_concat to atomically append
  await query(
    `UPDATE chats
     SET chat_history = chat_history || $2::jsonb,
         total_input_tokens = total_input_tokens + $3,
         total_output_tokens = total_output_tokens + $4,
         total_tokens = total_tokens + $5,
         updated_at = NOW()
     WHERE id = $1`,
    [
      chatId,
      JSON.stringify(messages),
      sum('input_tokens'),
      sum('output_tokens'),
      sum('total_tokens'),
    ]
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
    effort_level: overrides.effort_level ?? null,
    input_tokens: overrides.input_tokens ?? null,
    output_tokens: overrides.output_tokens ?? null,
    total_tokens: overrides.total_tokens ?? null,
    reasoning_content: overrides.reasoning_content ?? null,
    created_at: overrides.created_at ?? new Date().toISOString(),
  };
}

/**
 * Executes the LLM orchestration loop with built-in + MCP tool calling, loop iterations,
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
    signal,
  } = config;
  let stopped = false;

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

  // Models marked as not supporting tool calling get no tools
  // (and neither do models that reject them mid-turn, below)
  let toolsSupported = modelInfo.supports_tools !== false;
  const { toolCtx, turnTools, systemPromptFor, synthesisPrompt } = await prepareTurnContext({
    agent: config.agent ?? null,
    chatPrompt: config.systemPrompt,
    mcpEnabled: toolsEnabled,
    toolsSupported,
    effortDirective: effortConfig.systemDirective,
    userId: config.userId,
    chatId,
  });
  const tools = turnTools.tools;

  // Fetch full chat history from the chats row
  const history = await getChatHistory(chatId);

  // Assemble initial messages array for the LLM
  let messages: any[] = [];
  messages.push({ role: 'system', content: systemPromptFor(true) });

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
  // Earlier tool turns (from a model that had tools) would be rejected by this one
  if (!toolsSupported) messages = withoutToolMessages(messages);

  const apiUrl = resolveEndpointUrl(modelInfo.base_url, modelInfo.provider, 'chat');
  const headers = getLLMHeaders(modelInfo.api_key, modelInfo.provider);

  let currentLoop = 0;
  let finalAssistantContent = '';

  // Token usage summed across every LLM call made for this user message
  const turnUsage: TokenUsage = { input_tokens: 0, output_tokens: 0, total_tokens: 0 };
  const addTurnUsage = (usage: TokenUsage | null) => {
    if (!usage) return;
    turnUsage.input_tokens += usage.input_tokens;
    turnUsage.output_tokens += usage.output_tokens;
    turnUsage.total_tokens += usage.total_tokens;
  };
  // Usage from calls that returned no content (so no message was saved);
  // carried onto the next saved assistant message so chat totals stay accurate
  let unsavedUsage: TokenUsage | null = null;

  while (currentLoop < effortConfig.maxToolLoops) {
    if (signal?.aborted) {
      stopped = true;
      break;
    }
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
      stream_options: { include_usage: true },
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
    if (toolsSupported && tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = 'auto';
    }

    let llmResponse: Response;
    try {
      llmResponse = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal,
      });
    } catch (fetchErr: any) {
      if (signal?.aborted) {
        stopped = true;
        break;
      }
      throw new Error(`Cannot reach LLM API at ${apiUrl}: ${fetchErr.message}`);
    }

    if (!llmResponse.ok) {
      const errText = await llmResponse.text().catch(() => '');
      // The model rejected the tools (not marked as unsupported in admin yet):
      // drop them for the rest of this turn and retry the same round without them
      if (requestBody.tools && llmResponse.status < 500 && TOOLS_REJECTED_PATTERN.test(errText)) {
        console.warn(
          `Model "${modelInfo.model_id}" rejected tool calling (status ${llmResponse.status}); ` +
            'retrying without tools. Turn off "รองรับ Tool Calling" for this model in Admin > LLM.',
          errText.substring(0, 300)
        );
        toolsSupported = false;
        messages = withoutToolMessages(messages);
        messages[0] = { role: 'system', content: systemPromptFor(false) };
        emit({
          type: 'status',
          status_message: '⚠️ Model นี้ไม่รองรับการเรียกใช้ Tools กำลังตอบโดยไม่ใช้เครื่องมือ...',
          step: currentLoop,
        });
        currentLoop--;
        continue;
      }
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
    let stepUsage: TokenUsage | null = null;

    // Buffer for incomplete SSE lines split across TCP chunks
    let sseBuffer = '';

    while (true) {
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await reader.read();
      } catch (readErr) {
        if (signal?.aborted) {
          stopped = true;
          break;
        }
        throw readErr;
      }
      const { done, value } = chunk;
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
          // Usage usually arrives in a final chunk with no choices, so read it first
          stepUsage = extractUsage(json) ?? stepUsage;
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
          stepUsage = extractUsage(json) ?? stepUsage;
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

    addTurnUsage(stepUsage);

    // Stopped mid-stream: keep the text generated so far as the answer and drop any
    // half-received tool calls (they were never executed)
    if (stopped) {
      finalAssistantContent = stepContent;
      if (finalAssistantContent) {
        await appendChatHistory(chatId, [
          buildMessage({
            role: 'assistant',
            content: finalAssistantContent,
            model_id: modelInfo.id,
            model_name: modelInfo.display_name,
            finish_reason: STOPPED_FINISH_REASON,
            reasoning_content: stepReasoning || null,
            effort_level: effortLevel,
            ...mergeUsage(unsavedUsage, stepUsage),
          }),
        ]);
        unsavedUsage = null;
      }
      break;
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
          effort_level: effortLevel,
          ...stepUsage,
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

        // Every tool call needs a tool result in history (or the next request is invalid),
        // so tools cut short by Stop get a "cancelled" result instead of being skipped
        if (signal?.aborted) {
          stopped = true;
          const cancelled = { content: STOPPED_TOOL_RESULT, isError: true };
          emit({
            type: 'tool_call_result',
            tool_name: tc.name,
            tool_call_id: tc.id,
            result: cancelled.content,
            is_error: true,
            step: currentLoop,
          });
          messages.push({ role: 'tool', tool_call_id: tc.id, name: tc.name, content: cancelled.content });
          await appendChatHistory(chatId, [
            buildMessage({
              role: 'tool',
              content: cancelled.content,
              model_id: modelInfo.id,
              model_name: null,
              tool_call_id: tc.id,
              name: tc.name,
            }),
          ]);
          continue;
        }

        emit({
          type: 'status',
          status_message: turnTools.builtinNames.includes(tc.name)
            ? `🧰 กำลังเรียกใช้เครื่องมือในระบบ: ${tc.name}...`
            : `🔧 กำลังเรียกใช้ MCP Tool: ${tc.name}...`,
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
          // Built-in tools run in-process, MCP tools on their server (10-minute timeout);
          // stop waiting if the user stops
          execResult = await unlessAborted(
            executeTool(tc.name, parsedArgs, toolCtx, turnTools),
            signal
          );
        } finally {
          clearInterval(heartbeatTimer);
        }
        if (execResult === null) {
          stopped = true;
          execResult = { content: STOPPED_TOOL_RESULT, isError: true };
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

      // If we have now completed the maximum allowed tool iterations (or the user stopped),
      // exit the tool loop so the final synthesis step can run
      if (stopped || currentLoop >= effortConfig.maxToolLoops) {
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
            effort_level: effortLevel,
            ...stepUsage,
          }),
        ]);
      } else {
        unsavedUsage = stepUsage;
      }

      // Agent loop terminates successfully
      break;
    }
  }

  // If tool loops were exhausted without producing a final text response,
  // execute one final synthesis turn with tools disabled so the model summarizes its findings.
  // (Skipped when the user stopped the turn.)
  if (!finalAssistantContent && !stopped) {
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
          content: synthesisPrompt(),
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
      stream_options: { include_usage: true },
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
        signal,
      });

      if (synthResponse.ok && synthResponse.body) {
        const synthReader = synthResponse.body.getReader();
        const synthDecoder = new TextDecoder();
        let synthContent = '';
        let synthReasoning = '';
        let synthFinishReason = 'stop';
        let synthUsage: TokenUsage | null = null;
        let synthBuffer = '';

        while (true) {
          let chunk: ReadableStreamReadResult<Uint8Array>;
          try {
            chunk = await synthReader.read();
          } catch (readErr) {
            if (signal?.aborted) {
              stopped = true;
              synthFinishReason = STOPPED_FINISH_REASON;
              break;
            }
            throw readErr;
          }
          const { done, value } = chunk;
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
              synthUsage = extractUsage(json) ?? synthUsage;
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
              synthUsage = extractUsage(json) ?? synthUsage;
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
        addTurnUsage(synthUsage);
        const synthMessageUsage = mergeUsage(unsavedUsage, synthUsage);

        if (finalAssistantContent) {
          await appendChatHistory(chatId, [
            buildMessage({
              role: 'assistant',
              content: finalAssistantContent,
              model_id: modelInfo.id,
              model_name: modelInfo.display_name,
              finish_reason: synthFinishReason || 'stop',
              reasoning_content: synthReasoning || null,
              effort_level: effortLevel,
              ...synthMessageUsage,
            }),
          ]);
          unsavedUsage = null;
        } else {
          unsavedUsage = synthMessageUsage;
        }
      }
    } catch (synthErr) {
      if (signal?.aborted) {
        stopped = true;
      } else {
        console.error('[LLM Agent] Synthesis step error:', synthErr);
      }
    }
  }

  // Guaranteed fallback: If still empty, save a user-friendly error message so chat history is never orphaned
  if (!finalAssistantContent) {
    const fallbackText = stopped
      ? STOPPED_EMPTY_ANSWER
      : 'ระบบประมวลผลเครื่องมือเสร็จสิ้น แต่แบบจำลองไม่ได้ส่งคำตอบสรุป กรุณาลองสอบถามใหม่อีกครั้ง';
    await appendChatHistory(chatId, [
      buildMessage({
        role: 'assistant',
        content: fallbackText,
        model_id: modelInfo.id,
        model_name: modelInfo.display_name,
        finish_reason: stopped ? STOPPED_FINISH_REASON : 'stop',
        reasoning_content: null,
        effort_level: effortLevel,
        ...unsavedUsage,
      }),
    ]);
    emit({ type: 'content', content: fallbackText });
  }

  // Done event with chat_id, session_id and token usage for this turn
  emit({ type: 'done', chat_id: chatId, session_id: sessionId, usage: turnUsage, stopped });
}
