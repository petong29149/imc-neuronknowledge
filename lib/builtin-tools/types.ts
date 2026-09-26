import type { OpenAIToolDefinition } from '@/lib/mcp';
import type { SkillSummary } from '@/lib/skills';

/** Per-turn context handed to built-in tools. */
export interface ToolContext {
  userId?: number;
  chatId?: number;
  /** Skills this turn may load (the agent's bound, active skills) */
  skills: SkillSummary[];
}

/** Same shape executeMCPTool returns, so the agent loop treats both sources alike. */
export interface ToolResult {
  content: string;
  isError: boolean;
}

export interface BuiltinTool {
  name: string;
  /** Thai label for the admin console and status messages */
  label: string;
  /**
   * OpenAI function definition for this turn, or null when the tool does not
   * apply (e.g. load_skill with no skills to load).
   */
  definition: (ctx: ToolContext) => OpenAIToolDefinition | null;
  execute: (args: Record<string, any>, ctx: ToolContext) => Promise<ToolResult>;
}
