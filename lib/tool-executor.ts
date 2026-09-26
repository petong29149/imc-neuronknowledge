import { getEnabledMCPTools, executeMCPTool, OpenAIToolDefinition } from '@/lib/mcp';
import {
  getBuiltinTool,
  getBuiltinToolDefinitions,
  type ToolContext,
  type ToolResult,
} from '@/lib/builtin-tools';

export interface TurnTools {
  /** Built-in tools first, then MCP tools; sent to the model as `tools` */
  tools: OpenAIToolDefinition[];
  /** Names of every tool offered this turn; calls outside it are refused */
  allowedNames: Set<string>;
  builtinNames: string[];
  mcpNames: string[];
}

/**
 * Resolve the tools offered for one turn. Built-in tools are always included;
 * MCP tools only when `mcpEnabled`, limited to `mcpToolIds` when given (the agent's bindings).
 */
export async function resolveTurnTools(
  ctx: ToolContext,
  mcpEnabled: boolean,
  mcpToolIds?: number[]
): Promise<TurnTools> {
  const builtinTools = getBuiltinToolDefinitions(ctx);
  const builtinNames = builtinTools.map((t) => t.function.name);

  let mcpTools: OpenAIToolDefinition[] = [];
  if (mcpEnabled && mcpToolIds?.length !== 0) {
    try {
      mcpTools = (await getEnabledMCPTools(mcpToolIds)).tools.filter((t) => {
        if (!getBuiltinTool(t.function.name)) return true;
        console.warn(
          `MCP tool "${t.function.name}" is skipped: the name is reserved for a built-in tool.`
        );
        return false;
      });
    } catch (err) {
      console.error('Error fetching MCP tools:', err);
    }
  }
  const mcpNames = mcpTools.map((t) => t.function.name);

  return {
    tools: [...builtinTools, ...mcpTools],
    allowedNames: new Set([...builtinNames, ...mcpNames]),
    builtinNames,
    mcpNames,
  };
}

/**
 * Run a tool call from the model. Built-in tools run in-process; everything else
 * goes to its MCP server. `allowedNames` is enforced here, on the server, because
 * the model can emit any tool name regardless of what it was offered.
 * Pass `allowedNames: null` to skip the check (admin test runs).
 */
export async function executeTool(
  name: string,
  args: Record<string, any>,
  ctx: ToolContext,
  allowedNames: Set<string> | null
): Promise<ToolResult & { server_name?: string }> {
  if (allowedNames && !allowedNames.has(name)) {
    return { content: `Error: Tool "${name}" is not available in this conversation.`, isError: true };
  }

  const builtin = getBuiltinTool(name);
  if (builtin) {
    try {
      return await builtin.execute(args, ctx);
    } catch (err: any) {
      return { content: `Error: ${err?.message || 'built-in tool failed'}`, isError: true };
    }
  }

  return executeMCPTool(name, args);
}
