import { Pool, QueryResult, QueryResultRow } from 'pg';
import { SAMPLE_SKILLS, DEFAULT_AGENT } from '@/lib/seed-data';
import type { CitationSource } from '@/lib/citations';

// Global singleton pool for Next.js hot reload support in development
declare global {
  // eslint-disable-next-line no-var
  var __postgres_pool: Pool | undefined;
}

export function getPool(): Pool {
  if (!global.__postgres_pool) {
    const connectionString =
      process.env.POSTGRES_URL ||
      'postgres://postgres:1234@localhost:5432/imc-neuronknowledge';

    global.__postgres_pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return global.__postgres_pool;
}

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const pool = getPool();
  return pool.query<T>(text, params);
}

/**
 * Chat message shape stored inside the `chat_history` JSONB array.
 *
 * Each element represents a single turn in the conversation.
 */
export interface ChatHistoryMessage {
  /** A unique id within the session (UUIDv4 or nanoid) */
  id: string;
  /** 'user' | 'assistant' | 'system' | 'tool' */
  role: string;
  /** The text/markdown body of the message */
  content: string;
  /** Database PK of the model used for this turn (null for user/tool) */
  model_id: number | null;
  /** Display name of the model at the time of generation */
  model_name: string | null;
  /** OpenAI-compatible tool_calls array (only for assistant turns) */
  tool_calls: any[] | null;
  /** The tool_call_id this message responds to (only for tool turns) */
  tool_call_id: string | null;
  /** Tool name (only for tool turns) */
  name: string | null;
  /** 'stop' | 'tool_calls' | 'length' | etc. */
  finish_reason: string | null;
  /** Effort level selected when this turn was sent (user + assistant turns; null for tool) */
  effort_level: string | null;
  /**
   * Token usage reported by the provider for the LLM call that produced this turn
   * (assistant turns only; null when the provider did not report usage).
   */
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  /** Reasoning / thinking tokens (e.g. DeepSeek-R1, Qwen) */
  reasoning_content: string | null;
  /** Numbered sources extracted from an MCP tool result (tool turns only); see lib/citations.ts */
  sources?: CitationSource[] | null;
  /** ISO-8601 timestamp of when this turn was created */
  created_at: string;
}

// Ensures all application tables and indexes exist
export async function ensureDatabaseSchema() {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'user',
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

    -- User groups (a user can belong to many groups)
    CREATE TABLE IF NOT EXISTS groups (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT DEFAULT '',
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Case-insensitive uniqueness: "Sales" and "sales" are the same group
    CREATE UNIQUE INDEX IF NOT EXISTS idx_groups_name_lower ON groups(LOWER(name));
    CREATE INDEX IF NOT EXISTS idx_groups_active ON groups(is_active);

    -- Membership join table between users and groups
    CREATE TABLE IF NOT EXISTS group_members (
      id SERIAL PRIMARY KEY,
      group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      -- 'owner' can be treated as the group lead; everyone else is 'member'
      member_role VARCHAR(50) NOT NULL DEFAULT 'member',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_group_members_group_user
      ON group_members(group_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);

    -- LLM Connection configurations (OpenAI-compatible / Ollama endpoints)
    CREATE TABLE IF NOT EXISTS llm_connections (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      provider VARCHAR(50) NOT NULL DEFAULT 'openai',
      base_url TEXT NOT NULL,
      api_key TEXT DEFAULT '',
      is_active BOOLEAN NOT NULL DEFAULT true,
      priority INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Models registry with per-model configuration
    CREATE TABLE IF NOT EXISTS models (
      id SERIAL PRIMARY KEY,
      connection_id INTEGER REFERENCES llm_connections(id) ON DELETE CASCADE,
      model_id VARCHAR(512) NOT NULL,
      display_name VARCHAR(255) NOT NULL,
      description TEXT DEFAULT '',
      context_length INTEGER DEFAULT 4096,
      max_tokens INTEGER DEFAULT 2048,
      temperature REAL DEFAULT 0.7,
      top_p REAL DEFAULT 1.0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      is_default BOOLEAN NOT NULL DEFAULT false,
      capabilities JSONB DEFAULT '[]',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_models_connection ON models(connection_id);
    CREATE INDEX IF NOT EXISTS idx_models_active ON models(is_active);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_models_conn_model_id ON models(connection_id, model_id);

    -- false = the model/endpoint does not accept tool calling; chats with it get no tools
    ALTER TABLE models ADD COLUMN IF NOT EXISTS supports_tools BOOLEAN NOT NULL DEFAULT true;

    -- Unified chats table: each row = one chat session
    CREATE TABLE IF NOT EXISTS chats (
      id SERIAL PRIMARY KEY,
      session_id UUID NOT NULL DEFAULT gen_random_uuid(),
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(500) NOT NULL DEFAULT 'New Chat',
      model_id INTEGER REFERENCES models(id) ON DELETE SET NULL,
      system_prompt TEXT DEFAULT '',
      -- Last selected effort level (restored in the UI); per-turn values live in chat_history
      effort_level VARCHAR(50) DEFAULT 'medium',
      tools_enabled BOOLEAN DEFAULT true,
      is_archived BOOLEAN NOT NULL DEFAULT false,
      chat_history JSONB NOT NULL DEFAULT '[]',
      user_message_count INTEGER NOT NULL DEFAULT 0,
      total_input_tokens BIGINT NOT NULL DEFAULT 0,
      total_output_tokens BIGINT NOT NULL DEFAULT 0,
      total_tokens BIGINT NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Token usage totals for chats created before these columns existed
    ALTER TABLE chats ADD COLUMN IF NOT EXISTS total_input_tokens BIGINT NOT NULL DEFAULT 0;
    ALTER TABLE chats ADD COLUMN IF NOT EXISTS total_output_tokens BIGINT NOT NULL DEFAULT 0;
    ALTER TABLE chats ADD COLUMN IF NOT EXISTS total_tokens BIGINT NOT NULL DEFAULT 0;

    -- Legacy message_count counted every chat_history entry (incl. tool turns);
    -- rename it and recount only user messages
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'chats' AND column_name = 'message_count'
      ) THEN
        ALTER TABLE chats RENAME COLUMN message_count TO user_message_count;
        UPDATE chats SET user_message_count = (
          SELECT COUNT(*) FROM jsonb_array_elements(chat_history) m WHERE m->>'role' = 'user'
        );
      END IF;
    END $$;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_chats_session_id ON chats(session_id);
    CREATE INDEX IF NOT EXISTS idx_chats_user ON chats(user_id);
    CREATE INDEX IF NOT EXISTS idx_chats_updated ON chats(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_chats_user_updated ON chats(user_id, updated_at DESC, id DESC);

    -- MCP Servers table
    CREATE TABLE IF NOT EXISTS mcp_servers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      transport_type VARCHAR(50) NOT NULL DEFAULT 'sse',
      url TEXT DEFAULT '',
      command TEXT DEFAULT '',
      args JSONB DEFAULT '[]',
      env JSONB DEFAULT '{}',
      headers JSONB DEFAULT '{}',
      is_active BOOLEAN NOT NULL DEFAULT true,
      last_sync_at TIMESTAMP WITH TIME ZONE,
      status VARCHAR(50) DEFAULT 'untested',
      error_message TEXT DEFAULT '',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_mcp_servers_active ON mcp_servers(is_active);

    -- MCP Tools table
    CREATE TABLE IF NOT EXISTS mcp_tools (
      id SERIAL PRIMARY KEY,
      server_id INTEGER REFERENCES mcp_servers(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT DEFAULT '',
      input_schema JSONB DEFAULT '{}',
      is_enabled BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_mcp_tools_server ON mcp_tools(server_id);
    CREATE INDEX IF NOT EXISTS idx_mcp_tools_enabled ON mcp_tools(is_enabled);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_mcp_tools_server_name ON mcp_tools(server_id, name);

    -- Skills: instruction packs the model loads on demand through the load_skill tool.
    -- Only slug + description go into the system prompt; content is loaded when needed.
    CREATE TABLE IF NOT EXISTS skills (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(100) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_skills_active ON skills(is_active);

    -- AI agents: a persona prompt plus the skills and MCP tools it may use.
    -- Built-in tools are available to every agent and are not bound here.
    CREATE TABLE IF NOT EXISTS agents (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(100) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      icon VARCHAR(16) NOT NULL DEFAULT '🤖',
      system_prompt TEXT NOT NULL DEFAULT '',
      default_model_id INTEGER REFERENCES models(id) ON DELETE SET NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      is_default BOOLEAN NOT NULL DEFAULT false,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- At most one default agent (used for new chats with no agent picked, and legacy chats)
    CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_single_default ON agents(is_default) WHERE is_default;

    CREATE TABLE IF NOT EXISTS agent_skills (
      agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
      PRIMARY KEY (agent_id, skill_id)
    );

    CREATE TABLE IF NOT EXISTS agent_tools (
      agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      mcp_tool_id INTEGER NOT NULL REFERENCES mcp_tools(id) ON DELETE CASCADE,
      PRIMARY KEY (agent_id, mcp_tool_id)
    );

    -- An agent with no rows here is open to everyone; otherwise only to members of these groups
    CREATE TABLE IF NOT EXISTS agent_groups (
      agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      PRIMARY KEY (agent_id, group_id)
    );

    CREATE INDEX IF NOT EXISTS idx_agent_groups_group ON agent_groups(group_id);

    -- The agent a chat was started with; fixed for the life of the chat
    ALTER TABLE chats ADD COLUMN IF NOT EXISTS agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL;

    -- Global key/value settings (persona_prompt, core_prompt)
    CREATE TABLE IF NOT EXISTS app_settings (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT NOT NULL DEFAULT '',
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Every saved version of a prompt setting, for audit and rollback
    CREATE TABLE IF NOT EXISTS prompt_revisions (
      id SERIAL PRIMARY KEY,
      key VARCHAR(100) NOT NULL,
      value TEXT NOT NULL,
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_prompt_revisions_key ON prompt_revisions(key, created_at DESC);
  `);

  await seedDefaults();
}

declare global {
  // eslint-disable-next-line no-var
  var __defaults_seeded: boolean | undefined;
}

/**
 * Seed sample data once per process: the sample skills into an empty skills table,
 * then a default agent bound to every skill and MCP tool into an empty agents table.
 * Only empty tables are seeded, so rows an admin deletes stay deleted.
 */
async function seedDefaults() {
  if (global.__defaults_seeded) return;
  await query(
    `INSERT INTO skills (slug, name, description, content)
     SELECT s.slug, s.name, s.description, s.content
     FROM jsonb_to_recordset($1::jsonb) AS s(slug TEXT, name TEXT, description TEXT, content TEXT)
     WHERE NOT EXISTS (SELECT 1 FROM skills)
     ON CONFLICT (slug) DO NOTHING`,
    [JSON.stringify(SAMPLE_SKILLS)]
  );

  const agent = await query(
    `INSERT INTO agents (slug, name, description, icon, system_prompt, is_default)
     SELECT $1, $2, $3, $4, $5, true
     WHERE NOT EXISTS (SELECT 1 FROM agents)
     ON CONFLICT (slug) DO NOTHING
     RETURNING id`,
    [
      DEFAULT_AGENT.slug,
      DEFAULT_AGENT.name,
      DEFAULT_AGENT.description,
      DEFAULT_AGENT.icon,
      DEFAULT_AGENT.system_prompt,
    ]
  );
  if (agent.rows.length > 0) {
    // Bind everything that exists today, so chats keep the skills and MCP tools
    // they had before agents were introduced
    await query(
      `INSERT INTO agent_skills (agent_id, skill_id)
       SELECT $1, id FROM skills ON CONFLICT DO NOTHING`,
      [agent.rows[0].id]
    );
    await query(
      `INSERT INTO agent_tools (agent_id, mcp_tool_id)
       SELECT $1, id FROM mcp_tools ON CONFLICT DO NOTHING`,
      [agent.rows[0].id]
    );
  }
  global.__defaults_seeded = true;
}
