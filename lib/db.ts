import { Pool, QueryResult, QueryResultRow } from 'pg';

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
  `);
}
