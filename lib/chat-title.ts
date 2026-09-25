import { query } from '@/lib/db';
import { resolveEndpointUrl, getLLMHeaders } from '@/lib/llm-utils';

const TITLE_TIMEOUT_MS = 20_000;
const MAX_TITLE_LENGTH = 80;
const FALLBACK_EMOJI = '💬';

const TITLE_SYSTEM_PROMPT = [
  'You name chat conversations.',
  "Read the user's first message and reply with a short title (2-6 words) describing its topic.",
  'Start the title with exactly one emoji that fits the topic, followed by a space.',
  "Write the title in the same language as the user's message.",
  'Reply with the title only: no quotes, no trailing punctuation, no explanation.',
].join(' ');

interface TitleModelInfo {
  model_id: string;
  base_url: string;
  api_key: string;
  provider: string;
}

/**
 * Cleans raw model output into a single-line title that starts with an emoji.
 * Returns null when nothing usable is left.
 */
function sanitizeTitle(raw: string): string | null {
  let title = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '') // reasoning models that inline their thinking
    .split('\n')
    .map((l) => l.trim())
    .find(Boolean);
  if (!title) return null;

  title = title
    .replace(/^(title|ชื่อ(เรื่อง|แชท)?)\s*[:：]\s*/i, '')
    .replace(/[*_`#]/g, '')
    .replace(/^["'“”‘’「」]+|["'“”‘’「」]+$/g, '')
    .replace(/[.。!]+$/, '')
    .trim();
  if (!title) return null;

  if (!/^\p{Extended_Pictographic}/u.test(title)) {
    title = `${FALLBACK_EMOJI} ${title}`;
  }
  return title.length > MAX_TITLE_LENGTH ? title.slice(0, MAX_TITLE_LENGTH).trim() : title;
}

/**
 * Asks the chat's model for a brief emoji-prefixed topic title based on the first user message.
 */
async function requestTitle(modelInfo: TitleModelInfo, message: string): Promise<string | null> {
  const apiUrl = resolveEndpointUrl(modelInfo.base_url, modelInfo.provider, 'chat');
  const headers = getLLMHeaders(modelInfo.api_key, modelInfo.provider);

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers,
    signal: AbortSignal.timeout(TITLE_TIMEOUT_MS),
    body: JSON.stringify({
      model: modelInfo.model_id,
      messages: [
        { role: 'system', content: TITLE_SYSTEM_PROMPT },
        { role: 'user', content: message.slice(0, 2000) },
      ],
      stream: false,
      temperature: 0.3,
      // Headroom for reasoning models that think before answering
      max_tokens: 1024,
      reasoning_effort: 'low',
      reasoning: { effort: 'low' },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`status ${res.status}: ${errText.substring(0, 200)}`);
  }

  const json = await res.json();
  // OpenAI-compatible shape, or Ollama's native /api/chat shape
  const content = json.choices?.[0]?.message?.content ?? json.message?.content ?? '';
  return typeof content === 'string' ? sanitizeTitle(content) : null;
}

/**
 * Generates a title for a newly created chat and saves it.
 * Only replaces `placeholderTitle`, so a rename by the user in the meantime is kept.
 * Returns the saved title, or null if generation failed or the title was already changed.
 */
export async function generateChatTitle(
  chatId: number,
  message: string,
  placeholderTitle: string,
  modelInfo: TitleModelInfo
): Promise<string | null> {
  try {
    const title = await requestTitle(modelInfo, message);
    if (!title) return null;

    const result = await query(
      'UPDATE chats SET title = $2 WHERE id = $1 AND title = $3 RETURNING title',
      [chatId, title, placeholderTitle]
    );
    return result.rows.length > 0 ? title : null;
  } catch (err: any) {
    console.error('[Chat Title] Generation failed:', err?.message || err);
    return null;
  }
}
