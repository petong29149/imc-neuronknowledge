import { query } from '@/lib/db';
import { DEFAULT_PERSONA_PROMPT, DEFAULT_CORE_PROMPT } from '@/lib/system-prompt';

/** Prompt settings and the value used until an admin saves one. */
export const PROMPT_SETTING_DEFAULTS = {
  persona_prompt: DEFAULT_PERSONA_PROMPT,
  core_prompt: DEFAULT_CORE_PROMPT,
} as const;

export type PromptSettingKey = keyof typeof PROMPT_SETTING_DEFAULTS;
export const PROMPT_SETTING_MAX = 20000;

export function isPromptSettingKey(key: unknown): key is PromptSettingKey {
  return typeof key === 'string' && Object.prototype.hasOwnProperty.call(PROMPT_SETTING_DEFAULTS, key);
}

export interface PromptSetting {
  key: PromptSettingKey;
  value: string;
  /** false until an admin saves it; value is then the code default */
  is_customized: boolean;
  updated_at: string | null;
  updated_by_name: string | null;
}

// Read on every chat turn, so keep them briefly in memory; saves clear the cache
const CACHE_TTL_MS = 30_000;
let cache: { at: number; values: Record<PromptSettingKey, string> } | null = null;

/** Current persona and core prompts for the agent loop (cached ~30s). */
export async function getPromptValues(): Promise<Record<PromptSettingKey, string>> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.values;
  const settings = await getPromptSettings();
  const values = Object.fromEntries(settings.map((s) => [s.key, s.value])) as Record<
    PromptSettingKey,
    string
  >;
  cache = { at: Date.now(), values };
  return values;
}

/** Both prompt settings with who last changed them, for the admin console. */
export async function getPromptSettings(): Promise<PromptSetting[]> {
  const keys = Object.keys(PROMPT_SETTING_DEFAULTS) as PromptSettingKey[];
  const result = await query(
    `SELECT s.key, s.value, s.updated_at, u.name AS updated_by_name
     FROM app_settings s LEFT JOIN users u ON u.id = s.updated_by
     WHERE s.key = ANY($1::text[])`,
    [keys]
  );
  const rows = new Map(result.rows.map((r) => [r.key, r]));
  return keys.map((key) => {
    const row = rows.get(key);
    return {
      key,
      value: row ? row.value : PROMPT_SETTING_DEFAULTS[key],
      is_customized: Boolean(row),
      updated_at: row?.updated_at ?? null,
      updated_by_name: row?.updated_by_name ?? null,
    };
  });
}

/** Save a prompt setting and record the new version in prompt_revisions. */
export async function savePromptSetting(key: PromptSettingKey, value: string, userId: number | null) {
  await query(
    `INSERT INTO app_settings (key, value, updated_by, updated_at) VALUES ($1, $2, $3, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
    [key, value, userId]
  );
  await query('INSERT INTO prompt_revisions (key, value, updated_by) VALUES ($1, $2, $3)', [
    key,
    value,
    userId,
  ]);
  cache = null;
}

export async function getPromptRevisions(key: PromptSettingKey, limit = 30) {
  const result = await query(
    `SELECT r.id, r.key, r.value, r.created_at, u.name AS updated_by_name
     FROM prompt_revisions r LEFT JOIN users u ON u.id = r.updated_by
     WHERE r.key = $1 ORDER BY r.created_at DESC, r.id DESC LIMIT $2`,
    [key, limit]
  );
  return result.rows;
}
