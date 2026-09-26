/** Skill validation limits, shared by the API (lib/skills.ts) and the admin form. */
export const SKILL_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SKILL_SLUG_MAX = 100;
export const SKILL_DESCRIPTION_MAX = 300;
export const SKILL_CONTENT_MAX = 20000;
