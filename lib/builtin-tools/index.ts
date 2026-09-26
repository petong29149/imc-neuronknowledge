import type { OpenAIToolDefinition } from '@/lib/mcp';
import { calculatorTool } from '@/lib/builtin-tools/calculator';
import { loadSkillTool } from '@/lib/builtin-tools/load-skill';
import type { BuiltinTool, ToolContext } from '@/lib/builtin-tools/types';

export type { BuiltinTool, ToolContext, ToolResult } from '@/lib/builtin-tools/types';

/**
 * Tools that run in-process and are available to every agent. The code here is
 * the source of truth; they are not stored in the database. Their names are
 * reserved: an MCP tool with the same name is dropped.
 */
export const BUILTIN_TOOLS: Record<string, BuiltinTool> = {
  [calculatorTool.name]: calculatorTool,
  [loadSkillTool.name]: loadSkillTool,
};

export function getBuiltinTool(name: string): BuiltinTool | undefined {
  return Object.prototype.hasOwnProperty.call(BUILTIN_TOOLS, name) ? BUILTIN_TOOLS[name] : undefined;
}

/** Definitions of the built-in tools that apply to this turn. */
export function getBuiltinToolDefinitions(ctx: ToolContext): OpenAIToolDefinition[] {
  return Object.values(BUILTIN_TOOLS)
    .map((tool) => tool.definition(ctx))
    .filter((def): def is OpenAIToolDefinition => def !== null);
}
