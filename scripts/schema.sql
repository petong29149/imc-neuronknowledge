-- Database schema for NeuronKnowledge Agent & Knowledge Base

-----------------------------------
----------- users table -----------
-----------------------------------
CREATE TABLE IF NOT EXISTS public.users
(
    id integer NOT NULL DEFAULT nextval('users_id_seq'::regclass),
    name character varying(255) COLLATE pg_catalog."default" NOT NULL,
    email character varying(255) COLLATE pg_catalog."default" NOT NULL,
    password_hash character varying(255) COLLATE pg_catalog."default" NOT NULL,
    role character varying(50) COLLATE pg_catalog."default" NOT NULL DEFAULT 'user'::character varying,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_email_key UNIQUE (email)
);

-- Index: idx_users_email

-- DROP INDEX IF EXISTS public.idx_users_email;

CREATE INDEX IF NOT EXISTS idx_users_email
    ON public.users USING btree
    (email COLLATE pg_catalog."default" ASC NULLS LAST);

-----------------------------------
----------- models table ----------
-----------------------------------
CREATE TABLE IF NOT EXISTS public.models
(
    id integer NOT NULL DEFAULT nextval('models_id_seq'::regclass),
    connection_id integer,
    model_id character varying(512) COLLATE pg_catalog."default" NOT NULL,
    display_name character varying(255) COLLATE pg_catalog."default" NOT NULL,
    description text COLLATE pg_catalog."default" DEFAULT ''::text,
    context_length integer DEFAULT 4096,
    max_tokens integer DEFAULT 2048,
    temperature real DEFAULT 0.7,
    top_p real DEFAULT 1.0,
    is_active boolean NOT NULL DEFAULT true,
    is_default boolean NOT NULL DEFAULT false,
    capabilities jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT models_pkey PRIMARY KEY (id),
    CONSTRAINT models_connection_id_fkey FOREIGN KEY (connection_id)
        REFERENCES public.llm_connections (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);

-- Index: idx_models_active

CREATE INDEX IF NOT EXISTS idx_models_active
    ON public.models USING btree
    (is_active ASC NULLS LAST);

-- Index: idx_models_conn_model_id

CREATE UNIQUE INDEX IF NOT EXISTS idx_models_conn_model_id
    ON public.models USING btree
    (connection_id ASC NULLS LAST, model_id COLLATE pg_catalog."default" ASC NULLS LAST);

-- Index: idx_models_connection

CREATE INDEX IF NOT EXISTS idx_models_connection
    ON public.models USING btree
    (connection_id ASC NULLS LAST);

-----------------------------------
------------ mcp servers ----------
-----------------------------------
CREATE TABLE IF NOT EXISTS public.mcp_servers
(
    id integer NOT NULL DEFAULT nextval('mcp_servers_id_seq'::regclass),
    name character varying(255) COLLATE pg_catalog."default" NOT NULL,
    transport_type character varying(50) COLLATE pg_catalog."default" NOT NULL DEFAULT 'sse'::character varying,
    url text COLLATE pg_catalog."default" DEFAULT ''::text,
    command text COLLATE pg_catalog."default" DEFAULT ''::text,
    args jsonb DEFAULT '[]'::jsonb,
    env jsonb DEFAULT '{}'::jsonb,
    headers jsonb DEFAULT '{}'::jsonb,
    is_active boolean NOT NULL DEFAULT true,
    last_sync_at timestamp with time zone,
    status character varying(50) COLLATE pg_catalog."default" DEFAULT 'untested'::character varying,
    error_message text COLLATE pg_catalog."default" DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT mcp_servers_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_mcp_servers_active
    ON public.mcp_servers USING btree
    (is_active ASC NULLS LAST);

-----------------------------------
----------- mcp tools -------------
-----------------------------------
CREATE TABLE IF NOT EXISTS public.mcp_tools
(
    id integer NOT NULL DEFAULT nextval('mcp_tools_id_seq'::regclass),
    server_id integer,
    name character varying(255) COLLATE pg_catalog."default" NOT NULL,
    description text COLLATE pg_catalog."default" DEFAULT ''::text,
    input_schema jsonb DEFAULT '{}'::jsonb,
    is_enabled boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT mcp_tools_pkey PRIMARY KEY (id),
    CONSTRAINT mcp_tools_server_id_fkey FOREIGN KEY (server_id)
        REFERENCES public.mcp_servers (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mcp_tools_enabled
    ON public.mcp_tools USING btree
    (is_enabled ASC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_mcp_tools_server
    ON public.mcp_tools USING btree
    (server_id ASC NULLS LAST);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mcp_tools_server_name
    ON public.mcp_tools USING btree
    (server_id ASC NULLS LAST, name COLLATE pg_catalog."default" ASC NULLS LAST);

-----------------------------------
----------- chats -----------------
-----------------------------------
CREATE TABLE IF NOT EXISTS public.chats
(
    id integer NOT NULL DEFAULT nextval('chats_id_seq'::regclass),
    session_id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id integer,
    title character varying(500) COLLATE pg_catalog."default" NOT NULL DEFAULT 'New Chat'::character varying,
    model_id integer,
    system_prompt text COLLATE pg_catalog."default" DEFAULT ''::text,
    -- Last selected effort level (restored in the UI); per-turn values live in chat_history
    effort_level character varying(50) COLLATE pg_catalog."default" DEFAULT 'medium'::character varying,
    tools_enabled boolean DEFAULT true,
    is_archived boolean NOT NULL DEFAULT false,
    chat_history jsonb NOT NULL DEFAULT '[]'::jsonb,
    user_message_count integer NOT NULL DEFAULT 0,
    total_input_tokens bigint NOT NULL DEFAULT 0,
    total_output_tokens bigint NOT NULL DEFAULT 0,
    total_tokens bigint NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chats_pkey PRIMARY KEY (id),
    CONSTRAINT chats_model_id_fkey FOREIGN KEY (model_id)
        REFERENCES public.models (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL,
    CONSTRAINT chats_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chats_session_id
    ON public.chats USING btree
    (session_id ASC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_chats_updated
    ON public.chats USING btree
    (updated_at DESC NULLS FIRST);

CREATE INDEX IF NOT EXISTS idx_chats_user
    ON public.chats USING btree
    (user_id ASC NULLS LAST);
-----------------------------------
----------- groups ----------------
-----------------------------------
CREATE TABLE IF NOT EXISTS public.groups
(
    id integer NOT NULL DEFAULT nextval('groups_id_seq'::regclass),
    name character varying(255) COLLATE pg_catalog."default" NOT NULL,
    description text COLLATE pg_catalog."default" DEFAULT ''::text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT groups_pkey PRIMARY KEY (id)
);

-- Case-insensitive uniqueness: "Sales" and "sales" are the same group
CREATE UNIQUE INDEX IF NOT EXISTS idx_groups_name_lower
    ON public.groups USING btree
    (lower(name::text) COLLATE pg_catalog."default" ASC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_groups_active
    ON public.groups USING btree
    (is_active ASC NULLS LAST);

-----------------------------------
--------- group members -----------
-----------------------------------
CREATE TABLE IF NOT EXISTS public.group_members
(
    id integer NOT NULL DEFAULT nextval('group_members_id_seq'::regclass),
    group_id integer NOT NULL,
    user_id integer NOT NULL,
    -- 'owner' can be treated as the group lead; everyone else is 'member'
    member_role character varying(50) COLLATE pg_catalog."default" NOT NULL DEFAULT 'member'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT group_members_pkey PRIMARY KEY (id),
    CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id)
        REFERENCES public.groups (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT group_members_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_group_members_group_user
    ON public.group_members USING btree
    (group_id ASC NULLS LAST, user_id ASC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_group_members_user
    ON public.group_members USING btree
    (user_id ASC NULLS LAST);
