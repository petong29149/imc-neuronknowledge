/** Agent validation, shared by the admin API and the admin form (no server imports). */
export const AGENT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const AGENT_PROMPT_MAX = 20000;

/**
 * Validate an agent payload. `partial` skips required checks for fields that
 * were not sent (PUT); returns the first error message in Thai, or null.
 */
export function validateAgentInput(body: any, partial = false): string | null {
  const has = (key: string) => body[key] !== undefined;

  if (!partial || has('slug')) {
    const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
    if (!slug) return 'กรุณากรอก slug ของ agent';
    if (slug.length > 100) return 'slug ต้องยาวไม่เกิน 100 ตัวอักษร';
    if (!AGENT_SLUG_PATTERN.test(slug)) {
      return 'slug ใช้ได้เฉพาะ a-z, 0-9 และขีดกลาง (-) เช่น sales-assistant';
    }
  }
  if (!partial || has('name')) {
    if (typeof body.name !== 'string' || !body.name.trim()) return 'กรุณากรอกชื่อ agent';
  }
  if (has('icon') && (typeof body.icon !== 'string' || [...body.icon.trim()].length > 4)) {
    return 'ไอคอนต้องเป็นอีโมจิ 1 ตัว';
  }
  if (has('system_prompt')) {
    if (typeof body.system_prompt !== 'string') return 'system prompt ไม่ถูกต้อง';
    if (body.system_prompt.length > AGENT_PROMPT_MAX) {
      return `system prompt ต้องยาวไม่เกิน ${AGENT_PROMPT_MAX.toLocaleString()} ตัวอักษร`;
    }
  }
  if (
    has('default_model_id') &&
    body.default_model_id !== null &&
    isNaN(parseInt(body.default_model_id, 10))
  ) {
    return 'Model เริ่มต้นไม่ถูกต้อง';
  }
  return null;
}
