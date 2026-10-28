import { getEnabledMCPTools, executeMCPTool, MCPToolRef, OpenAIToolDefinition } from '@/lib/mcp';
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
  /** Offered MCP function name → the exact tool behind it (names can be `<server>__<tool>`) */
  mcpTools: Map<string, MCPToolRef>;
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
  const mcpRefs = new Map<string, MCPToolRef>();
  if (mcpEnabled && mcpToolIds?.length !== 0) {
    try {
      const enabled = await getEnabledMCPTools(mcpToolIds);
      mcpTools = enabled.tools.filter((t) => {
        if (!getBuiltinTool(t.function.name)) return true;
        console.warn(
          `MCP tool "${t.function.name}" is skipped: the name is reserved for a built-in tool.`
        );
        return false;
      });
      for (const t of mcpTools) {
        mcpRefs.set(t.function.name, enabled.toolMap.get(t.function.name)!);
      }
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
    mcpTools: mcpRefs,
  };
}

/**
 * Run a tool call from the model. Built-in tools run in-process; MCP tools run on the
 * server of the exact tool offered this turn (looked up in `turn.mcpTools`, never by name
 * across servers). The offered set is enforced here, on the server, because the model can
 * emit any tool name regardless of what it was offered.
 * Pass `turn: null` to run a built-in tool without that check (admin test runs).
 */
export async function executeTool(
  name: string,
  args: Record<string, any>,
  ctx: ToolContext,
  turn: Pick<TurnTools, 'allowedNames' | 'mcpTools'> | null
): Promise<ToolResult & { server_name?: string }> {
  if (turn && !turn.allowedNames.has(name)) {
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

  const ref = turn?.mcpTools.get(name);
  if (!ref) {
    return { content: `Error: Tool "${name}" is not available in this conversation.`, isError: true };
  }
  return executeMCPTool(ref.toolId, args);
}
