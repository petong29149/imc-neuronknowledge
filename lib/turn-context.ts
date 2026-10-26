import { listActiveSkills } from '@/lib/skills';
import { getPromptValues } from '@/lib/settings';
import { resolveTurnTools, type TurnTools } from '@/lib/tool-executor';
import type { ToolContext } from '@/lib/builtin-tools';
import type { AgentRuntime } from '@/lib/agents';
import {
  buildSystemPrompt,
  buildSynthesisSystemPrompt,
  DEFAULT_CORE_PROMPT,
} from '@/lib/system-prompt';

/** Turn tools for a model that does not support tool calling */
export const NO_TURN_TOOLS: TurnTools = {
  tools: [],
  allowedNames: new Set(),
  builtinNames: [],
  mcpNames: [],
};

export interface TurnContextInput {
  agent: AgentRuntime | null;
  /** Per-chat prompt (chats.system_prompt) */
  chatPrompt?: string;
  /** Offer MCP tools (the chat's tools toggle) */
  mcpEnabled: boolean;
  /** false = the model gets no tools at all */
  toolsSupported: boolean;
  effortDirective?: string;
  userId?: number;
  chatId?: number;
  now?: Date;
}

/**
 * Everything one turn needs besides the history: the skills and tools offered,
 * and the system prompt builders. Shared by the agent loop and the admin preview
 * so the preview shows exactly what the model gets.
 */
export async function prepareTurnContext(input: TurnContextInput) {
  const { agent } = input;

  // Skills this turn may load: the agent's bound skills that are active
  let skills: ToolContext['skills'] = [];
  try {
    skills = await listActiveSkills(agent?.skillIds);
  } catch (err) {
    console.error('Error fetching skills:', err);
  }
  const toolCtx: ToolContext = { userId: input.userId, chatId: input.chatId, skills };

  // Built-in tools are always offered; MCP tools only when enabled, and only the agent's
  const turnTools = input.toolsSupported
    ? await resolveTurnTools(toolCtx, input.mcpEnabled, agent?.mcpToolIds)
    : NO_TURN_TOOLS;

  // Global prompts from the admin console (code defaults until an admin saves them)
  let globalPrompts: { core_prompt?: string; persona_prompt?: string } = {};
  try {
    globalPrompts = await getPromptValues();
  } catch (err) {
    console.error('Error fetching prompt settings:', err);
  }
  const identity = {
    corePrompt: globalPrompts.core_prompt ?? DEFAULT_CORE_PROMPT,
    personaPrompt: globalPrompts.persona_prompt,
    agentName: agent?.name,
    agentPrompt: agent?.systemPrompt,
    chatPrompt: input.chatPrompt,
  };
  const now = input.now ?? new Date();

  return {
    toolCtx,
    turnTools,
    /** Full system prompt; withTools=false drops the skill and tool sections */
    systemPromptFor: (withTools: boolean) =>
      buildSystemPrompt({
        ...identity,
        effortDirective: input.effortDirective,
        // Only list skills when load_skill was offered to load them
        skills: withTools && turnTools.builtinNames.includes('load_skill') ? skills : [],
        builtinToolNames: withTools ? turnTools.builtinNames : [],
        mcpToolNames: withTools ? turnTools.mcpNames : [],
        // Sources come only from MCP tool results
        citations: withTools && turnTools.mcpNames.length > 0,
        now,
      }),
    synthesisPrompt: () =>
      buildSynthesisSystemPrompt({ ...identity, citations: turnTools.mcpNames.length > 0, now }),
  };
}
