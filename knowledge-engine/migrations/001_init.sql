-- Knowledge Engine schema (plan §5).
-- Run by `python -m knowledge.migrate`, which creates the engine schema (POSTGRES_SCHEMA,
-- default `knowledge`) and sets search_path to it first — so table names here are unqualified.
-- Every statement is idempotent; the migration is also recorded in schema_migrations.

CREATE TABLE IF NOT EXISTS documents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            TEXT NOT NULL,
  filename          TEXT NOT NULL,
  file_type         TEXT NOT NULL CHECK (file_type IN ('pdf','docx','pptx','txt','md')),
  mime              TEXT,
  size_bytes        BIGINT,
  storage_path      TEXT NOT NULL,
  file_hash         TEXT NOT NULL,              -- sha256
  description       TEXT NOT NULL,              -- the customer's description of the file
  tags              TEXT[] NOT NULL DEFAULT '{}',
  status            TEXT NOT NULL DEFAULT 'uploaded'
                    CHECK (status IN ('uploaded','extracting','chunking','embedding',
                                      'indexed','failed','needs_ocr','deleted')),
  quality_flag      TEXT CHECK (quality_flag IN ('ok','partial_garbled','garbled','needs_ocr')),
  error             TEXT,
  page_count        INT,
  chunk_count       INT,
  embed_model       TEXT,
  tokenizer_version TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, file_hash)
);

CREATE INDEX IF NOT EXISTS idx_documents_org_status ON documents (org_id, status);

CREATE TABLE IF NOT EXISTS ingestion_jobs (
  id            BIGSERIAL PRIMARY KEY,
  doc_id        UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL DEFAULT 'index' CHECK (kind IN ('index','reindex','delete')),
  state         TEXT NOT NULL DEFAULT 'queued' CHECK (state IN ('queued','running','done','failed')),
  attempts      INT NOT NULL DEFAULT 0,
  max_attempts  INT NOT NULL DEFAULT 5,
  run_after     TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at     TIMESTAMPTZ,
  last_error    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_state_run_after ON ingestion_jobs (state, run_after);
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_doc ON ingestion_jobs (doc_id);

-- MCP auth: one key maps to one org_id
CREATE TABLE IF NOT EXISTS api_keys (
  key_hash   TEXT PRIMARY KEY,                  -- sha256 of the key; plaintext is never stored
  org_id     TEXT NOT NULL,
  label      TEXT,
  revoked    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
