# Data model ของ Studio (ร่าง สำหรับ CORE-01)

ตารางใหม่ทั้งหมดของ Studio, Agent Catalog และ Activity Log อยู่ที่นี่ที่เดียว ทุกหน้าใช้ type ตรงกับ `lib/studio/types.ts`

- **เจ้าของ:** CORE-01 (Maintainers) เป็นคนเดียวที่สร้าง migration จริง หน้าอื่นที่ต้องการคอลัมน์หรือตารางเพิ่ม ให้เสนอใน Spec ข้อ 5 แล้วให้ CORE-01 รวม
- **สถานะ:** ร่าง ยังไม่ได้รันกับ DB ไหนเลย
- **ห้ามรันกับ DB ใน `.env`:** เป็น DB ที่ใช้ร่วมกัน ดู D-004
- **การตัดสินใจที่ยังเปิด:** vector store ระหว่าง pgvector กับ Qdrant ร่างนี้สมมติว่าใช้ pgvector และ embedding ขนาด 1024 มิติ (เช่น bge-m3) ถ้าเปลี่ยนเป็น Qdrant ตาราง `knowledge_chunks` จะเหลือแค่ metadata

## ภาพรวมความสัมพันธ์

```
data_connections 1─* knowledge_sources *─1 knowledge_sets 1─* use_cases 1─* use_case_examples
                         │                      │
                         1                      *
                         *               agent_knowledge_sets
                   knowledge_chunks             *
                                                1
                    agents (ตารางเดิม) 1─* agent_prompt_versions
                                       1─* eval_runs 1─* eval_results
chats (ตารางเดิม) 1─* message_feedback        activity_logs (ทุกบทบาท)
```

## SQL ร่าง

```sql
-- pgvector (ต้องเปิดบน DB ของ staging/production ก่อน)
CREATE EXTENSION IF NOT EXISTS vector;

-- S02 Data Connections — รหัสผ่านเข้ารหัสด้วย AES-256-GCM key จาก env STUDIO_SECRET_KEY
CREATE TABLE data_connections (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('postgresql', 'mysql', 'mssql')),
  host VARCHAR(255) NOT NULL,
  port INTEGER NOT NULL,
  database_name VARCHAR(255) NOT NULL,
  username VARCHAR(255) NOT NULL,
  password_encrypted TEXT,
  ssl_mode VARCHAR(20) NOT NULL DEFAULT 'prefer',
  read_only_verified BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'untested' CHECK (status IN ('untested', 'ok', 'error')),
  last_error TEXT,
  last_tested_at TIMESTAMPTZ,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- S03 Knowledge Sets
CREATE TABLE knowledge_sets (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(100) NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  embedding_model VARCHAR(255) NOT NULL,
  rag_settings JSONB NOT NULL,           -- RagSettings
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'building', 'ready', 'error')),
  version INTEGER NOT NULL DEFAULT 1,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE knowledge_sources (
  id SERIAL PRIMARY KEY,
  knowledge_set_id INTEGER NOT NULL REFERENCES knowledge_sets(id) ON DELETE CASCADE,
  kind VARCHAR(20) NOT NULL CHECK (kind IN ('file', 'db_table', 'mcp_tool')),
  mode VARCHAR(10) NOT NULL CHECK (mode IN ('index', 'live')),
  name VARCHAR(255) NOT NULL,
  file_name VARCHAR(500),
  mime_type VARCHAR(255),
  size_bytes BIGINT,
  storage_path TEXT,                      -- ที่เก็บไฟล์ต้นฉบับ (ตัดสินใน CORE-02)
  connection_id INTEGER REFERENCES data_connections(id) ON DELETE SET NULL,
  table_name VARCHAR(255),
  columns JSONB,                          -- คอลัมน์ที่อนุญาตให้อ่าน
  mcp_tool_id INTEGER REFERENCES mcp_tools(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'error')),
  chunk_count INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (kind <> 'file' OR mode = 'index'),
  CHECK (kind <> 'mcp_tool' OR mode = 'live')
);

-- CORE-02 เขียนตารางนี้ หน้าอื่นอ่านผ่าน lib/knowledge เท่านั้น
CREATE TABLE knowledge_chunks (
  id BIGSERIAL PRIMARY KEY,
  knowledge_set_id INTEGER NOT NULL REFERENCES knowledge_sets(id) ON DELETE CASCADE,
  source_id INTEGER NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_segmented TEXT NOT NULL,        -- ข้อความที่ตัดคำไทยแล้ว (คั่นด้วยช่องว่าง) สำหรับ keyword search
  content_tsv TSVECTOR GENERATED ALWAYS AS (to_tsvector('simple', content_segmented)) STORED,
  embedding VECTOR(1024),
  locator VARCHAR(255) NOT NULL DEFAULT '', -- หน้า, sheet/row, primary key
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON knowledge_chunks USING GIN (content_tsv);
CREATE INDEX ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON knowledge_chunks (knowledge_set_id);

CREATE TABLE ingestion_jobs (
  id SERIAL PRIMARY KEY,
  knowledge_set_id INTEGER NOT NULL REFERENCES knowledge_sets(id) ON DELETE CASCADE,
  source_id INTEGER REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('index', 'reindex', 'delete')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'error')),
  progress INTEGER NOT NULL DEFAULT 0,    -- 0–100
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

-- S04 Use Cases
CREATE TABLE use_cases (
  id SERIAL PRIMARY KEY,
  knowledge_set_id INTEGER NOT NULL REFERENCES knowledge_sets(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  guidance TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE use_case_examples (
  id SERIAL PRIMARY KEY,
  use_case_id INTEGER NOT NULL REFERENCES use_cases(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  expected_answer TEXT,
  expected_source_ids INTEGER[] NOT NULL DEFAULT '{}',
  should_refuse BOOLEAN NOT NULL DEFAULT false,
  embedding VECTOR(1024),                 -- ใช้ค้นตัวอย่างที่คล้ายคำถาม (dynamic few-shot)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- S05 Agent Builder: ต่อยอดตาราง agents เดิม
ALTER TABLE agents ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'published'
  CHECK (status IN ('draft', 'published', 'archived'));      -- agent เดิมถือว่าเผยแพร่แล้ว
ALTER TABLE agents ADD COLUMN active_prompt_version INTEGER;
ALTER TABLE agents ADD COLUMN latest_eval_score NUMERIC(5,2);
ALTER TABLE agents ADD COLUMN published_at TIMESTAMPTZ;

CREATE TABLE agent_knowledge_sets (
  agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  knowledge_set_id INTEGER NOT NULL REFERENCES knowledge_sets(id) ON DELETE CASCADE,
  PRIMARY KEY (agent_id, knowledge_set_id)
);

CREATE TABLE agent_prompt_versions (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  prompt TEXT NOT NULL,
  generated_from_use_cases BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agent_id, version)
);

-- S06 Playground and Evaluation
CREATE TABLE eval_runs (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  prompt_version INTEGER NOT NULL,
  total INTEGER NOT NULL DEFAULT 0,
  passed INTEGER NOT NULL DEFAULT 0,
  score NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

CREATE TABLE eval_results (
  id SERIAL PRIMARY KEY,
  run_id INTEGER NOT NULL REFERENCES eval_runs(id) ON DELETE CASCADE,
  example_id INTEGER NOT NULL REFERENCES use_case_examples(id) ON DELETE CASCADE,
  passed BOOLEAN NOT NULL,
  answer TEXT NOT NULL,
  retrieved_source_ids INTEGER[] NOT NULL DEFAULT '{}',
  reason TEXT
);

-- P03 Chat feedback
CREATE TABLE message_feedback (
  id SERIAL PRIMARY KEY,
  chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  message_id VARCHAR(100) NOT NULL,       -- id ของข้อความใน chats.chat_history
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  rating SMALLINT NOT NULL CHECK (rating IN (-1, 1)),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chat_id, message_id, user_id)
);

-- A01 Activity Log — เขียนผ่าน logActivity() ใน lib/activity.ts เท่านั้น
CREATE TABLE activity_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_role VARCHAR(20),
  action VARCHAR(100) NOT NULL,           -- เช่น knowledge_set.create ดูรายการใน A01
  target_type VARCHAR(50),
  target_id VARCHAR(100),
  detail JSONB NOT NULL DEFAULT '{}',     -- ห้ามใส่รหัสผ่าน, token, เนื้อหาคำถามของผู้ใช้
  ip VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON activity_logs (created_at DESC);
CREATE INDEX ON activity_logs (actor_id, created_at DESC);
CREATE INDEX ON activity_logs (action, created_at DESC);
```

## ค่า env ใหม่

| ชื่อ | ใช้ทำอะไร | เจ้าของ |
|---|---|---|
| `STUDIO_SECRET_KEY` | key 32 byte (base64) สำหรับเข้ารหัสรหัสผ่านของ data connection | CORE-01 |
| `STUDIO_UPLOAD_DIR` | ที่เก็บไฟล์ที่อัปโหลด (ไม่อยู่ใน git) | CORE-02 |
| `EMBEDDING_CONNECTION_ID`, `EMBEDDING_MODEL` | เลือก embedding model ผ่าน LLM Gateway | CORE-02 |
