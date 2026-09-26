import { query } from '@/lib/db';
import type { AuthUser } from '@/lib/auth';

export interface AgentRecord {
  id: number;
  slug: string;
  name: string;
  description: string;
  icon: string;
  system_prompt: string;
  default_model_id: number | null;
  is_active: boolean;
  is_default: boolean;
}

/** What the agent loop needs to scope one turn to an agent. */
export interface AgentRuntime {
  id: number;
  name: string;
  systemPrompt: string;
  skillIds: number[];
  mcpToolIds: number[];
}

type Viewer = Pick<AuthUser, 'id' | 'role'>;

/**
 * SQL condition: the agent is active and `viewer` may use it. Admins may use every
 * active agent; everyone else needs the agent to have no group restriction or to be
 * a member of one of its active groups. Params: $1 = user id, $2 = is admin.
 */
const ACCESS_CONDITION = `
  a.is_active = true AND (
    $2::boolean
    OR NOT EXISTS (SELECT 1 FROM agent_groups ag WHERE ag.agent_id = a.id)
    OR EXISTS (
      SELECT 1 FROM agent_groups ag
      JOIN groups g ON g.id = ag.group_id AND g.is_active = true
      JOIN group_members gm ON gm.group_id = ag.group_id
      WHERE ag.agent_id = a.id AND gm.user_id = $1
    )
  )`;

const AGENT_COLUMNS =
  'a.id, a.slug, a.name, a.description, a.icon, a.system_prompt, a.default_model_id, a.is_active, a.is_default';

/** Agents `viewer` may chat with, default first, with counts of usable skills and MCP tools. */
export async function getAccessibleAgents(viewer: Viewer) {
  const result = await query(
    `SELECT a.id, a.slug, a.name, a.description, a.icon, a.default_model_id, a.is_default,
       (SELECT COUNT(*) FROM agent_skills s JOIN skills sk ON sk.id = s.skill_id AND sk.is_active
        WHERE s.agent_id = a.id)::int AS skill_count,
       (SELECT COUNT(*) FROM agent_tools t
        JOIN mcp_tools mt ON mt.id = t.mcp_tool_id AND mt.is_enabled
        JOIN mcp_servers ms ON ms.id = mt.server_id AND ms.is_active
        WHERE t.agent_id = a.id)::int AS tool_count
     FROM agents a
     WHERE ${ACCESS_CONDITION}
     ORDER BY a.is_default DESC, a.name ASC`,
    [viewer.id, viewer.role === 'admin']
  );
  return result.rows;
}

/** The agent if `viewer` may use it, otherwise null (missing, inactive, or no access). */
export async function getAccessibleAgent(agentId: number, viewer: Viewer): Promise<AgentRecord | null> {
  const result = await query<AgentRecord>(
    `SELECT ${AGENT_COLUMNS} FROM agents a WHERE a.id = $3 AND ${ACCESS_CONDITION}`,
    [viewer.id, viewer.role === 'admin', agentId]
  );
  return result.rows[0] ?? null;
}

/** The default agent if `viewer` may use it, else the first agent they may use. */
export async function getDefaultAgent(viewer: Viewer): Promise<AgentRecord | null> {
  const result = await query<AgentRecord>(
    `SELECT ${AGENT_COLUMNS} FROM agents a WHERE ${ACCESS_CONDITION}
     ORDER BY a.is_default DESC, a.name ASC LIMIT 1`,
    [viewer.id, viewer.role === 'admin']
  );
  return result.rows[0] ?? null;
}

/** Load the agent's bindings for the agent loop. */
export async function getAgentRuntime(agent: AgentRecord): Promise<AgentRuntime> {
  const [skills, tools] = await Promise.all([
    query<{ skill_id: number }>('SELECT skill_id FROM agent_skills WHERE agent_id = $1', [agent.id]),
    query<{ mcp_tool_id: number }>('SELECT mcp_tool_id FROM agent_tools WHERE agent_id = $1', [
      agent.id,
    ]),
  ]);
  return {
    id: agent.id,
    name: agent.name,
    systemPrompt: agent.system_prompt,
    skillIds: skills.rows.map((r) => r.skill_id),
    mcpToolIds: tools.rows.map((r) => r.mcp_tool_id),
  };
}

/** Parse an array of ids from a request body; undefined when the field was not sent. */
export function parseIdList(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return [...new Set(value.map((v) => parseInt(String(v), 10)).filter((n) => !isNaN(n)))];
}

/**
 * Replace an agent's bindings for each list that was sent. Ids that do not
 * exist are skipped by the INSERT ... SELECT.
 */
export async function replaceAgentBindings(
  agentId: number,
  bindings: { skill_ids?: number[]; tool_ids?: number[]; group_ids?: number[] }
) {
  const tables = [
    { ids: bindings.skill_ids, table: 'agent_skills', column: 'skill_id', source: 'skills' },
    { ids: bindings.tool_ids, table: 'agent_tools', column: 'mcp_tool_id', source: 'mcp_tools' },
    { ids: bindings.group_ids, table: 'agent_groups', column: 'group_id', source: 'groups' },
  ];
  for (const { ids, table, column, source } of tables) {
    if (!ids) continue;
    await query(`DELETE FROM ${table} WHERE agent_id = $1`, [agentId]);
    if (ids.length > 0) {
      await query(
        `INSERT INTO ${table} (agent_id, ${column})
         SELECT $1, id FROM ${source} WHERE id = ANY($2::int[])
         ON CONFLICT DO NOTHING`,
        [agentId, ids]
      );
    }
  }
}
