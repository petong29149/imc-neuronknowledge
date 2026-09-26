import { query } from '@/lib/db';
import {
  SKILL_SLUG_PATTERN,
  SKILL_SLUG_MAX,
  SKILL_DESCRIPTION_MAX,
  SKILL_CONTENT_MAX,
} from '@/lib/skills-constants';

export interface SkillRecord {
  id: number;
  slug: string;
  name: string;
  description: string;
  content: string;
  is_active: boolean;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

/** Summary shown in the system prompt; the full content is loaded through load_skill. */
export type SkillSummary = Pick<SkillRecord, 'id' | 'slug' | 'name' | 'description'>;

/**
 * Validate a skill payload. `partial` skips required checks for fields that
 * were not sent (PUT); returns the first error message in Thai, or null.
 */
export function validateSkillInput(body: any, partial = false): string | null {
  const has = (key: string) => body[key] !== undefined;

  if (!partial || has('slug')) {
    const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
    if (!slug) return 'กรุณากรอก slug ของ skill';
    if (slug.length > SKILL_SLUG_MAX) return `slug ต้องยาวไม่เกิน ${SKILL_SLUG_MAX} ตัวอักษร`;
    if (!SKILL_SLUG_PATTERN.test(slug)) {
      return 'slug ใช้ได้เฉพาะ a-z, 0-9 และขีดกลาง (-) เช่น meeting-summary';
    }
  }
  if (!partial || has('name')) {
    if (typeof body.name !== 'string' || !body.name.trim()) return 'กรุณากรอกชื่อ skill';
  }
  if (!partial || has('description')) {
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    if (!description) return 'กรุณากรอกคำอธิบายว่าควรใช้ skill นี้เมื่อใด';
    if (description.length > SKILL_DESCRIPTION_MAX) {
      return `คำอธิบายต้องยาวไม่เกิน ${SKILL_DESCRIPTION_MAX} ตัวอักษร`;
    }
  }
  if (!partial || has('content')) {
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    if (!content) return 'กรุณากรอกเนื้อหาคำสั่งของ skill';
    if (content.length > SKILL_CONTENT_MAX) {
      return `เนื้อหาต้องยาวไม่เกิน ${SKILL_CONTENT_MAX.toLocaleString()} ตัวอักษร`;
    }
  }
  return null;
}

/** Active skills, optionally limited to a set of ids (an agent's bound skills). */
export async function listActiveSkills(ids?: number[]): Promise<SkillSummary[]> {
  if (ids && ids.length === 0) return [];
  const result = ids
    ? await query<SkillSummary>(
        `SELECT id, slug, name, description FROM skills
         WHERE is_active = true AND id = ANY($1::int[]) ORDER BY slug`,
        [ids]
      )
    : await query<SkillSummary>(
        'SELECT id, slug, name, description FROM skills WHERE is_active = true ORDER BY slug'
      );
  return result.rows;
}

export async function getActiveSkillBySlug(slug: string): Promise<SkillRecord | null> {
  const result = await query<SkillRecord>(
    'SELECT * FROM skills WHERE slug = $1 AND is_active = true LIMIT 1',
    [slug]
  );
  return result.rows[0] ?? null;
}
