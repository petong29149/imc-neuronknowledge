import { query } from '@/lib/db';
import { getLLMHeaders, resolveEndpointUrl } from '@/lib/llm-utils';
import { HttpError } from './http';

// Non-streaming JSON calls to the LLM models configured by admins (llm_connections + models).
// Read-only use of those tables; lib/llm-core.ts (owned by P03) is not touched.

const LLM_TIMEOUT_MS = 90_000;

export interface AiModel {
  id: number;
  name: string;
  provider: string;
  isDefault: boolean;
}

interface ModelRow {
  id: number;
  model_id: string;
  display_name: string;
  max_tokens: number | null;
  is_default: boolean;
  base_url: string;
  api_key: string;
  provider: string;
  connection_name: string;
}

const MODEL_QUERY = `
  SELECT m.id, m.model_id, m.display_name, m.max_tokens, m.is_default,
         c.base_url, c.api_key, c.provider, c.name AS connection_name
  FROM models m JOIN llm_connections c ON c.id = m.connection_id
  WHERE m.is_active AND c.is_active`;

// Default for this page only: STUDIO_AI_DEFAULT_MODEL = a models.model_id (e.g. "Qwen/Qwen3.8-27B").
// The system-wide default (models.is_default, used by chat) is left alone.
// Without the setting, or if that model is inactive, the system default is used.
const PREFERRED_ORDER = `ORDER BY (m.model_id = $1) DESC, m.is_default DESC, c.priority DESC, m.id`;
const preferred = () => process.env.STUDIO_AI_DEFAULT_MODEL?.trim() ?? '';

export async function listAiModels(): Promise<AiModel[]> {
  const { rows } = await query<ModelRow>(`${MODEL_QUERY} ${PREFERRED_ORDER}`, [preferred()]);
  // The first row is the one used when nothing is chosen.
  return rows.map((r, i) => ({ id: r.id, name: r.display_name, provider: r.connection_name, isDefault: i === 0 }));
}

async function pickModel(modelId: unknown): Promise<ModelRow> {
  if (modelId !== undefined && modelId !== null) {
    const id = Number(modelId);
    if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'โมเดลที่เลือกไม่ถูกต้อง');
    const { rows } = await query<ModelRow>(`${MODEL_QUERY} AND m.id = $1`, [id]);
    if (!rows[0]) throw new HttpError(400, 'ไม่พบโมเดลที่เลือก หรือโมเดลถูกปิดใช้งาน');
    return rows[0];
  }
  const { rows } = await query<ModelRow>(`${MODEL_QUERY} ${PREFERRED_ORDER} LIMIT 1`, [preferred()]);
  if (!rows[0]) throw new HttpError(400, 'ยังไม่มีโมเดล AI ที่เปิดใช้ ให้ผู้ดูแลตั้งค่าในหน้า Admin ก่อน');
  return rows[0];
}

/** Pulls the first JSON object out of a model reply (handles ```json fences and <think> blocks). */
function extractJson(text: string): unknown {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/```(?:json)?/gi, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('no json');
  return JSON.parse(cleaned.slice(start, end + 1));
}

/** Calls the model and returns its JSON reply; failures become Thai messages without provider details. */
export async function chatJson(
  modelId: unknown,
  system: string,
  user: string
): Promise<{ data: unknown; model: string }> {
  const model = await pickModel(modelId);
  const url = resolveEndpointUrl(model.base_url, model.provider, 'chat');
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: getLLMHeaders(model.api_key, model.provider),
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
      body: JSON.stringify({
        model: model.model_id,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        stream: false,
        temperature: 0.2,
        max_tokens: Math.min(Math.max(model.max_tokens ?? 4096, 2048), 8192),
        reasoning_effort: 'low',
        reasoning: { effort: 'low' },
      }),
    });
  } catch (error) {
    const timeout = (error as Error).name === 'TimeoutError';
    console.error('[studio/connections] llm request failed', timeout ? 'timeout' : (error as Error).name);
    throw new HttpError(400, timeout ? 'AI ตอบช้าเกินไป ลองใหม่หรือเลือกโมเดลอื่น' : 'ติดต่อผู้ให้บริการ AI ไม่ได้ ลองใหม่หรือเลือกโมเดลอื่น');
  }

  if (!res.ok) {
    console.error('[studio/connections] llm status', res.status);
    if (res.status === 401 || res.status === 403) throw new HttpError(400, 'API key ของโมเดลนี้ใช้ไม่ได้ ให้ผู้ดูแลตรวจการตั้งค่า LLM');
    if (res.status === 429) throw new HttpError(400, 'เรียก AI ถี่เกินไป รอสักครู่แล้วลองใหม่');
    throw new HttpError(400, 'AI ตอบกลับผิดพลาด ลองใหม่หรือเลือกโมเดลอื่น');
  }

  const json = await res.json().catch(() => null);
  // OpenAI-compatible shape, or Ollama's native /api/chat shape
  const content = json?.choices?.[0]?.message?.content ?? json?.message?.content ?? '';
  try {
    return { data: extractJson(typeof content === 'string' ? content : ''), model: model.display_name };
  } catch {
    throw new HttpError(400, 'AI ตอบในรูปแบบที่อ่านไม่ได้ ลองใหม่อีกครั้งหรือเลือกโมเดลอื่น');
  }
}
