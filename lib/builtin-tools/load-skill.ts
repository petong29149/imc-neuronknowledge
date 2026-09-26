import { getActiveSkillBySlug } from '@/lib/skills';
import type { BuiltinTool } from '@/lib/builtin-tools/types';

export const loadSkillTool: BuiltinTool = {
  name: 'load_skill',
  label: 'โหลด Skill',
  definition: (ctx) => {
    if (ctx.skills.length === 0) return null;
    return {
      type: 'function',
      function: {
        name: 'load_skill',
        description:
          'Load the full instructions of a skill listed in the system prompt. Call this before starting a task ' +
          'that matches a skill, then follow the returned instructions. A loaded skill stays in the conversation, ' +
          'so do not load the same skill twice.',
        parameters: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              enum: ctx.skills.map((s) => s.slug),
              description: 'The skill name (slug) exactly as listed in the system prompt',
            },
          },
          required: ['name'],
        },
      },
    };
  },
  execute: async (args, ctx) => {
    const slug = typeof args.name === 'string' ? args.name.trim() : '';
    // The enum only guides the model; check again here so a call for a skill
    // outside this turn's list is refused rather than served.
    if (!ctx.skills.some((s) => s.slug === slug)) {
      const available = ctx.skills.map((s) => s.slug).join(', ') || '(none)';
      return {
        content: `Error: skill "${slug}" is not available. Available skills: ${available}`,
        isError: true,
      };
    }

    const skill = await getActiveSkillBySlug(slug);
    if (!skill) {
      return { content: `Error: skill "${slug}" was not found or is disabled.`, isError: true };
    }
    return {
      content: `<skill name="${skill.slug}">\n${skill.content}\n</skill>`,
      isError: false,
    };
  },
};
