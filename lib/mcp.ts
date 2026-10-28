import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { CompatibilityCallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { query } from '@/lib/db';

export interface MCPServerRecord {
  id: number;
  name: string;
  transport_type: 'sse' | 'streamable_http' | 'stdio';
  url: string;
  command: string;
  args: string[] | string;
  env: Record<string, string> | string;
  headers: Record<string, string> | string;
  is_active: boolean;
  last_sync_at: string | null;
  status: 'connected' | 'error' | 'untested';
  error_message: string;
  created_at: string;
  updated_at: string;
  tool_count?: number;
  active_tool_count?: number;
}

export interface MCPToolRecord {
  id: number;
  server_id: number;
  server_name?: string;
  name: string;
  description: string;
  input_schema: any;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface OpenAIToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

/**
 * Default timeout for waiting for MCP tools to execute (10 minutes = 600,000 ms).
 * Can be configured via MCP_TOOL_TIMEOUT_MS environment variable.
 */
export const DEFAULT_TOOL_TIMEOUT_MS = parseInt(
  process.env.MCP_TOOL_TIMEOUT_MS || '600000',
  10
);

/**
 * Normalizes JSON/object fields stored in PostgreSQL
 */
function parseField<T>(field: any, defaultValue: T): T {
  if (!field) return defaultValue;
  if (typeof field === 'object') return field;
  try {
    return JSON.parse(field);
  } catch {
    return defaultValue;
  }
}

/**
 * Creates and initializes an MCP client for a given server configuration
 */
export async function createMCPClient(server: MCPServerRecord, timeoutMs = 15000): Promise<{
  client: Client;
  close: () => Promise<void>;
}> {
  const client = new Client(
    {
      name: 'NeuronKnowledge-MCP-Host',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  let transport: any = null;
  const headers = parseField<Record<string, string>>(server.headers, {});
  const env = parseField<Record<string, string>>(server.env, {});
  const rawArgs = server.args;

  const connectPromise = (async () => {
    if (server.transport_type === 'stdio') {
      const command = (server.command || '').trim();
      if (!command) {
        throw new Error('Command is required for Stdio transport');
      }

      // Convert args to array if needed
      const argsArray: string[] = Array.isArray(rawArgs)
        ? rawArgs
        : typeof rawArgs === 'string'
        ? (rawArgs as string).split(' ').filter(Boolean)
        : [];

      // Merge process environment with custom env
      const mergedEnv: Record<string, string> = {
        ...(process.env as Record<string, string>),
        ...env,
      };

      transport = new StdioClientTransport({
        command,
        args: argsArray,
        env: mergedEnv,
      });

      await client.connect(transport);
    } else if (server.transport_type === 'streamable_http' || (server.url && server.url.endsWith('/mcp'))) {
      const rawUrl = (server.url || '').trim();
      if (!rawUrl) {
        throw new Error('URL is required for Streamable HTTP transport');
      }

      const urlObj = new URL(rawUrl);

      transport = new StreamableHTTPClientTransport(urlObj, {
        requestInit: {
          headers: Object.keys(headers).length > 0 ? headers : undefined,
        },
      });

      await client.connect(transport);
    } else if (server.transport_type === 'sse') {
      const rawUrl = (server.url || '').trim();
      if (!rawUrl) {
        throw new Error('URL is required for SSE transport');
      }

      const urlObj = new URL(rawUrl);

      transport = new SSEClientTransport(urlObj, {
        eventSourceInit: Object.keys(headers).length > 0 ? ({ headers } as any) : undefined,
        requestInit: {
          headers: Object.keys(headers).length > 0 ? headers : undefined,
        },
      });

      try {
        await client.connect(transport);
      } catch (sseErr: any) {
        // If SSE returns 405 or fails, try StreamableHTTP as smart fallback
        if (sseErr.message?.includes('405') || sseErr.code === 405) {
          const streamableTransport = new StreamableHTTPClientTransport(urlObj, {
            requestInit: {
              headers: Object.keys(headers).length > 0 ? headers : undefined,
            },
          });
          await client.connect(streamableTransport);
          transport = streamableTransport;
        } else {
          throw sseErr;
        }
      }
    } else {
      throw new Error(`Unsupported transport type: ${server.transport_type}`);
    }

    return client;
  })();

  // Timeout guard
  const timer = new Promise<never>((_, reject) =>
    setTimeout(
      () =>
        reject(
          new Error(
            `Connection to MCP server "${server.name}" timed out after ${timeoutMs / 1000}s`
          )
        ),
      timeoutMs
    )
  );

  await Promise.race([connectPromise, timer]);

  const close = async () => {
    try {
      if (client) {
        await client.close().catch(() => {});
      }
      if (transport && typeof transport.close === 'function') {
        await transport.close().catch(() => {});
      }
    } catch {
      // Ignore cleanup errors
    }
  };

  return { client, close };
}

/**
 * Tests connection to an MCP server, fetches all available tools,
 * and synchronizes them into the database.
 */
export async function testAndSyncMCPServer(serverId: number) {
  const startTime = Date.now();
  const serverRes = await query('SELECT * FROM mcp_servers WHERE id = $1', [serverId]);
  if (serverRes.rows.length === 0) {
    throw new Error('MCP server not found');
  }

  const server: MCPServerRecord = serverRes.rows[0];

  try {
    const { client, close } = await createMCPClient(server, 15000);
    let tools: any[] = [];

    try {
      const toolsResult = await client.listTools();
      tools = toolsResult.tools || [];
    } finally {
      await close();
    }

    const latencyMs = Date.now() - startTime;

    // Upsert tools into database while preserving existing is_enabled settings
    for (const tool of tools) {
      await query(
        `INSERT INTO mcp_tools (server_id, name, description, input_schema, is_enabled, created_at, updated_at)
         VALUES ($1, $2, $3, $4, true, NOW(), NOW())
         ON CONFLICT (server_id, name)
         DO UPDATE SET
           description = EXCLUDED.description,
           input_schema = EXCLUDED.input_schema,
           updated_at = NOW()`,
        [
          serverId,
          tool.name,
          tool.description || '',
          JSON.stringify(tool.inputSchema || { type: 'object', properties: {} }),
        ]
      );
    }

    // Update server status
    await query(
      `UPDATE mcp_servers
       SET status = 'connected', error_message = '', last_sync_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [serverId]
    );

    // Fetch refreshed tool list
    const toolsInDb = await query(
      'SELECT * FROM mcp_tools WHERE server_id = $1 ORDER BY name ASC',
      [serverId]
    );

    return {
      success: true,
      server_id: serverId,
      server_name: server.name,
      tools_count: tools.length,
      latency_ms: latencyMs,
      tools: toolsInDb.rows,
    };
  } catch (err: any) {
    const errorMsg = err.message || 'Unknown MCP connection error';
    await query(
      `UPDATE mcp_servers
       SET status = 'error', error_message = $2, updated_at = NOW()
       WHERE id = $1`,
      [serverId, errorMsg]
    );

    return {
      success: false,
      server_id: serverId,
      server_name: server.name,
      error: errorMsg,
      latency_ms: Date.now() - startTime,
    };
  }
}

/** Where an MCP tool offered to the model really lives. */
export interface MCPToolRef {
  serverId: number;
  toolId: number;
  serverName: string;
  /** The tool's own name on its server (what callTool must send) */
  toolName: string;
}

const FUNCTION_NAME_MAX = 64;

/** A function name the model accepts: ^[a-zA-Z0-9_-]{1,64}$ */
function functionName(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'tool';
  return cleaned.slice(0, FUNCTION_NAME_MAX);
}

/**
 * Returns all active & enabled MCP tools formatted for OpenAI Function Calling,
 * limited to `allowedToolIds` when given (an agent's bound tools).
 *
 * Several servers can expose the same tool name (e.g. one Knowledge Engine server per
 * organization, each with `search_knowledge`). Such tools are offered as
 * `<server>__<tool>` so every function name is unique, and `toolMap` maps each offered
 * name back to the exact tool id — execution never looks a tool up by name alone.
 */
export async function getEnabledMCPTools(allowedToolIds?: number[]): Promise<{
  tools: OpenAIToolDefinition[];
  toolMap: Map<string, MCPToolRef>;
}> {
  const result = await query(
    `SELECT t.*, s.name as server_name, s.is_active as server_active
     FROM mcp_tools t
     JOIN mcp_servers s ON s.id = t.server_id
     WHERE s.is_active = true AND t.is_enabled = true
       AND ($1::int[] IS NULL OR t.id = ANY($1::int[]))
     ORDER BY s.id, t.name`,
    [allowedToolIds ?? null]
  );

  const nameCounts = new Map<string, number>();
  for (const row of result.rows) {
    nameCounts.set(row.name, (nameCounts.get(row.name) ?? 0) + 1);
  }

  const tools: OpenAIToolDefinition[] = [];
  const toolMap = new Map<string, MCPToolRef>();

  for (const row of result.rows) {
    const inputSchema = parseField(row.input_schema, { type: 'object', properties: {} });

    // Ensure parameters has type: "object"
    const parameters =
      inputSchema && typeof inputSchema === 'object' && inputSchema.type === 'object'
        ? inputSchema
        : { type: 'object', properties: {} };

    const shared = (nameCounts.get(row.name) ?? 0) > 1;
    let name = shared ? functionName(`${row.server_name}__${row.name}`) : row.name;
    if (toolMap.has(name)) {
      // Two servers whose names clean up to the same text: the tool id keeps them apart
      const suffix = `_${row.id}`;
      name = name.slice(0, FUNCTION_NAME_MAX - suffix.length) + suffix;
    }

    const description = row.description || `Tool provided by MCP Server [${row.server_name}]`;
    tools.push({
      type: 'function',
      function: {
        name,
        description: shared ? `[${row.server_name}] ${description}` : description,
        parameters,
      },
    });

    toolMap.set(name, {
      serverId: row.server_id,
      toolId: row.id,
      serverName: row.server_name,
      toolName: row.name,
    });
  }

  return { tools, toolMap };
}

/**
 * The tool id behind a bare tool name, for callers that only know the name (admin test runs).
 * Refuses when several active servers expose that name, rather than guessing.
 */
export async function findMCPToolIdByName(toolName: string): Promise<{ toolId?: number; error?: string }> {
  const result = await query<{ id: number }>(
    `SELECT t.id FROM mcp_tools t JOIN mcp_servers s ON s.id = t.server_id
     WHERE t.name = $1 AND s.is_active = true AND t.is_enabled = true`,
    [toolName]
  );
  if (result.rows.length === 0) return { error: `Tool "${toolName}" is not available or is currently disabled.` };
  if (result.rows.length > 1) {
    return { error: `Several MCP servers expose "${toolName}"; choose the tool by id.` };
  }
  return { toolId: result.rows[0].id };
}

/**
 * Executes one MCP tool, identified by its id, on the server it belongs to.
 * Supports long-running queries (e.g. database lookups) with a 10-minute timeout.
 */
export async function executeMCPTool(
  toolId: number,
  args: Record<string, any>,
  timeoutMs = DEFAULT_TOOL_TIMEOUT_MS
): Promise<{
  content: string;
  isError: boolean;
  server_name?: string;
}> {
  const toolResult = await query(
    `SELECT t.*, s.name as server_name, s.transport_type, s.url, s.command, s.args, s.env, s.headers, s.is_active
     FROM mcp_tools t
     JOIN mcp_servers s ON s.id = t.server_id
     WHERE t.id = $1 AND s.is_active = true AND t.is_enabled = true`,
    [toolId]
  );

  if (toolResult.rows.length === 0) {
    return {
      content: `Error: MCP tool #${toolId} is not available or is currently disabled.`,
      isError: true,
    };
  }

  const row = toolResult.rows[0];
  const toolName: string = row.name;
  const server: MCPServerRecord = {
    id: row.server_id,
    name: row.server_name,
    transport_type: row.transport_type,
    url: row.url,
    command: row.command,
    args: row.args,
    env: row.env,
    headers: row.headers,
    is_active: row.is_active,
    last_sync_at: null,
    status: 'connected',
    error_message: '',
    created_at: '',
    updated_at: '',
  };

  try {
    // 30 seconds connection handshake timeout, tool call runs with full timeoutMs (10 min)
    const { client, close } = await createMCPClient(server, 30000);

    try {
      const callPromise = client.callTool(
        {
          name: toolName,
          arguments: args,
        },
        CompatibilityCallToolResultSchema,
        {
          timeout: timeoutMs,
        }
      );

      const timer = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Tool "${toolName}" execution timed out after ${Math.round(timeoutMs / 1000 / 60)} minutes`)),
          timeoutMs
        )
      );

      const result: any = await Promise.race([callPromise, timer]);

      // Result formatting
      let outputText = '';
      if (result.content && Array.isArray(result.content)) {
        outputText = result.content
          .map((item: any) => {
            if (item.type === 'text') return item.text;
            if (item.type === 'image') return `[Image: ${item.mimeType || 'unknown'}]`;
            if (item.type === 'resource') return `[Resource: ${item.resource?.uri || ''}]`;
            return JSON.stringify(item);
          })
          .join('\n');
      } else if (typeof result === 'string') {
        outputText = result;
      } else {
        outputText = JSON.stringify(result, null, 2);
      }

      return {
        content: outputText || 'Tool executed successfully with no output.',
        isError: !!result.isError,
        server_name: server.name,
      };
    } finally {
      await close();
    }
  } catch (err: any) {
    return {
      content: `Error executing tool "${toolName}": ${err.message || 'Unknown error'}`,
      isError: true,
      server_name: server.name,
    };
  }
}
