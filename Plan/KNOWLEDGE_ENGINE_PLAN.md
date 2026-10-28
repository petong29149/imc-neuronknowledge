# Knowledge Engine — Implementation Plan (v4.3 — adapt กับ repo จริง + chunk ไทย + metadata PDF + database แยก)

> **สำหรับ Claude:** ไฟล์นี้คือ spec สำหรับลงมือทำ อ่านทั้งไฟล์ก่อนเริ่ม แล้วทำตาม "วิธีทำงาน" ด้านล่าง
> ทำทีละ Task ตามลำดับ ห้ามข้าม Task ที่ยังไม่ผ่าน Definition of Done (DoD)

---

## 0. วิธีทำงาน (อ่านก่อนทุกครั้ง)

1. **สำรวจ repo ก่อนเขียนโค้ด** — ถ้ามีโค้ดอยู่แล้ว (หน้าเว็บ upload, API, DB, migration tool) ให้ใช้ของเดิม อย่าสร้างซ้ำ แล้วบันทึกสิ่งที่พบใน §12 Progress Log
2. ตรวจ §2 Assumptions — ถ้า repo จริงขัดกับ assumption ใด ให้ **หยุดและถามผู้ใช้** ก่อนทำต่อ
3. ทำทีละ Task (§8) — เขียนโค้ด → เขียน test → รัน test ให้ผ่าน (ใน container ตาม §7) → ติ๊ก checkbox ใน §11 → เขียน Progress Log
4. ห้ามเปลี่ยน "Locked decisions" (§1) เอง ถ้าคิดว่าควรเปลี่ยน ให้เสนอผู้ใช้
5. ห้าม commit secret (`OPENAI_API_KEY`, API keys) — ใช้ `.env` และมี `example.env` เท่านั้น (ชื่อตาม convention ของ root; `.gitignore` ของ repo มี `.env*` ซึ่งจะ ignore `.env.example` ทิ้ง)
6. เมื่อจบแต่ละ Task ให้สรุปสั้น ๆ ว่าทำอะไร, test อะไรผ่าน, และ Task ถัดไปคืออะไร

---

## 1. เป้าหมายและ Locked decisions

**เป้าหมาย:** ลูกค้าอัปโหลดไฟล์ + เขียนคำอธิบายผ่านหน้าเว็บ (มีอยู่แล้ว) → ระบบแปลงเป็น RAG อัตโนมัติ → เก็บใน Qdrant → Agent ดึงใช้ผ่าน MCP พร้อมอ้างอิงแหล่งที่มา

| เรื่อง | ตัดสินใจแล้ว |
|---|---|
| ชนิดไฟล์ Phase 1 | **PDF, DOCX, PPTX, TXT, MD** เท่านั้น (อื่น ๆ ปฏิเสธตอน upload) |
| Vector DB | **Qdrant** — collection เดียว `knowledge`, แยกลูกค้าด้วย payload `org_id` |
| Dense embedding | **OpenAI `text-embedding-3-small`** (1536 มิติ, Cosine) |
| นับขนาด chunk (v4.1) | **`tiktoken` `o200k_base`** — ไม่ใช่ `cl100k_base` เพราะเปลือง token กับภาษาไทย ~4 เท่า (รายละเอียด T7) |
| ภาษาไทย | **PyThaiNLP** — normalize, ตรวจข้อความเพี้ยน, ตัดประโยค (`crfcut`), ตัดคำ (`newmm`) |
| Sparse / BM25 | ตัดคำด้วย **PyThaiNLP newmm** → sparse vector, IDF คำนวณโดย Qdrant (`Modifier.IDF`) |
| Search | Hybrid (dense + bm25) → RRF fusion → rerank (`BAAI/bge-reranker-v2-m3`, เปิด/ปิดได้) |
| ภาษา Worker / MCP | **Python 3.11+** (เพราะ PyThaiNLP) |
| Job queue | **ตาราง Postgres + `SELECT … FOR UPDATE SKIP LOCKED`** (ไม่ต้องมี Redis, ฝั่งเว็บภาษาอะไรก็ enqueue ได้แค่ INSERT row) |
| MCP transport | Streamable HTTP, auth ด้วย Bearer API key → map เป็น `org_id` |
| การรันระบบ | **Docker Compose** — image เดียว (`knowledge-engine`) รัน 3 คำสั่ง: `api` / `worker` / `mcp` + Qdrant (+ Postgres เฉพาะ profile `standalone-db`) — ไม่มี MinIO แล้ว (image เลิกเผยแพร่) — รายละเอียด §7 |
| ตำแหน่งโค้ด | โฟลเดอร์ `knowledge-engine/` ที่ root ของ repo `Imc-neuron-knowledge` (แยกจากแอป Next.js) |
| หน้า Upload (เพิ่มใน v4) | สร้างใน **แอป Next.js นี้** (หน้า `/knowledge` + route handlers `/api/knowledge/*`) → เรียก FastAPI `api` ที่เป็น **internal เท่านั้น** ด้วย service token — รายละเอียด T2 |
| `org_id` (เพิ่มใน v4) | ผูกกับ `groups` ที่มีอยู่: เพิ่มคอลัมน์ `groups.org_id TEXT UNIQUE NULL` — group ที่มีค่านี้คือ org |
| Postgres (v4.3 — เปลี่ยน 2026-10-28) | **database แยกกัน**: แอปใช้ `imc_neuronknowledge` (ผู้ใช้ `nk_app`), engine ใช้ `knowledge_engine` (ผู้ใช้ `nk_engine`, ตารางใน schema `knowledge`) — ผู้ใช้ของฝั่งหนึ่งเข้า database อีกฝั่งไม่ได้ · dev ทุกคนใช้ชุด `neuron-devdb/` (Postgres ใน Docker, `127.0.0.1:5434`) · engine ไม่อ่านตารางของแอปเลย (org มาทาง header / API key) จึงแยกได้โดยไม่แก้โค้ด |
| MCP ต่อ org (เพิ่มใน v4) | ลงทะเบียน MCP server ในแอป **1 แถวต่อ 1 org** (key ของ org นั้นใน `headers`) แล้วผูก tool กับ agent ที่จำกัดสิทธิ์ด้วย `agent_groups` — ต้องทำ T9a ก่อน |

**นอกขอบเขต Phase 1:** XLSX/CSV, DOC/PPT/XLS รุ่นเก่า, รูปภาพ, OCR (ทำแค่ตั้งสถานะ `needs_ocr`), connectors (DB/API/Website)

---

## 2. Assumptions (ตรวจกับ repo จริงก่อนเริ่ม)

**สิ่งที่พบใน repo แล้ว (2026-10-26):**
- repo นี้คือแอป Next.js 16 (`IMC NeuronKnowledge`) — Postgres ผ่าน `pg` + env `POSTGRES_URL`, schema สร้างใน `lib/db.ts` (`CREATE TABLE IF NOT EXISTS`)
- แอปเป็น **MCP client อยู่แล้ว** — admin ลงทะเบียน MCP server ได้ที่ `Admin > MCP` (ตาราง `mcp_servers`) รองรับ Streamable HTTP และกำหนด `headers` ต่อ server ได้ → ใช้ `Authorization: Bearer <key>` ตามแผนได้เลย
- **ยังไม่พบหน้า/endpoint upload** ใน repo นี้ และ **ไม่มีแนวคิด org** (มีแค่ `users`, `groups`, `group_members`)
- `AGENTS.md` เตือนว่า Next.js เวอร์ชันนี้มี breaking changes — ถ้าต้องแตะโค้ด Next.js ให้อ่าน `node_modules/next/dist/docs/` ก่อน

- **พบปัญหาในแอป (ต้องแก้ก่อน T9 — ดู T9a):** `executeMCPTool` ใน `lib/mcp.ts` หา server จาก **ชื่อ tool อย่างเดียว** (`WHERE t.name = $1 … LIMIT 1`) และ `getEnabledMCPTools` ส่ง function ชื่อซ้ำให้ LLM ได้ — ถ้ามี MCP server หลาย org ที่มี `search_knowledge` เหมือนกัน คำค้นของ org A อาจไปเข้า server ของ org B (ข้อมูลรั่วข้าม org) · `toolMap` (name → serverId/toolId) ถูกสร้างแล้วแต่ `resolveTurnTools` ใน `lib/tool-executor.ts` ทิ้งไป
- MCP `headers` เก็บต่อแถว `mcp_servers` (global) — **ไม่มีทางส่ง org ต่อผู้ใช้ผ่าน MCP** → ใช้ "1 server row ต่อ org" ตาม §1
- แอปมีที่สร้าง schema 2 ที่: `lib/db.ts` (`ensureDatabaseSchema` ตอน runtime) และ `scripts/schema.sql` (`npm run init-db`) — ตารางของ engine **ห้าม** ใส่ในสองที่นี้ (service `migrate` ของ engine เป็นเจ้าของ schema `knowledge` ที่เดียว) · คอลัมน์ `groups.org_id` เป็นของแอป → เพิ่มทั้งใน `lib/db.ts` และ `scripts/schema.sql`
- Next.js 16: `middleware.ts` ถูก deprecate และเปลี่ยนชื่อเป็น `proxy.ts` (ดู `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`) · matcher ปัจจุบันไม่ครอบ `/api/*` → route handler ต้องเช็ก session เอง
- `createMCPClient` เปิด connection ใหม่ทุกครั้งที่เรียก tool (handshake ทุกการค้น) — ยอมรับได้สำหรับ MVP แต่ให้วัด latency ใน T9
- แอปเลือก Streamable HTTP อัตโนมัติเมื่อ URL ลงท้าย `/mcp` (ตรงกับ path default ของ `MCPServer` ใน mcp 2.x), timeout tool 10 นาที (`MCP_TOOL_TIMEOUT_MS`)
- core prompt (`lib/system-prompt.ts`) สั่งให้ถือผลลัพธ์ tool เป็น data ไม่ใช่คำสั่ง → คำสั่งเรื่อง citation ต้องอยู่ใน **tool description** และ system prompt ของ agent ไม่ใช่ใน tool result
- README ของแอปให้รัน Postgres ด้วย `docker run … -p 5432:5432` อยู่แล้ว → service `postgres` ใน compose ของ engine จะชน port ถ้าเปิดพร้อมกัน

**คำตอบ Q1–Q3 (ยืนยันกับผู้ใช้แล้ว 2026-10-26):**
- Q1 หน้า upload: **ไม่มีใน repo** (มีแค่ข้อความบน landing `components/landing/KnowledgeLibrary.tsx`) → สร้างใน Next.js นี้ (T2b) ซึ่งเรียก FastAPI internal (T2a)
- Q2 `org_id`: ผูกกับ `groups` ผ่านคอลัมน์ใหม่ `groups.org_id` (string เช่น `"acme"`, ห้ามใช้ `groups.id` ตรง ๆ เพื่อให้ย้ายฐานข้อมูลได้) · ถ้าผู้ใช้อยู่หลาย org → ต้องเลือก org ในหน้า `/knowledge` และ server ตรวจว่าเป็นสมาชิกจริง; admin เลือกได้ทุก org
- Q3 Postgres: server + database เดียวกับแอป, ตารางของ engine อยู่ใน schema `knowledge`

**Assumptions:**
- A1 (แก้ v4.3): database ของ engine แยกจากของแอป (`knowledge_engine` / `imc_neuronknowledge`) — dev ใช้ `neuron-devdb/`; production ตั้ง `POSTGRES_URL` ของแต่ละฝั่งชี้ database ของตัวเอง · profile `standalone-db` ของ engine ยังมีไว้ แต่ไม่ใช้แล้วใน dev
- A2: ไฟล์ที่อัปโหลดเก็บใน S3-compatible storage (prod) หรือ local filesystem (dev default: volume `files` ที่ `/data/files`) — ทำ `Storage` interface รองรับทั้งสองแบบ · MinIO เลิกเผยแพร่ Docker image แล้ว (พบตอน T1) → ถ้าต้องทดสอบ S3 ใน dev ให้เลือก S3-compatible ตัวอื่นตอน T2a
- A3: ไม่มี backend upload เดิม → ทำ `api.py` (FastAPI) เป็น **internal API** (T2a) — รับ request เฉพาะที่มี `Authorization: Bearer <INTERNAL_API_TOKEN>` และเชื่อ `X-Org-Id` เฉพาะจาก caller ที่มี token นี้ (คือ Next.js server เท่านั้น)
- A4: `org_id` ของผู้ใช้หาได้จาก session ฝั่ง server (`getSession()` → `group_members` → `groups.org_id`) — **ไม่รับจาก browser**

---

## 3. สถาปัตยกรรม

```
[Next.js /knowledge] ──► [Next.js /api/knowledge/*]  (session → org_id ฝั่ง server)
                                  │  Bearer INTERNAL_API_TOKEN + X-Org-Id
                                  ▼
                     [FastAPI api (internal)] ──► Storage (S3 / local FS)
                                  │
                                  └─► Postgres schema knowledge: documents + ingestion_jobs (status=queued)
                                         │  (poll, SKIP LOCKED)
                                         ▼
                              [Python Worker: pipeline.py]
   converters/* → Markdown + metadata (page | slide | section)
   → thai_text.normalize → thai_text.quality_check (garbled / needs_ocr)
   → chunker (ย่อหน้า → crfcut ประโยค → รวมตาม token budget)
   → embedder (dense, text-embedding-3-small)   ┐
   → bm25.encode_document (sparse, newmm)        ┘→ Qdrant upsert
   → อัปเดต documents.status = indexed
                                         │
                                         ▼
                [MCP Server] search_knowledge / list_documents / get_document_chunk
                 hybrid query (dense + bm25 → RRF) → rerank → citations
                                         ▲  Bearer <key ของ org>  (1 แถว mcp_servers ต่อ org)
                                         │
                [แอป NeuronKnowledge: agent ของ org (agent_groups) → executeMCPTool ตาม server id (T9a)]
```

**กฎสำคัญ:** โค้ดตัดคำ/normalize อยู่ใน `thai_text.py` และ `bm25.py` **ที่เดียว** ใช้ร่วมกันทั้ง Worker และ MCP — ถ้าตอน index กับตอน query ตัดคำต่างกัน BM25 จะพัง

---

## 4. โครงสร้างโปรเจกต์

```
knowledge-engine/
├── pyproject.toml
├── Dockerfile                  # multi-stage, target: base / rerank (§7)
├── .dockerignore
├── docker-compose.yml          # qdrant, postgres (profile standalone-db), migrate, api, worker, mcp
├── docker-compose.override.yml # dev: mount src, hot reload, เปิด port
├── example.env                 # ไม่ใช้ชื่อ .env.example เพราะ .gitignore ของ repo มี `.env*`
├── migrations/001_init.sql     # schema `knowledge` (repo ไม่มี migration tool — แอปใช้ CREATE … IF NOT EXISTS)
├── resources/custom_words.txt  # คำเฉพาะองค์กร 1 คำ/บรรทัด
├── src/knowledge/
│   ├── config.py               # pydantic-settings อ่าน .env
│   ├── db.py                   # psycopg (v3) connection + queries
│   ├── migrate.py              # รัน migrations/*.sql + ensure_collection() (service `migrate`)
│   ├── storage.py              # Storage interface: S3Storage, LocalStorage
│   ├── thai_text.py            # normalize, quality_check, tokenize_words, split_sentences
│   ├── bm25.py                 # encode_document, encode_query
│   ├── chunker.py              # Section → Chunk
│   ├── converters/
│   │   ├── base.py             # dataclass Section, ConvertResult, Converter protocol
│   │   ├── pdf.py
│   │   ├── docx.py
│   │   ├── pptx.py
│   │   └── text.py             # .txt / .md
│   ├── embedder.py             # OpenAI batching + retry
│   ├── vector_store.py         # Qdrant: ensure_collection, upsert, delete_by_doc, hybrid_query
│   ├── rerank.py               # CrossEncoder wrapper (optional)
│   ├── pipeline.py             # process_document(doc_id)
│   ├── worker.py               # job loop
│   ├── search.py               # search() ที่ MCP เรียก
│   ├── mcp_server.py
│   └── api.py                  # FastAPI internal: upload/status/reindex/delete (T2a)
├── tests/
│   ├── fixtures/               # ไฟล์ทดสอบที่ generate ได้
│   ├── fixtures/real/          # ไฟล์จริงจากผู้ใช้ (gitignore ถ้าเป็นความลับ)
│   └── test_*.py
└── eval/
    ├── questions.jsonl
    └── run_eval.py
```

**ไฟล์ฝั่งแอป Next.js ที่จะแตะ (T2b, T9a):**
```
app/knowledge/page.tsx                    # หน้า upload + รายการเอกสาร (ผู้ใช้ที่อยู่ใน org)
app/api/knowledge/documents/route.ts      # GET list / POST upload → proxy ไป internal API
app/api/knowledge/documents/[id]/route.ts # GET status / DELETE
app/api/knowledge/documents/[id]/reindex/route.ts
lib/knowledge.ts                          # resolveOrgForUser(), เรียก internal API (fetch + token)
components/knowledge/*                    # UI upload / ตารางสถานะ
lib/db.ts + scripts/schema.sql            # ALTER TABLE groups ADD COLUMN org_id
components/admin/AdminGroupModals.tsx     # ช่องกรอก org_id ของ group
middleware.ts (→ proxy.ts)                # เพิ่ม /knowledge ใน matcher
lib/mcp.ts, lib/tool-executor.ts          # T9a: dispatch ตาม server/tool id
```

**Dependencies:** `pymupdf`, `python-docx`, `python-pptx`, `charset-normalizer`, `pythainlp`, `python-crfsuite`, `tiktoken`, `openai`, `qdrant-client`, `mmh3`, `psycopg[binary]`, `pydantic-settings`, `boto3`, `mcp`, `fastapi`, `uvicorn`, `python-multipart`, `tenacity`; optional: `sentence-transformers` (rerank); dev: `pytest`, `ruff`

---

## 5. Data model (Postgres)

> ทุกตารางในหัวข้อนี้อยู่ใน schema `knowledge` (database เดียวกับแอป) — `001_init.sql` เริ่มด้วย
> `CREATE SCHEMA IF NOT EXISTS knowledge; SET search_path TO knowledge;` และใช้ `CREATE TABLE/INDEX IF NOT EXISTS` ให้ idempotent
> · `db.py` ตั้ง `search_path=knowledge` ต่อ connection (ไม่แตะตารางใน `public` ของแอป)
> · `gen_random_uuid()` มีใน Postgres 13+ (README ของแอปกำหนด ≥ 13 อยู่แล้ว)

```sql
CREATE TABLE documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          TEXT NOT NULL,
  filename        TEXT NOT NULL,
  file_type       TEXT NOT NULL CHECK (file_type IN ('pdf','docx','pptx','txt','md')),
  mime            TEXT,
  size_bytes      BIGINT,
  storage_path    TEXT NOT NULL,
  file_hash       TEXT NOT NULL,              -- sha256
  description     TEXT NOT NULL,              -- คำอธิบายที่ลูกค้าเขียน
  tags            TEXT[] NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'uploaded'
                  CHECK (status IN ('uploaded','extracting','chunking','embedding',
                                    'indexed','failed','needs_ocr','deleted')),
  quality_flag    TEXT CHECK (quality_flag IN ('ok','partial_garbled','garbled','needs_ocr')),
  error           TEXT,
  page_count      INT,
  chunk_count     INT,
  embed_model     TEXT,
  tokenizer_version TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, file_hash)
);
CREATE INDEX ON documents (org_id, status);

CREATE TABLE ingestion_jobs (
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
CREATE INDEX ON ingestion_jobs (state, run_after);

CREATE TABLE api_keys (                       -- สำหรับ MCP auth
  key_hash   TEXT PRIMARY KEY,                -- sha256 ของ key, ห้ามเก็บ plaintext
  org_id     TEXT NOT NULL,
  label      TEXT,
  revoked    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**ฝั่งแอป (schema `public`, เพิ่มใน `lib/db.ts` และ `scripts/schema.sql`):**
```sql
ALTER TABLE groups ADD COLUMN IF NOT EXISTS org_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_groups_org_id ON groups(org_id) WHERE org_id IS NOT NULL;
```
- `org_id` ต้องตรงกับ `knowledge.api_keys.org_id` และ `knowledge.documents.org_id` (string เดียวกัน)

**`migrations/002_document_metadata.sql` (เพิ่มใน v4.2 — ทำพร้อม T6):** metadata ระดับเอกสารที่ converter ดึงได้ (ดู T6 "Metadata 3 ระดับ")
```sql
ALTER TABLE documents ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
```
- รูปแบบ: `{"title", "author", "subject", "keywords", "created", "modified", "running_header", "running_footer", "has_toc", "page_labels"}` — มีเฉพาะ key ที่หาค่าได้, string ตัดที่ 500 ตัวอักษร, วันที่เป็น ISO 8601
- ค่ามาจากไฟล์ของลูกค้า (เชื่อไม่ได้) → ใช้แสดงผล/กรองเท่านั้น **ห้าม** ใส่ใน `text` ของ chunk และห้ามถือเป็นคำสั่ง
- API (`GET /documents`, `GET /documents/{id}`) คืน `metadata` ด้วย — เพิ่มใน `DOCUMENT_FIELDS` ตอนทำ T6

**Job claim query (worker):**
```sql
UPDATE ingestion_jobs SET state='running', locked_at=now(), attempts=attempts+1
WHERE id = (
  SELECT id FROM ingestion_jobs
  WHERE state='queued' AND run_after <= now()
  ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1
) RETURNING *;
```
- ล้มเหลว → ถ้า `attempts < max_attempts`: `state='queued', run_after = now() + 2^attempts นาที`; ไม่งั้น `state='failed'` และ `documents.status='failed'`
- Job ที่ `running` นานเกิน `JOB_STALE_MINUTES` (default 30) → คืนเป็น `queued` (กัน worker ตาย)
- **Error ถาวร** (ไฟล์เสีย, ไม่รองรับ, needs_ocr) → ไม่ retry

---

## 6. Qdrant schema

```python
from qdrant_client import models

client.create_collection(
    collection_name="knowledge",
    vectors_config={"dense": models.VectorParams(size=1536, distance=models.Distance.COSINE)},
    sparse_vectors_config={"bm25": models.SparseVectorParams(modifier=models.Modifier.IDF)},
)
client.create_payload_index("knowledge", "org_id",
    models.KeywordIndexParams(type="keyword", is_tenant=True))
client.create_payload_index("knowledge", "doc_id", models.PayloadSchemaType.KEYWORD)
client.create_payload_index("knowledge", "tags", models.PayloadSchemaType.KEYWORD)
```

- `ensure_collection()` ต้อง idempotent (สร้างเฉพาะถ้ายังไม่มี)
- **Point id** = `uuid5(NAMESPACE, f"{doc_id}:{chunk_index}")`
- **Payload:**
  ```
  org_id, doc_id, filename, file_type, description, tags,
  chunk_index, text, page | slide, page_label (PDF), section (หัวข้อ — DOCX/MD และ PDF ที่มี TOC),
  citation (string พร้อมใช้),
  token_count, embed_model, tokenizer_version, created_at
  ```
- **ทุก query ต้องมี filter `org_id`** — ไม่มีข้อยกเว้น
- metadata ระดับเอกสาร (ผู้เขียน, วันที่ ฯลฯ) **ไม่** อยู่ใน payload — อยู่ใน `documents.metadata` (join ด้วย `doc_id` เมื่อต้องการ)

---

## 7. Docker

> **เหตุผล:** `python-crfsuite`, PyMuPDF, PyTorch ติดตั้งยาก/ไม่เสถียรบน Windows · dev (Windows) กับ server (Linux) ต้องเหมือนกัน · scale worker ได้ง่าย · deploy ทั้งระบบด้วยไฟล์เดียว

### 7.1 Services

| Service | Image | หน้าที่ | Port (dev) | หมายเหตุ |
|---|---|---|---|---|
| `postgres` | `postgres:16-alpine` | DB | 5432 | **profile `standalone-db` เท่านั้น** (CI / เครื่องที่ไม่มี Postgres ของแอป) · ค่าปกติใช้ Postgres ของแอปที่รันบน host อยู่แล้ว (port 5432 จะชนถ้าเปิดทั้งคู่) |
| `qdrant` | `qdrant/qdrant` (pin version) | vector DB | 6333 | volume `qdrant_storage`, healthcheck `/readyz` |
| ~~`minio`~~ | — | — | — | **ตัดออกใน T1:** `minio/minio` ไม่มีบน Docker Hub/quay แล้ว · dev ใช้ `STORAGE_BACKEND=local` (volume `files`), prod ใช้ S3 จริง |
| `migrate` | `knowledge-engine` | รัน SQL migration + `ensure_collection()` แล้วจบ | — | `restart: "no"` |
| `api` | `knowledge-engine` | `uvicorn knowledge.api:app` | 8000 | **internal** — ผู้เรียกมีแค่ Next.js server (token `INTERNAL_API_TOKEN`) · dev bind `127.0.0.1:8000` เท่านั้น · prod ห้ามเปิดออกอินเทอร์เน็ต |
| `worker` | `knowledge-engine` | `python -m knowledge.worker` | — | scale ได้ `--scale worker=3` |
| `mcp` | `knowledge-engine` | `python -m knowledge.mcp_server` | 8765 | prod: อยู่หลัง reverse proxy ที่มี HTTPS |

- `api`/`worker`/`mcp` → `depends_on: { qdrant: service_healthy, migrate: service_completed_successfully }` (+ `postgres: service_healthy` เฉพาะ profile `standalone-db` — ใช้ `required: false` ของ compose)
- container ต่อ Postgres ของแอปบน host ผ่าน `host.docker.internal` (Docker Desktop บน Windows รองรับ; Linux ใส่ `extra_hosts: ["host.docker.internal:host-gateway"]`)
- ใช้ **image เดียว** (`knowledge-engine`) เพราะทั้งสามต้องใช้ `thai_text.py`/`bm25.py` ชุดเดียวกัน (กฎ §3)
- network ภายใน compose: service คุยกันด้วยชื่อ (`postgres:5432`, `qdrant:6333`); เปิด port ออก host เฉพาะใน `docker-compose.override.yml` (dev)
- แอป Next.js (รันนอก compose ด้วย `npm run dev`) ลงทะเบียน MCP ที่ `http://localhost:8765/mcp`

### 7.2 Dockerfile (หลักการ)

```dockerfile
# syntax=docker/dockerfile:1
FROM python:3.11-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 \
    PYTHAINLP_DATA_DIR=/opt/pythainlp-data HF_HOME=/opt/hf-cache
RUN apt-get update && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*          # ต้องใช้ตอน build python-crfsuite (ลบได้ถ้ามี wheel)
WORKDIR /app
COPY pyproject.toml ./
RUN pip install --no-cache-dir .            # dependencies หลัก (ไม่มี torch)
COPY src/ ./src/
RUN pip install --no-cache-dir --no-deps . \
 && python -c "from knowledge.thai_text import warmup; warmup()"   # โหลด dict + crfcut ไว้ใน image
RUN useradd -m -u 10001 app && chown -R app /opt
USER app
# CMD กำหนดใน compose ต่อ service

FROM base AS rerank
USER root
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu \
 && pip install --no-cache-dir sentence-transformers
USER app
```

- **2 targets:** `base` (MVP, เล็ก) และ `rerank` (เพิ่ม torch CPU + sentence-transformers) — ใช้ `rerank` เฉพาะ service ที่ `RERANK_ENABLED=true` (คือ `mcp`)
- **ห้าม** bake โมเดล reranker (~2GB) ลง image → เก็บใน volume `hf_cache` ที่ mount `/opt/hf-cache`
- `thai_text.warmup()` = สร้าง `dict_trie` + เรียก `sent_tokenize("ทดสอบ", engine="crfcut")` หนึ่งครั้ง เพื่อให้ไฟล์ข้อมูลอยู่ใน image
- `.dockerignore`: `.git`, `.venv`, `__pycache__`, `tests/fixtures/real/`, `.env`, `eval/results/` (`example.env` เข้า image ได้ ไม่มี secret)
- รันเป็น non-root (`uid 10001`) ทุก service

### 7.3 Environment / secrets
- compose อ่าน `knowledge-engine/.env` (ไม่ commit — `.gitignore` ของ root มี `.env*` ครอบอยู่แล้ว) — `knowledge-engine/example.env` มีครบทุกตัวแปรใน T1 (`cp example.env .env`)
- **ห้ามใช้ชื่อ `.env.example`** — ถูก `.env*` ใน `.gitignore` ignore ทิ้ง (หรือถ้าจำเป็นต้องใช้ชื่อนี้ ให้เพิ่ม `!.env.example` ใน `.gitignore`)
- `POSTGRES_URL` ชี้ database เดียวกับแอป: `postgresql://postgres:1234@host.docker.internal:5432/imc-neuronknowledge` (profile `standalone-db`: `…@postgres:5432/imc-neuronknowledge`) · `QDRANT_URL=http://qdrant:6333` · `STORAGE_BACKEND=local` ใน dev
- **ฝั่งแอป Next.js** (`example.env` ที่ root) เพิ่ม: `KNOWLEDGE_API_URL=http://localhost:8000`, `KNOWLEDGE_API_TOKEN=` (ค่าเดียวกับ `INTERNAL_API_TOKEN` ของ engine), `KNOWLEDGE_MAX_FILE_MB=50`
- `INTERNAL_API_TOKEN` สร้างด้วยสตริงสุ่ม ≥ 32 ตัวอักษร ห้ามมีค่า default ในโค้ด (ถ้าไม่ตั้ง → `api` ไม่ยอม start)
- prod: ส่ง secret ผ่าน env ของ platform/Docker secrets — ห้ามใส่ใน image

### 7.4 คำสั่งที่ต้องใช้ได้ (ใส่ใน README ของ `knowledge-engine/`)
```bash
docker compose up -d --build                              # ขึ้นทั้งระบบ (dev override โหลดอัตโนมัติ, ใช้ Postgres ของแอป)
docker compose --profile standalone-db up -d --build      # ไม่มี Postgres ของแอป
docker compose logs -f worker
docker compose run --rm worker pytest                     # รัน test ใน container
docker compose run --rm worker python -m knowledge.mcp_server create-key --org <org_id> --label <label>
docker compose up -d --scale worker=3                     # เพิ่ม worker
docker compose down                                       # หยุด (ข้อมูลยังอยู่ใน volume)
```

### 7.5 Volumes
`pgdata` (standalone-db), `qdrant_storage`, `files`, `hf_cache` — ห้ามใช้ `docker compose down -v` กับ prod (ลบข้อมูลทั้งหมด)

---

## 8. Tasks

### T1 — Project scaffold + Docker (Sprint 0)
- `pyproject.toml`, `example.env`, `config.py`
- `Dockerfile` (targets `base` + `rerank`), `.dockerignore`, `docker-compose.yml`, `docker-compose.override.yml` ตาม §7
- `migrations/001_init.sql` ตาม §5 (schema `knowledge`) + `python -m knowledge.migrate` (รัน SQL แบบ idempotent + `ensure_collection()`) ใช้เป็นคำสั่งของ service `migrate`
- `vector_store.ensure_collection()` ตาม §6
- stub ของ `worker` / `mcp_server` ที่รันค้างได้และ log ว่า "ready" (เนื้อหาจริงทำใน T3/T9)
- **ENV:** `POSTGRES_URL, POSTGRES_SCHEMA=knowledge, INTERNAL_API_TOKEN, API_PORT=8000, QDRANT_URL, QDRANT_API_KEY, QDRANT_COLLECTION=knowledge, OPENAI_API_KEY, EMBED_MODEL=text-embedding-3-small, STORAGE_BACKEND=s3|local, S3_*, LOCAL_STORAGE_DIR, MAX_FILE_MB=50, CHUNK_ENCODING=o200k_base, EMBED_MAX_TOKENS=8000, CHUNK_MIN_TOKENS=150, CHUNK_TARGET_TOKENS=600, CHUNK_MAX_TOKENS=800, CHUNK_OVERLAP_SENTENCES=2, BM25_K1=1.2, BM25_B=0.75, BM25_AVGDL=300, GARBLED_THRESHOLD=0.6, RERANK_ENABLED=false, RERANK_MODEL=BAAI/bge-reranker-v2-m3, RERANK_MAX_LENGTH=1024, MCP_PORT=8765`
- **DoD:**
  - `docker compose --profile standalone-db up -d --build` แล้วทุก service ขึ้นเป็น healthy/running, `migrate` จบด้วย exit 0
  - ตาราง §5 ถูกสร้างใน schema `knowledge` (ไม่มีตารางใหม่ใน `public`) และ collection `knowledge` มีใน Qdrant (เช็กที่ `http://localhost:6333/dashboard`)
  - แอป Next.js ยังทำงานปกติกับ database เดิม (`npm run dev` + login + แชทได้)
  - `git status` ไม่มี `.env` และมี `knowledge-engine/example.env`
  - รัน `migrate` ซ้ำแล้วไม่ error (idempotent)
  - `docker compose run --rm worker pytest` รันได้
  - image `base` ไม่มี torch (เช็กขนาด image และบันทึกใน Progress Log)

### T2 — Upload (KNOW-01, KNOW-02) = T2a internal API + T2b หน้าเว็บ Next.js
> repo ไม่มี endpoint/หน้า upload เดิม (§2 Q1) → ทำใหม่ทั้งสองฝั่ง · การตรวจไฟล์และ storage อยู่ใน Python **ที่เดียว** — Next.js ไม่ตรวจ magic bytes ซ้ำ

#### T2a — FastAPI internal API (`knowledge-engine/src/knowledge/api.py`)
- **Auth:** ทุก endpoint ต้องมี `Authorization: Bearer <INTERNAL_API_TOKEN>` (เทียบแบบ constant-time) ไม่งั้น 401 · `org_id` อ่านจาก header `X-Org-Id` (บังคับ, ไม่ว่าง) — เชื่อได้เพราะมีแค่ Next.js server ที่ถือ token · **ไม่รับ `org_id` จาก body/query**
- `GET /healthz` (ไม่ต้อง auth) สำหรับ healthcheck ของ compose
- `POST /documents` (multipart: `file`, `description` (required, ≥ 10 ตัวอักษร), `tags[]`)
  - ตรวจ **นามสกุล + magic bytes**: PDF `%PDF`, DOCX/PPTX = ZIP `PK\x03\x04` + มี `word/document.xml` / `ppt/presentation.xml`, TXT/MD = decode ได้ (ดู T6)
  - ไฟล์ไม่รองรับ → 415 พร้อมข้อความไทย: `"ยังไม่รองรับไฟล์ชนิดนี้ รองรับเฉพาะ PDF, DOCX, PPTX, TXT, MD"`
  - เกิน `MAX_FILE_MB` → 413
  - คำนวณ sha256 → ถ้าซ้ำใน org เดียวกัน → 409 พร้อม `doc_id` เดิม
  - เก็บไฟล์ที่ `{org_id}/{doc_id}/{filename}` → INSERT `documents` + `ingestion_jobs` ใน transaction เดียว → ตอบ `201 {doc_id, status}`
- `GET /documents?status=&tag=` · `GET /documents/{id}` (status, quality_flag, error, chunk_count) — เฉพาะของ `X-Org-Id` นั้น (doc ของ org อื่น → 404 ไม่ใช่ 403)
- `POST /documents/{id}/reindex` → enqueue `kind='reindex'`
- `DELETE /documents/{id}` → enqueue `kind='delete'` (ลบ points ใน Qdrant + ไฟล์ + ตั้ง status `deleted`)
- error ทุกตัวตอบรูปแบบเดียว `{"error": "<ข้อความไทย>"}` เพื่อให้ Next.js ส่งต่อได้ตรง ๆ (แอปใช้ key `error` อยู่แล้วใน route handlers)
- **DoD (pytest):** อัปโหลดสำเร็จ, ชนิดไม่รองรับ, ไฟล์ปลอมนามสกุล (เช่น .exe เปลี่ยนชื่อเป็น .pdf), ไฟล์ซ้ำ, description ว่าง, ไม่มี/ผิด token → 401, ไม่มี `X-Org-Id` → 400, org A เห็น/ลบ doc ของ org B ไม่ได้

#### T2b — หน้าเว็บ + route handlers ใน Next.js
> อ่าน `node_modules/next/dist/docs/` ก่อน (AGENTS.md) — โดยเฉพาะ `01-app/03-api-reference/03-file-conventions/route.md` (FormData) และ `proxy.md`
- **Schema แอป:** เพิ่ม `groups.org_id` (§5 ฝั่งแอป) ใน `lib/db.ts` **และ** `scripts/schema.sql` · Admin > ผู้ใช้ > กลุ่ม: เพิ่มช่อง `org_id` ใน `AdminGroupModals.tsx` + `app/api/admin/groups/*` (validate `^[a-z0-9][a-z0-9_-]{1,62}$`, unique)
- `lib/knowledge.ts`:
  - `resolveOrgForUser(session, requestedOrgId?)` → ดึง org ที่ user เป็นสมาชิก (`group_members` ⨝ `groups` ที่ `is_active` และมี `org_id`); admin ได้ทุก org · ถ้ามีหลาย org ต้องระบุ `requestedOrgId` และต้องอยู่ในรายการ ไม่งั้น 403 · ไม่มี org เลย → 403 `"บัญชีนี้ยังไม่ได้อยู่ในองค์กรใด กรุณาติดต่อผู้ดูแลระบบ"`
  - `knowledgeFetch(path, orgId, init)` → `fetch(KNOWLEDGE_API_URL + path)` ใส่ `Authorization: Bearer KNOWLEDGE_API_TOKEN` + `X-Org-Id` ฝั่ง server เท่านั้น (ห้าม import ใน client component)
- Route handlers (เช็ก `getSession()` เองทุกตัว — matcher ของ middleware ไม่ครอบ `/api`):
  - `GET/POST /api/knowledge/documents` · `GET/DELETE /api/knowledge/documents/[id]` · `POST /api/knowledge/documents/[id]/reindex`
  - POST: อ่าน `request.formData()` → เช็กขนาดเบื้องต้นด้วย `KNOWLEDGE_MAX_FILE_MB` (กันส่งไฟล์ใหญ่ไปเปล่า ๆ) → ส่ง FormData ต่อไป internal API → ส่ง status + body กลับตามเดิม (415/413/409/201)
  - `org_id` ที่ client ส่งมา (ถ้ามีหลาย org) ใช้แค่ "เลือก" — ต้องผ่าน `resolveOrgForUser` เสมอ
  - internal API ล่ม → 503 `"ระบบคลังความรู้ไม่พร้อมใช้งานชั่วคราว"`
- หน้า `app/knowledge/page.tsx` (+ `components/knowledge/*`): ฟอร์ม upload (ไฟล์, คำอธิบาย ≥ 10 ตัวอักษร, tags), ตัวเลือก org (เมื่อมีหลาย org), ตารางเอกสารพร้อม status/quality_flag/error/chunk_count + ปุ่ม reindex/ลบ, poll สถานะทุก ~5 วินาทีขณะมีเอกสารที่ยังไม่ `indexed`/`failed` · ใช้ style เดียวกับหน้า admin/chat (Tailwind v4, lucide-react, รองรับ dark mode)
- เพิ่มลิงก์ไปหน้า `/knowledge` ใน `components/common/Navbar.tsx` / เมนูแชท และเพิ่ม `/knowledge/:path*` ใน matcher (ถ้าแตะไฟล์นี้ ให้ย้าย `middleware.ts` → `proxy.ts` ตาม Next.js 16 พร้อมกัน)
- **สิ่งที่ทำจริง (ดู Progress Log 2026-10-28):**
  - ใครอัปโหลดได้: **สมาชิกทุกคนของกลุ่มที่มี org_id** (และ admin ทุก org) ตามแผนเดิม — ยังไม่ได้จำกัดเฉพาะ `owner` (ผู้ใช้ยังไม่ได้ตัดสิน)
  - เพิ่ม `GET /api/knowledge/orgs` (รายชื่อ org ของผู้ใช้ + ขนาดไฟล์สูงสุด) ให้หน้าเว็บใช้ทำตัวเลือก org
  - admin ที่มีหลาย org ต้องเลือก org ทุกครั้ง (ไม่มีค่า default) · ผู้ใช้ที่มี org เดียวไม่ต้องส่ง org_id
  - ทางเข้าหน้า: เมนูผู้ใช้ในแถบข้างของหน้าแชท ("คลังความรู้") — Navbar หน้าแรกเป็นลิงก์ภายในหน้า landing จึงไม่ได้ใส่
  - ย้าย `middleware.ts` → `proxy.ts` (ฟังก์ชัน `proxy`) ตาม Next.js 16 และเพิ่ม `/knowledge` ใน matcher
  - เปลี่ยน org_id ของกลุ่มที่มีเอกสารแล้ว → เอกสารเดิมยังอยู่ใน engine ภายใต้รหัสเดิม (หน้าแก้ไขกลุ่มเตือนไว้) · ลบกลุ่มไม่ลบเอกสารใน engine
  - ระหว่างรอ OpenAI key สถานะแสดงตาม `pending_job` (เช่น "กำลังสร้างดัชนี") และหน้าเว็บ poll ทุก 5 วินาทีจนงานเสร็จ
- **DoD:** `npm run lint` + `npm run build` ผ่าน · ทดสอบผ่าน browser (dev server) ด้วยผู้ใช้ 2 org: อัปโหลด 1 ไฟล์ต่อ org แล้วแต่ละคนเห็นแค่ของตัวเอง, ไฟล์ไม่รองรับขึ้นข้อความไทย, ไฟล์ซ้ำขึ้น 409, ผู้ใช้ที่ไม่มี org ได้ 403 · ไม่มี `KNOWLEDGE_API_TOKEN` ใน bundle ฝั่ง client (ค้นใน `.next/static`)

### T3 — Worker + job queue (KNOW-08)
- `worker.py`: loop claim job (§5) → เรียก `pipeline.process_document` / `delete_document` → อัปเดตสถานะ; รองรับหลาย worker พร้อมกัน; graceful shutdown (SIGINT/SIGTERM)
- อัปเดต `documents.status` ตามขั้น: `extracting → chunking → embedding → indexed`
- Exception classes: `PermanentError` (ไม่ retry) vs `TransientError` (retry)
- **สัญญาจาก T2a (API ทำไว้แล้ว ห้ามขัด):**
  - API ใส่ job `index` ตอน upload, `reindex` ตอนสั่ง reindex (ถ้ามี job ที่ยัง `queued` อยู่จะใช้ตัวเดิม), `delete` ตอนสั่งลบ (ลบ job index/reindex ที่ยัง `queued` ทิ้ง)
  - job `index`/`reindex` ที่กำลัง `running` ตอนมีคำสั่งลบ **ไม่ถูกยกเลิก** → worker ต้องเช็กก่อน upsert ว่ามี job `delete` รออยู่หรือไม่ ถ้ามีให้ข้าม
  - job `delete` ต้อง: ลบ points (`delete_by_doc`) → ลบไฟล์ (`storage.delete(storage_path)`) → ตั้ง `documents.status='deleted'` (API ใช้ status นี้เป็นสัญญาณว่าลบเสร็จ และยอมให้อัปโหลดไฟล์เดิมซ้ำได้โดยลบแถวเก่าทิ้ง)
  - อ่านไฟล์ด้วย `storage.get_storage(settings).get(doc.storage_path)` และ decode TXT/MD ด้วย `file_types.decode_text` (ที่เดียวกับตอน upload)
- **DoD:** test ว่า 2 worker ไม่หยิบ job เดียวกัน, retry/backoff ทำงาน, stale job ถูกคืนคิว

### T4 — `thai_text.py` (KNOW-03, หัวใจของภาษาไทย)
```python
TOKENIZER_VERSION = "newmm-v1"   # เปลี่ยนเมื่อแก้ custom dict หรือกฎ → ต้อง reindex sparse

def normalize(text: str) -> str
    # unicodedata NFC → ลบ zero-width (​ ‌ ‍ ﻿) → pythainlp.util.normalize
    # → ยุบ whitespace ซ้ำ (เก็บ \n\n ไว้เป็นตัวแบ่งย่อหน้า)

def tokenize_words(text: str) -> list[str]
    # word_tokenize(text, custom_dict=TRIE, engine="newmm", keep_whitespace=False)
    # TRIE = dict_trie(thai_words() | custom_words.txt) — สร้างครั้งเดียว (module-level / lru_cache)

def split_sentences(paragraph: str) -> list[str]
    # sent_tokenize(paragraph, engine="crfcut"); ถ้าย่อหน้าเป็นอังกฤษล้วนใช้ตัวตัดแบบ regex ก็ได้

def quality_check(text: str) -> QualityResult  # {score: float, thai_ratio: float, flag}
    # tokens ไทย (len>1) ที่อยู่ใน dictionary / tokens ไทยทั้งหมด
    # score < GARBLED_THRESHOLD → 'garbled'
    # ข้อความไทยน้อยมาก (countthai ต่ำ) แต่เป็นอังกฤษปกติ → 'ok' (อย่าตีว่าเพี้ยน)
```
- **DoD (tests):**
  - normalize แก้สระ/วรรณยุกต์ซ้ำได้ เช่น `"เเ"` (สระเอสองตัว) → `"แ"`
  - ข้อความไทยปกติได้ `ok`; ข้อความไทยที่จงใจทำให้เพี้ยน (สลับลำดับสระ/วรรณยุกต์ แทรกช่องว่างทุกตัวอักษร) ได้ `garbled`
  - ข้อความอังกฤษล้วนได้ `ok`
  - คำใน `custom_words.txt` ไม่ถูกตัดแยก
- **สิ่งที่ทำจริง (ต่างจาก spec ด้านบน — ดู Progress Log):**
  - `normalize` ไม่เรียก `pythainlp.util.normalize` ตรง ๆ เพราะมันยุบ `

` เป็น `
` (ย่อหน้าหาย) → เรียกขั้นย่อย `remove_spaces_before_marks` / `remove_repeat_vowels` / `remove_dangling` ทีละบรรทัด
  - `tokenize_words` แบ่งข้อความเป็น run ก่อน: ไทย → newmm, คำ/ตัวเลขที่ไม่ใช่ไทย (เชื่อมด้วย `. _ ' -`) → 1 token เช่น `KNOW-07`, `v2.5`, สัญลักษณ์อื่น → 1 token ต่อตัว (T5 ตัดทิ้ง) · custom word ต้องเป็นไทยล้วนหรือไม่ใช่ไทยล้วน
  - `quality_check` คืน `QualityResult(score, thai_ratio, invalid_ratio, flag)` — `garbled` เมื่อ `score < GARBLED_THRESHOLD` **หรือ** `invalid_ratio > 0.01` (สัดส่วนอักษรไทยที่อยู่ในลำดับที่เป็นไปไม่ได้ เช่น สระหน้าไม่มีพยัญชนะตาม, วรรณยุกต์ไม่มีฐาน, glyph ของฟอนต์เก่า U+F700–F71A) เพราะ dictionary score อย่างเดียวจับข้อความที่สระหน้าสลับที่ไม่ได้ (0.78) · ข้อความไทย < 20 ตัวอักษร → `ok`
  - `split_sentences` ถือแต่ละบรรทัดเป็นขอบเขต → converter (T6) ต้องต่อบรรทัดที่ถูกตัดกลางประโยค (hard wrap ใน PDF) ก่อน

### T5 — `bm25.py` (KNOW-09 ฝั่ง sparse, ทำตอน ingest)
```python
def bm25_terms(text) -> list[str]
    # tokenize_words(normalize(text)) → lowercase อังกฤษ → ตัด thai_stopwords()
    # + stopwords อังกฤษพื้นฐาน → ตัด punctuation/ช่องว่าง/token ยาว 1 ที่ไม่ใช่ตัวเลข

def term_id(term) -> int:  mmh3.hash(term, signed=False)

def encode_document(text) -> models.SparseVector
    # tf ต่อ term; dl = จำนวน term
    # value = tf*(k1+1) / (tf + k1*(1 - b + b*dl/BM25_AVGDL))
    # รวม term ที่ hash ชนกัน (บวกค่า) ให้ indices ไม่ซ้ำ

def encode_query(text) -> models.SparseVector
    # unique terms, value = 1.0 (IDF ให้ Qdrant คิด)
```
- **DoD:** test ว่า indices ไม่ซ้ำ, query/doc ใช้ term ชุดเดียวกัน, stopword ถูกตัด, ข้อความว่าง → vector ว่าง (และ pipeline ต้องรองรับ)
- **สิ่งที่ทำจริง (ต่างจาก spec — ดู Progress Log 2026-10-27):**
  - stopword ไทยใช้ **รายการคำเชื่อม/คำไวยากรณ์สั้น ๆ ของเราเอง** (`bm25.THAI_STOPWORDS` ~45 คำ) แทน `pythainlp.corpus.thai_stopwords()` (1,030 คำ) เพราะรายการนั้นตัดคำที่มีความหมายในคำถาม เช่น วัน, เกิน, สูงสุด, ภายใน, ก่อน, หลัง, ใหม่, สำคัญ — และ Qdrant IDF ลดน้ำหนักคำที่พบบ่อยให้อยู่แล้ว
  - เลขไทย → เลขอารบิก (`๒๕๖๗` = `2567`) และ lowercase ใน `bm25_terms` (ทั้ง index และ query)
  - คำย่อไทยที่ขึ้นต้นคำ (`ก.พ.`, `พ.ศ.`, `สป.อว.`, `ศ.ดร.`, `มก.`) เป็น 1 term — `thai_text.tokenize_words` คืนเป็นก้อนเดียว (ถ้าไม่ทำ จะเหลือ `ก` `พ` ซึ่งถูกตัดเพราะยาว 1 ตัวอักษร = ค้นคำย่อไม่ได้เลย) · คำย่อที่ติดคำข้างหน้าโดยไม่เว้นวรรค (`ประกาศก.พ.`) ยังไม่ถูกรวม
  - `bm25.is_empty(vector)` — T8: ข้อความไม่มี term → upsert point **โดยไม่ใส่** sparse vector (test แล้วว่า Qdrant รับได้) · T10: query ว่าง → dense อย่างเดียว

### T6 — Converters (KNOW-03)
```python
@dataclass
class Section:
    text: str                 # Markdown
    page: int | None = None   # PDF: ลำดับหน้าในไฟล์ (เริ่ม 1)
    page_label: str | None = None  # PDF: เลขหน้าที่พิมพ์บนกระดาษ (page.get_label()) เช่น "iv", "5"; None ถ้าไฟล์ไม่กำหนด
    slide: int | None = None  # PPTX
    heading_path: list[str] = field(default_factory=list)  # DOCX/MD จาก style/#, PDF จาก TOC
    is_table: bool = False

@dataclass
class ConvertResult:
    sections: list[Section]
    page_count: int | None
    warnings: list[str]
    metadata: dict[str, Any] = field(default_factory=dict)  # ระดับเอกสาร → documents.metadata (migration 002)
```

**Metadata 3 ระดับ (v4.2) — แยกกันชัด ห้ามปนกัน:**

| ระดับ | อะไร | เก็บที่ | ใช้ทำอะไร |
|---|---|---|---|
| เอกสาร | title, author, subject, keywords, created/modified, running header/footer, มี TOC ไหม, มี page label ไหม · `page_count`, `quality_flag` | Postgres `documents` (`metadata` JSONB + คอลัมน์เดิม) | แสดงในหน้า `/knowledge`, `list_documents` (T9), ตรวจคุณภาพ |
| หน้า / ส่วน | `page`, `page_label`, `heading_path`, `slide`, `is_table` | `Section` (ในหน่วยความจำ) | ส่งต่อให้ chunker |
| chunk | `page`, `page_label`, `section`, `citation`, `token_count`, … | Qdrant payload | filter, แสดง citation, `get_document_chunk` |
- **pdf.py (PyMuPDF — ตรวจแล้ว 2026-10-27 ว่า PyMuPDF 2.0 ใน image มี `doc.metadata`, `doc.get_toc()`, `page.get_label()`, `page.find_tables()`, `get_text("blocks"/"dict")` ครบ):**
  - **ระดับเอกสาร:** `doc.metadata` → `title/author/subject/keywords` (strip, ตัดค่าว่าง, ตัดที่ 500 ตัวอักษร) + `creationDate`/`modDate` รูปแบบ `D:YYYYMMDDHHmmSS…` → ISO 8601 (parse ไม่ได้ → ข้าม) · `has_toc`, `page_labels` (bool) · running header/footer ที่ตัดออก (ดูข้อตัด header/footer) เก็บเป็น `running_header` / `running_footer`
  - **หัวข้อจาก TOC:** `doc.get_toc()` → `[level, title, page]` · หน้า p อยู่ใต้ entry สุดท้ายที่ `page ≤ p` → `heading_path` = สายของ title ตาม level (เช่น `["บทที่ 1 การลา", "1.1 ลาพักร้อน"]`) · หัวข้อที่เริ่มกลางหน้า: ทั้งหน้าใช้หัวข้อของ entry แรกที่ครอบหน้านั้น (ความละเอียดระดับหน้า) · ไม่มี TOC → `heading_path=[]` (เดาจากขนาดฟอนต์ใน `get_text("dict")` เป็น **ตัวเลือกเสริม ปิดไว้ก่อน** — วัดผลใน T11 ก่อนเปิด)
  - **page label:** `page.get_label()` → `Section.page_label` (`""` → None)
  - ต่อหน้า: `page.find_tables()` → `table.to_markdown()` เป็น Section `is_table=True`; ข้อความนอก bbox ตาราง จาก `page.get_text("blocks", sort=True)`
  - **ต่อบรรทัดที่ถูกตัดกลางประโยค (hard wrap)** ภายใน block เดียวกัน: ไทยต่อไทย → ต่อโดยไม่เว้นวรรค, อื่น ๆ → เว้น 1 ช่อง; ยกเว้นบรรทัดที่ขึ้นต้นด้วย bullet/เลขข้อ (`-`, `•`, `1.`, `๑.`, `(ก)`) ให้คงการขึ้นบรรทัด · block ต่างกัน → `\n\n` (เพราะ `split_sentences` ถือแต่ละบรรทัดเป็นขอบเขต — ดู T4)
  - ตัด header/footer: block ที่อยู่ในแถบบน/ล่าง ~8% ของความสูงหน้า (จาก bbox y) **และ** ข้อความ (แทนตัวเลขทุกตัวด้วย `#` ก่อนเทียบ เพื่อให้ `- 2 -` กับ `- 3 -` นับเป็นอันเดียวกัน) ซ้ำใน > 50% ของหน้า → ลบออกจากเนื้อหา แล้วเก็บข้อความตัวแทนไว้ใน metadata (เลขหน้าล้วน ๆ ไม่ต้องเก็บ) · เอกสาร < 3 หน้า → ไม่ตัด
  - quality_check ต่อหน้า: หน้าเพี้ยน → ข้าม + warning; ถ้า > 50% ของหน้าเพี้ยน → `garbled`
  - หน้าที่ข้อความ < 20 ตัวอักษรเกิน 80% ของเล่ม → raise `NeedsOcrError` (pipeline ตั้ง status `needs_ocr`)
  - PDF ตั้งรหัสผ่าน → `PermanentError("ไฟล์ PDF มีรหัสผ่าน กรุณาปลดรหัสก่อนอัปโหลด")`
- **docx.py (python-docx):**
  - ระดับเอกสาร: `document.core_properties` → `title/author/subject/keywords/created/modified` (รูปแบบเดียวกับ PDF)
  - วนเนื้อหาตามลำดับจริง (paragraph และ table สลับกัน) ด้วย `document.iter_inner_content()`
  - style `Heading N` / `Title` → `#`×N และอัปเดต `heading_path`; list → `- `; table → Markdown table
  - รวม header/footer ของเอกสาร **ไม่ต้อง** ใส่
- **pptx.py (python-pptx):**
  - ระดับเอกสาร: `presentation.core_properties` (เหมือน DOCX)
  - 1 Section ต่อสไลด์: `## สไลด์ {n}: {title}` + ข้อความทุก shape (recurse เข้า `MSO_SHAPE_TYPE.GROUP`) + table → Markdown + **speaker notes** (`slide.notes_slide.notes_text_frame.text` ถ้ามี) ภายใต้หัว `### Notes`
  - เรียง shape ตาม `(top, left)`
- **text.py (.txt/.md):**
  - decode: ลอง `utf-8-sig` → `cp874` (TIS-620) → `charset_normalizer.from_bytes(...).best()`; ถ้าไม่ได้ → `PermanentError`
  - `.md`: แบ่ง Section ตามหัวข้อ `#`; `.txt`: แบ่งตามย่อหน้า (`\n\n`)
- **DoD:** test ต่อ converter ด้วย fixture ที่ generate ในโค้ด test (python-docx / python-pptx / PyMuPDF `insert_text` ด้วยฟอนต์ไทย เช่น Noto Sans Thai — ถ้าไม่มีฟอนต์ให้ skip test PDF ไทยพร้อมเหตุผล) + PDF ที่ไม่มีข้อความ → `NeedsOcrError` + TXT ที่ encode ด้วย cp874 อ่านได้ถูก
- **สิ่งที่ทำจริง (ต่างจาก spec — ดู Progress Log 2026-10-27):**
  - **ตาราง PDF:** ไม่ใช้ `table.to_markdown()` เพราะ **ทิ้งสระบน/ล่างและวรรณยุกต์ไทย** (ได้ `ลาพกรอน` แทน `ลาพักร้อน`) → อ่านทีละ cell ด้วย `page.get_textbox(cell_bbox)` แล้วสร้าง Markdown เอง (`base.markdown_table`)
  - **อ่านข้อความจากตำแหน่งบรรทัด (แก้ 2026-10-28):** `find_tables()` ไม่เจอตาราง < 3 แถว / ตารางไม่มีเส้น และหน้า 2 คอลัมน์ออกมาเป็น block เดียวที่บรรทัดสลับซ้าย-ขวา → ใช้ `get_text("dict")` จัดบรรทัดที่อยู่ระดับเดียวกันเป็นแถว แล้ว: (1) แถวเรียงคอลัมน์ตรงกันตั้งแต่ 2 แถว + (มีเส้นตาราง หรือ ≥ 3 คอลัมน์ หรือข้อความในช่องสั้นเฉลี่ย ≤ 20 ตัวอักษร) → ตาราง Markdown (ช่องว่างคงคอลัมน์); (2) 2 คอลัมน์ข้อความยาว → อ่านคอลัมน์ซ้ายจบแล้วค่อยขวา; (3) ชิ้นข้างกันในแถวเดียว (เช่น `ชื่อ:` `ค่า`) → เว้นวรรค · ช่วงที่ตำแหน่งคอลัมน์ไม่ตรงกันไม่ถูกรวมเป็นตารางเดียว
  - converter คืนข้อความที่ `normalize` แล้วทุก Section (T8 normalize ซ้ำได้ไม่เสียหาย) และ `ConvertResult` มีฟิลด์ `quality_flag` เพิ่ม (PDF ตรวจทีละหน้า, ชนิดอื่นตรวจทั้งไฟล์ด้วย `base.text_quality`)
  - PDF ที่ทุกหน้าอ่านไม่ได้ → `GarbledTextError` (status `needs_ocr`, quality_flag `garbled`) แทนการคืน Section ว่าง
  - หัวข้อจาก TOC: หน้า p ใช้สายหัวข้อหลัง entry **สุดท้าย** ที่ `page ≤ p` (หลาย entry ในหน้าเดียวกัน → entry หลังสุดชนะ)
  - แถบหัว/ท้ายกระดาษ 10% ของความสูงหน้า (ไม่ใช่ 8%)
  - `.txt` = 1 Section (chunker แบ่งย่อหน้าเอง) และต่อ hard wrap · `.md` ต่อ soft wrap นอก code fence, หัวข้อใน code fence ไม่นับ
  - PPTX ข้ามสไลด์ที่ไม่มีทั้งหัวข้อ เนื้อหา และ notes · DOCX ไม่รวม header/footer ของหน้า, merged cell นับครั้งเดียว
  - `thai_text.normalize` แปลงขีดที่หน้าตาเหมือน `-` (U+2010/2011/2012/2212) เป็น `-` — PDF มักแปลง `-` เป็น U+2010 ทำให้ bullet ไม่ถูกจับ และ `KNOW-07` จาก PDF ค้นไม่เจอ (ยังไม่มีข้อมูล index จึงไม่ bump `TOKENIZER_VERSION`)
  - ต่อบรรทัด: ไทย+ไทยไม่เว้นวรรคเฉพาะ **ตัวอักษร** ไทย — ตัวเลขไทยท้ายบรรทัด (`ข้อ ๑` + `ดังนี้`) ยังเว้นวรรค
  - ฟอนต์ไทย (`fonts-tlwg-garuda-ttf`) ติดตั้งใน **dev image เท่านั้น** สำหรับสร้าง PDF ทดสอบ; test PDF ไทย skip พร้อมเหตุผลถ้าไม่มีฟอนต์
  - **metadata (v4.2):** PDF ที่ตั้ง `set_metadata` / `set_toc` / `set_page_labels` และมีหัว-ท้ายกระดาษซ้ำทุกหน้า → `metadata` มี title/author/created (ISO) และ `running_header`; หัว/ท้ายกระดาษไม่อยู่ใน `text` ของ Section ใด; `page_label` ตรง (`"i"`, `"1"`, …); `heading_path` ของแต่ละหน้าตรงกับ TOC · PDF ไม่มี TOC/label → `heading_path=[]`, `page_label=None` · บรรทัดไทยที่ถูกตัดกลางประโยคถูกต่อกลับ, bullet ไม่ถูกต่อ · DOCX/PPTX ได้ core properties · migration 002 รันซ้ำได้

### T7 — Chunker (KNOW-03)
```python
@dataclass
class Chunk:
    chunk_index: int
    text: str                  # เนื้อหา (เก็บใน payload)
    embed_text: str            # context header + text (ใช้ embed)
    token_count: int
    page: int | None; page_label: str | None; slide: int | None
    section: str | None        # heading_path joined ' > ' (DOCX/MD และ PDF ที่มี TOC)
    citation: str
```
- นับ token ด้วย `tiktoken.get_encoding(CHUNK_ENCODING)` โดย `CHUNK_ENCODING=o200k_base` (เปลี่ยนจาก `cl100k_base` ใน v4.1)
  - **เหตุผล (วัดแล้ว 2026-10-26):** เนื้อหาเดียวกัน `cl100k_base` ใช้ token กับภาษาไทยมากกว่าอังกฤษ ~4 เท่า (ไทย 1.06 ตัวอักษร/token vs อังกฤษ 5.15) → chunk 600 token ได้ไทยแค่ ~635 ตัวอักษร · `o200k_base` ได้ไทย 2.43 ตัวอักษร/token (~1,460 ตัวอักษรต่อ 600 token) ส่วนอังกฤษแทบเท่าเดิม (~3,050)
  - `token_count` ใน Chunk/payload = นับด้วย `CHUNK_ENCODING` (ไม่ใช่ token ที่ embedding model คิดเงิน)
  - ค่า 600/800/150 คงเดิม — ปรับด้วยผล T11
- อัลกอริทึม:
  1. ต่อ Section: แบ่งย่อหน้า (`\n\n`) → ย่อหน้าที่ยาวเกิน `CHUNK_MAX_TOKENS` → `split_sentences` → ประโยคที่ยังยาวเกิน → ตัดตาม token แข็ง
  2. รวมหน่วยต่อกันจนใกล้ `CHUNK_TARGET_TOKENS` (ห้ามเกิน MAX)
  3. Overlap: chunk ใหม่เริ่มด้วย `CHUNK_OVERLAP_SENTENCES` ประโยคสุดท้ายของ chunk ก่อน
  4. **ตารางห้ามตัดกลาง** — ถ้าตารางยาวเกิน MAX ให้ตัดตามแถว และใส่ header row ซ้ำทุกชิ้น
  5. **ไม่ข้ามหน้า/สไลด์** — chunk หนึ่งอยู่ในหน้า/สไลด์เดียว เพื่อให้ citation ถูกต้อง (ยกเว้น: สไลด์/หน้าที่สั้นกว่า `CHUNK_MIN_TOKENS` ให้รวมกับถัดไป และ citation เป็นช่วง เช่น `หน้า 3–4`)
- `embed_text` = `"[เอกสาร: {description}] [ไฟล์: {filename}] [หัวข้อ: {section}] [{citation_part}]\n{text}"` (ไม่มี section → ไม่ใส่ `[หัวข้อ: …]`)
  - metadata ระดับเอกสาร (title/author/วันที่) **ไม่** ใส่ใน `embed_text` หรือ `text` — คำเหล่านี้จะซ้ำทุก chunk ทำให้ BM25 เพี้ยน และ `description` ของลูกค้าบอกบริบทอยู่แล้ว
- `citation`: PDF `"{filename}, หน้า {page_label or page}"` + ` ({heading สุดท้าย})` ถ้ามี section — เช่น `"HR_Policy.pdf, หน้า 5 (1.1 ลาพักร้อน)"` · ช่วงหน้าใช้ label ทั้งสองฝั่ง (`หน้า 3–4`, `หน้า iv–1`) · PPTX `"{filename}, สไลด์ {n}"` · DOCX/MD `"{filename}, หัวข้อ {heading_path joined ' > '}"` · TXT `"{filename}, ส่วนที่ {i}"`
  - **เหตุผลที่ใช้ page_label:** รายงาน/เอกสารราชการมักมีหน้าคำนำเลขโรมัน — หน้าที่ 9 ในไฟล์อาจพิมพ์ว่า "5"; ถ้า citation บอก "หน้า 9" ผู้ใช้จะเปิดผิดหน้า
- **การรวมหน้าสั้น** (ข้อ 5 ด้านบน) ห้ามรวมข้ามหัวข้อ (`heading_path` ต่างกัน) — ให้ citation/section ยังถูกต้อง
- **DoD:** test ว่าไม่มี chunk เกิน MAX (นับด้วย `o200k_base`), overlap ถูก, ตารางไม่ถูกตัดกลางแถว, citation ถูกต้องทุกชนิดไฟล์ + test ว่าข้อความไทยล้วน ~3,000 ตัวอักษรได้ chunk ที่ยาวเฉลี่ย ≥ 1,000 ตัวอักษร (กันการถอยกลับไปใช้ `cl100k_base`)
- **สิ่งที่ทำจริง (ต่างจาก spec — ดู Progress Log 2026-10-27):**
  - `Chunk` มีฟิลด์เพิ่ม `page_end` / `slide_end` (เมื่อรวมหน้าสั้น) และ `is_table` → ใส่ใน payload ตอน T8 ด้วย
  - overlap ใช้เฉพาะภายในข้อความช่วงเดียวกัน (ไม่ข้ามหน้า/สไลด์/หัวข้อ/ตาราง), ใส่เฉพาะเมื่อ chunk ก่อนหน้ามีมากกว่า N ประโยค, และจำกัดไม่เกิน 25% ของ MAX (ไม่งั้นประโยคยาวจะถูกซ้ำทั้งก้อน)
  - ตารางเป็น chunk ของตัวเองเสมอ (ไม่รวมกับข้อความรอบข้าง) · หัวตารางใหญ่เกินครึ่ง MAX → แบ่งแบบข้อความทีละแถวโดยไม่ซ้ำหัว
  - หน้า/สไลด์สั้นรวมกับหน้าถัดไปเฉพาะเมื่อ ติดกัน + หัวข้อเดียวกัน + หน้าถัดไปไม่มีตาราง · ส่วนของ DOCX/MD (แบ่งตามหัวข้อ) **ไม่รวม** แม้จะสั้น เพื่อให้ citation หัวข้อถูก
  - ประโยคที่ยาวเกิน MAX ถูกตัดตาม token โดยถอยจุดตัดให้อยู่ระหว่างตัวอักษร (ไม่มีอักษรไทยแตก) — คำอาจขาดกลางได้ในกรณีนี้
  - `embed_text` ไม่ใส่ `[หัวข้อ: …]` ซ้ำเมื่อ citation ของ DOCX/MD เป็น `หัวข้อ …` อยู่แล้ว · ส่วนที่ไม่มีหัวข้อของ DOCX ใช้ `ส่วนที่ {i}`
  - tiktoken (`o200k_base`, `cl100k_base`) ถูกโหลดเก็บใน image ตอน build (`TIKTOKEN_CACHE_DIR=/opt/tiktoken-cache`) — ปกติ tiktoken ดาวน์โหลดไฟล์ตอนใช้ครั้งแรก ซึ่งจะพังถ้า server ไม่มีอินเทอร์เน็ต · test แล้วว่านับ token ได้ด้วย `--network none`
  - **metadata (v4.2):** PDF ที่มี page label → citation ใช้ label ไม่ใช่ลำดับหน้า; มี TOC → citation ต่อท้ายหัวข้อ และ `embed_text` มี `[หัวข้อ: …]`; ช่วงหน้าใช้ label; ไม่รวมหน้าสั้นข้ามหัวข้อ; ไม่มีคำจาก `documents.metadata` อยู่ใน `text`

### T8 — Embedder + Vector store + Pipeline (KNOW-04, KNOW-05)
- `embedder.py`: `client.embeddings.create(model=EMBED_MODEL, input=batch)` batch ละ 100; retry ด้วย tenacity สำหรับ 429/5xx (TransientError); คืน list ตามลำดับ input
  - **guard ขีดจำกัด model:** `text-embedding-3-small` นับด้วย `cl100k_base` รับได้ ≤ 8,191 token/input → ก่อนส่ง ตรวจ `len(cl100k.encode(embed_text)) <= EMBED_MAX_TOKENS` (default 8000) ถ้าเกิน → `PermanentError` (ไม่ควรเกิด: chunk 800 token `o200k_base` ภาษาไทย ≈ 1,850 token `cl100k_base`)
- `vector_store.py`: `upsert_chunks(doc, chunks, dense, sparse)` batch ละ 128 · `delete_by_doc(doc_id, org_id)` (**ทำแล้วใน T3**)
- `pipeline.process_document` ตอนนี้เป็นโครง (T3): เช็ก doc หาย/ถูกลบ/มี delete รอ → ตั้ง `extracting` → raise `PermanentError` "ยังประมวลผลไม่ได้" — T8 แทนที่ส่วนท้าย และต้องเรียก `ctx.check_stop()` ระหว่างขั้น (extract → chunk → embed → upsert) ให้ shutdown ไม่ต้องรอทั้งเอกสาร · converter ที่เจอ PDF สแกนให้ raise `errors.NeedsOcrError` (worker ตั้ง status/quality_flag = `needs_ocr` เอง)
- `pipeline.process_document(doc_id)`:
  1. โหลด doc + ไฟล์จาก Storage → เลือก converter ตาม `file_type`
  2. normalize ทุก Section → chunk
  3. ถ้าไม่มี chunk เลย → `failed` + error `"ไม่พบข้อความในเอกสาร"`
  4. dense = embed(`embed_text`), sparse = `bm25.encode_document(text)` (ใช้ `text` ไม่ใช่ `embed_text`)
  5. `delete_by_doc` ก่อน แล้ว upsert (ทำให้ reindex idempotent)
  6. อัปเดต `documents`: `indexed`, `chunk_count`, `page_count`, `quality_flag`, `metadata` (จาก `ConvertResult.metadata`), `embed_model`, `tokenizer_version`
- **สิ่งที่ทำจริง (ต่างจาก spec — ดู Progress Log 2026-10-27):**
  - openai 3.x (ไม่ใช่ 1.x ที่แผนสมมติ) — API `client.embeddings.create` เหมือนเดิม แต่ error ใช้ `httpx2` · จัดกลุ่ม error ตาม `status_code`: 429 / 5xx / เชื่อมต่อไม่ได้ → retry ในงานเดียวกัน 4 ครั้ง (tenacity) แล้วเป็น `TransientError`; **401/403 และไม่มี key → `TransientError`** (แก้ key แล้วงานที่ค้างเดินต่อเองภายในรอบ backoff); 400 อื่น ๆ → `PermanentError` · ขนาดเวกเตอร์ไม่ใช่ 1536 → `PermanentError`
  - payload เพิ่ม `page_end`, `slide_end`, `is_table` (จาก T7) · point id ใช้ namespace UUID คงที่ใน `vector_store.POINT_NAMESPACE`
  - warning ของ converter (เช่น หน้าที่อ่านไม่ได้) เก็บใน `documents.metadata.warnings` (สูงสุด 20)
  - ก่อน upsert เช็กอีกครั้งว่ามีคำสั่งลบเข้ามาระหว่าง embedding ไหม — ถ้ามี ข้ามการเขียน แล้วให้ job ลบทำงานต่อ
  - ไฟล์ต้นฉบับหายจาก storage → `PermanentError` (ไม่ retry); storage ล่ม → `TransientError`
  - ระหว่างรอ retry `documents.status` ค้างที่ขั้นล่าสุด (เช่น `embedding`) และ `pending_job` = `index` — UI (T2b) ควรแสดงจาก `pending_job`
- **DoD:** integration test (ใช้ Qdrant จริงจาก docker-compose, mock OpenAI ด้วย vector สุ่มแบบ deterministic): อัปโหลด 4 ชนิดไฟล์ → status `indexed`, จำนวน points = chunk_count, reindex แล้วจำนวน points ไม่เพิ่ม, delete แล้ว points หาย

### T9a — แก้ MCP tool dispatch ในแอป Next.js (prerequisite ของ T9, ทำก่อนหรือขนานกับ T3–T8 ได้)
> ปัญหา (§2): `executeMCPTool(toolName, …)` หา server ด้วย `WHERE t.name = $1 … LIMIT 1` → เมื่อมี MCP server หลาย org ที่ export `search_knowledge` เหมือนกัน คำค้นอาจไปผิด org · `getEnabledMCPTools` ส่ง function ชื่อซ้ำให้ LLM
- `lib/mcp.ts`:
  - `executeMCPTool` รับ **`toolId`** (หรือ `{serverId, toolName}`) แทนชื่อ แล้ว query `WHERE t.id = $1` · ส่ง `name` ดั้งเดิมของ tool ไปให้ MCP server (`client.callTool({ name: row.name })`)
  - `getEnabledMCPTools`: ถ้าชื่อ tool ซ้ำกันระหว่าง server ใน turn เดียว → ตั้งชื่อที่ส่งให้ LLM เป็น `<server_slug>__<tool_name>` (ตัดให้ ≤ 64 ตัว และตรง `^[a-zA-Z0-9_-]+$` ตามข้อจำกัด OpenAI function name) ไม่ซ้ำแน่นอน · `toolMap` เก็บ `exposedName → {serverId, toolId, originalName}`
- `lib/tool-executor.ts`: `resolveTurnTools` เก็บ `toolMap` ไว้ใน `TurnTools` (ปัจจุบันทิ้งไป) · `executeTool` แปลง `exposedName → toolId` ผ่าน `toolMap` แล้วเรียก `executeMCPTool(toolId, …)` — ชื่อที่ไม่อยู่ใน map → ปฏิเสธ (คงพฤติกรรม `allowedNames` เดิม)
- จุดที่เรียก `executeMCPTool`/`executeTool` อื่น: `lib/llm-core.ts` (agent loop) และ `app/api/admin/mcp-tools/test-execute/route.ts` (admin test ใช้ `allowedNames: null` → ให้ส่ง `toolId` ของแถวที่กดทดสอบ)
- ชื่อ tool ใน `chat_history` (tool turns) เป็น exposedName — ไม่ต้อง migrate ข้อมูลเก่า (แชทเก่าแค่แสดงผล)
- **DoD:** `npm run lint` + `npm run build` ผ่าน · ทดสอบด้วย MCP server 2 ตัวที่มี tool ชื่อเดียวกัน (เช่น ลงทะเบียน engine 2 แถวด้วย key ของ org A และ B): agent ของ org A (ผูกเฉพาะ tool ของ server A + `agent_groups` = group ของ org A) ค้นแล้วได้เฉพาะเอกสาร org A ทุกครั้ง · agent ที่ผูก tool ทั้งสอง server ได้ function 2 ชื่อไม่ซ้ำ · หน้า Admin > MCP "ทดสอบ tool" ยังใช้ได้

### T9 — Search + MCP server (KNOW-06, KNOW-07) → **MVP**
- `search.py`:
  ```python
  def search(org_id, query, top_k=5, tags=None, doc_ids=None, mode="hybrid") -> list[Hit]
  ```
  - `mode="dense"`: query dense อย่างเดียว
  - `mode="hybrid"` (default เมื่อ T10 เสร็จ): ดู T10
  - filter: `org_id` (บังคับ) + `tags` (any) + `doc_ids` (any) + `status` ของ doc ต้องไม่ใช่ deleted (ลบ points ตอน delete อยู่แล้ว)
- `mcp_server.py` (mcp 2.x: `from mcp.server.mcpserver import MCPServer` — FastMCP ถูกเปลี่ยนชื่อ, transport streamable-http; auth middleware ครอบ `mcp.streamable_http_app()`):
  - **Auth:** ASGI middleware อ่าน `Authorization: Bearer <key>` → sha256 → lookup `api_keys` → เก็บ `org_id` ใน `contextvars`; ไม่มี/ผิด/revoked → 401
  - 🔒 **ห้ามมี `org_id` เป็น parameter ของ tool ใด ๆ**
  - Tools:
    - `search_knowledge(query: str, top_k: int = 5, tags: list[str] | None = None, doc_ids: list[str] | None = None)` → JSON list ของ `{text, citation, filename, doc_id, chunk_index, score}`
    - `list_documents(tags: list[str] | None = None)` → `{doc_id, filename, description, tags, file_type, status, chunk_count}` เฉพาะ `indexed`
    - `get_document_chunk(doc_id: str, chunk_index: int, window: int = 1)` → chunk นั้น ± window (ต้องเช็กว่า doc อยู่ใน org เดียวกัน)
  - Tool description ของ `search_knowledge` ต้องบอก agent ว่า: *"ตอบโดยอ้างอิง citation ในรูปแบบ [citation] ทุกครั้ง ถ้าผลลัพธ์ไม่เกี่ยวข้องให้บอกว่าไม่พบข้อมูล อย่าแต่งเอง"*
  - script `python -m knowledge.mcp_server create-key --org <org_id> --label <label>` สร้าง key (พิมพ์ key ครั้งเดียว เก็บแค่ hash)
- **DoD:** test ว่า org A ค้นไม่เจอเอกสาร org B, key ผิดได้ 401, `get_document_chunk` ข้าม org ไม่ได้ + ทดสอบจริงด้วย MCP client (หรือ Claude Desktop/Code) ค้นเอกสารไทยแล้วได้ citation + ลงทะเบียนในแอป NeuronKnowledge **1 แถวต่อ org** (`Admin > MCP`, ชื่อเช่น `Knowledge – <org_id>`, transport Streamable HTTP, URL `http://localhost:8765/mcp`, header `Authorization: Bearer <key ของ org>`) แล้ว Sync tools → สร้าง agent "Knowledge – <org_id>" ผูกเฉพาะ tool ของแถวนั้น + `agent_groups` = group ของ org → ถามผ่านหน้าแชทได้และได้ citation (ต้องผ่าน T9a แล้ว) · วัด latency ต่อการค้น (รวม handshake ของ `createMCPClient`) บันทึกใน Progress Log
- system prompt ของ agent Knowledge ต้องสั่งให้อ้าง `[citation]` และตอบ "ไม่พบข้อมูล" เมื่อผลไม่เกี่ยวข้อง (core prompt ของแอปถือ tool result เป็น data จึงห้ามพึ่งข้อความสั่งที่อยู่ในผลค้นหา)

- **สิ่งที่ทำจริง (ดู Progress Log 2026-10-28):**
  - auth: ASGI middleware ปฏิเสธคำขอที่ไม่มี key / key ผิด / ถูก revoke ด้วย 401 ก่อนถึง SDK และใน tool อ่าน key จาก `Context.headers` (mcp 2.x ส่ง header ของคำขอ HTTP มาให้ทุก tool) แล้วหา org อีกครั้ง — ไม่ใช้ `contextvars` เพราะ SDK รัน tool คนละ task กับ middleware
  - server เป็นแบบ **stateless + ตอบเป็น JSON** (`stateless_http=True, json_response=True`) → เปิด `mcp` หลาย container ได้
  - error ที่ผู้ใช้ควรเห็นใช้ `ToolError` (mcp 2.x ซ่อนข้อความของ exception อื่นเป็น "Error executing tool …") — เช่น ไม่มี OPENAI_API_KEY → "ค้นหาไม่สำเร็จ: OPENAI_API_KEY ยังไม่ได้ตั้งค่า…"
  - ผลลัพธ์เป็นข้อความ JSON `{results: [...]}` / `{documents: [...]}` / `{chunks: [...]}` · ค้นไม่เจอ → `{results: [], note: "ไม่พบข้อมูล…"}`
  - คำสั่ง key: `create-key`, `list-keys`, `revoke-key` · key รูปแบบ `kn_…` · cache ผล lookup 30 วินาที (key ที่ revoke หยุดทำงานภายใน 30 วินาที)
  - T9 ค้นแบบ dense อย่างเดียว · hybrid + rerank อยู่ใน T10
> ✅ **MVP checkpoint** — หยุดแจ้งผู้ใช้ให้ทดลองกับไฟล์จริงก่อนทำ T10

### T10 — Hybrid search + Rerank (KNOW-09)
```python
client.query_points(
    collection_name, limit=20, query_filter=org_filter, with_payload=True,
    prefetch=[
        models.Prefetch(query=dense_vec, using="dense", limit=30, filter=org_filter),
        models.Prefetch(query=bm25.encode_query(q), using="bm25", limit=30, filter=org_filter),
    ],
    query=models.FusionQuery(fusion=models.Fusion.RRF),
)
```
- ถ้า `encode_query` ว่าง (มีแต่ stopword) → fallback dense อย่างเดียว
- `rerank.py`: `sentence_transformers.CrossEncoder(RERANK_MODEL, max_length=RERANK_MAX_LENGTH)` โหลดครั้งเดียว; rerank 20 → top_k; ถ้า `RERANK_ENABLED=false` → ตัด top_k จาก RRF
  - `RERANK_MAX_LENGTH=1024` ตั้งให้ชัดเสมอ — chunk ไทย (~1,460 ตัวอักษร) + query อาจเกินค่า default ของ model แล้วท้าย chunk ถูกตัดทิ้งก่อนให้คะแนน · test ว่า chunk ที่ยาวที่สุดใน fixture + query ไม่ถูก truncate (นับด้วย tokenizer ของ reranker)
- **fallback เพิ่ม (2026-10-28):** OpenAI ใช้ไม่ได้ → BM25 อย่างเดียว (ไม่มี term ให้ BM25 → แจ้งเหตุผล) · `mode="dense"/"sparse"` สำหรับ eval
- **image:** `mcp` มี tag ของตัวเอง `knowledge-engine:mcp-${MCP_TARGET}` · rerank: `MCP_TARGET=rerank` (dev: `MCP_DEV_TARGET=dev-rerank`) + `RERANK_ENABLED=true`
- **DoD:** test ว่าคำค้นที่เป็นชื่อเฉพาะ/รหัส (เช่น `"KNOW-07"` หรือชื่อสินค้าใน custom dict) ที่ dense หาไม่เจอ hybrid หาเจอ; MCP ใช้ hybrid เป็น default

### T11 — Evaluation
- `eval/questions.jsonl`: `{"q": "...", "org_id": "...", "expected_doc_id": "...", "expected_citation_contains": "หน้า 5"}`
  - **ผู้ใช้ต้องเตรียมคำถามจริง 30–50 ข้อจากเอกสารจริง** — Claude สร้าง template + ตัวอย่าง 3 ข้อให้ แล้วขอให้ผู้ใช้เติม
  - ให้ครอบทุกชนิดไฟล์ และมีคำถามแบบชื่อเฉพาะ/ตัวเลขอย่างน้อย 30%
- `eval/run_eval.py`: วัด recall@5 และ MRR สำหรับ `dense`, `hybrid`, `hybrid+rerank` → ตารางเปรียบเทียบ
- ใช้ผลเพื่อปรับ `BM25_AVGDL` (ตั้งเป็นค่าเฉลี่ยจำนวน term จริงต่อ chunk — ค่า default 300 น่าจะต่ำไปหลังเปลี่ยนเป็น `o200k_base` เพราะ chunk ไทยยาวขึ้น ~2.3 เท่า), `CHUNK_TARGET_TOKENS`, `GARBLED_THRESHOLD`, `top_k` default ของ `search_knowledge`
- รายงานเพิ่ม: ความยาวเฉลี่ย chunk (ตัวอักษร) แยกไทย/อังกฤษ และ input token ที่ผลค้น top_k ส่งเข้า LLM ในแชทต่อครั้ง (chunk ใหญ่ขึ้น → ประมาณ 2 เท่าของแบบเดิม; ถ้าแพงไปให้ลด `top_k` เหลือ 3–4)
- **DoD:** รัน eval ได้ และรายงานผลใน Progress Log

---

## 9. ข้อห้าม / ข้อควรระวัง

- ❌ ห้าม query Qdrant โดยไม่มี filter `org_id`
- ❌ ห้ามรับ `org_id` จาก tool argument หรือ request body ที่ผู้ใช้ปลอมได้
- ❌ ห้ามเปลี่ยน embedding model โดยไม่ reindex ทั้งหมด (ตรวจ `embed_model` ใน payload)
- ❌ ห้ามแก้ `custom_words.txt` / กฎตัดคำ โดยไม่ bump `TOKENIZER_VERSION` และ reindex
- ❌ ห้าม log เนื้อหาเอกสารลูกค้าเต็ม ๆ (log แค่ doc_id, จำนวน chunk, error)
- ❌ ห้ามเปิด `api` (internal) ออกนอกเครื่อง/เครือข่ายภายใน และห้ามส่ง `KNOWLEDGE_API_TOKEN` ไปฝั่ง browser
- ❌ ห้ามลงทะเบียน MCP server ของหลาย org ในแอปก่อน T9a เสร็จ (เรียก tool ผิด org ได้)
- ❌ ห้ามสร้าง/แก้ตารางของ engine ใน `lib/db.ts` หรือ `scripts/schema.sql` — schema `knowledge` เป็นของ `migrate` เท่านั้น
- ❌ ห้าม commit `.env` / ห้ามตั้งชื่อ template ว่า `.env.example` (ใช้ `example.env`)
- ⚠️ PyThaiNLP โหลด dictionary/โมเดล crfcut ครั้งแรกช้า → โหลดครั้งเดียวตอน worker start
- ⚠️ `newmm` อาจช้ากับข้อความยาวมาก ๆ → ตัดตามย่อหน้าก่อนส่งเข้า tokenizer เสมอ

---

## 10. Phase ถัดไป (ยังไม่ทำ — อ้างอิงเท่านั้น)

| Ticket | งาน | จุดเชื่อม |
|---|---|---|
| KNOW-10 | Ready Knowledge Library | ข้อมูลของ `org_id="imc"` ผ่าน pipeline เดิม |
| KNOW-11 | Hybrid agent (IMC + org) | filter `org_id IN [org, "imc"]` + บอกแหล่งใน citation · ต้องออกแบบให้ key 1 ตัวเข้าถึงได้หลาย org (เช่น `api_keys.extra_org_ids TEXT[]`) เพราะแอปผูก key กับแถว `mcp_servers` |
| KNOW-12 | Connectors + XLSX/CSV/HTML/Office เก่า | converter ใหม่ → คิวเดิม |
| KNOW-13 | OCR | ✅ ทำแล้ว 2026-10-28 (OpenAI vision): PDF สแกน, หน้าสแกนปน, JPG/PNG · ยังไม่ทำ: PDF ฟอนต์เสีย (`garbled`) |

---

## 11. Checklist

- [x] T1 Scaffold + Docker
- [x] T2a Internal upload API — FastAPI (KNOW-01, 02)
- [x] T2b หน้า `/knowledge` + route handlers + `groups.org_id` — Next.js (KNOW-01, 02)
- [x] T3 Worker + job queue (KNOW-08)
- [x] T4 thai_text.py
- [x] T5 bm25.py
- [x] T6 Converters: PDF / DOCX / PPTX / TXT-MD (+ metadata 3 ระดับ, migration 002 — v4.2)
- [x] T7 Chunker
- [x] T8 Embedder + Vector store + Pipeline (KNOW-04, 05)
- [x] T9a แก้ MCP tool dispatch ในแอป (ตาม tool id, ชื่อไม่ซ้ำ)
- [x] T9 Search + MCP server (KNOW-06, 07) → **MVP** (โค้ดเสร็จ — รอทดลองกับไฟล์จริงเมื่อมี OPENAI_API_KEY)
- [x] T10 Hybrid + Rerank (KNOW-09) — rerank ปิดไว้เป็นค่าเริ่มต้น
- [x] T11 Evaluation (เครื่องมือเสร็จ — รอคำถามจริง 30–50 ข้อจากผู้ใช้เพื่อรันกับเอกสารจริง)

---

## 12. Progress Log

> Claude: เพิ่มบันทึกต่อท้ายทุกครั้งที่จบ Task — วันที่, Task, สิ่งที่ทำ, test ที่ผ่าน, ปัญหา/การตัดสินใจ, ไฟล์ที่แก้

| วันที่ | Task | สรุป |
|---|---|---|
| 2026-10-26 | สำรวจ repo (ก่อน T1) | ไม่มีหน้า/endpoint upload และไม่มีแนวคิด org · แอปเป็น MCP client (headers ต่อ server row) · พบบั๊ก `executeMCPTool` เลือก server ตามชื่อ tool (`LIMIT 1`) → เพิ่ม T9a · ผู้ใช้ยืนยัน Q1–Q3: upload ใน Next.js + FastAPI internal (T2a/T2b), `groups.org_id`, DB เดียวกับแอปแต่ schema `knowledge` · template env ใช้ชื่อ `example.env` (`.gitignore` มี `.env*`) · Next.js 16: `middleware.ts` → `proxy.ts` · ไฟล์ที่แก้: แผนนี้เท่านั้น |
| 2026-10-26 | ปรับ T7/T8/T10/T11 (v4.1) | วัดด้วย tiktoken: ย่อหน้าเดียวกัน ไทย 311 ตัวอักษร = 294 token (`cl100k_base`) / 128 token (`o200k_base`), อังกฤษ 371 ตัวอักษร = 72 / 73 token → เปลี่ยนตัวนับ chunk เป็น `o200k_base` (ไทย ~635 → ~1,460 ตัวอักษรต่อ chunk) · เพิ่ม guard `EMBED_MAX_TOKENS` (นับ `cl100k_base`) ใน T8, `RERANK_MAX_LENGTH=1024` ใน T10, ให้ T11 ปรับ `BM25_AVGDL`/`top_k` และรายงาน token ที่ส่งเข้า LLM · ยังไม่มีข้อมูล index จึงไม่ต้อง reindex · ไฟล์ที่แก้: แผนนี้เท่านั้น |
| 2026-10-26 | T1 Scaffold + Docker | สร้าง `knowledge-engine/` (pyproject, example.env, Dockerfile targets base/dev/rerank, compose + override, migrations/001_init.sql, config/db/migrate/vector_store, stub api/worker/mcp, tests) · **DoD:** `--profile standalone-db up -d --build` จากศูนย์ → qdrant/postgres/api/mcp healthy, worker running, migrate exit 0 · ตาราง 4 ตัวอยู่ใน `knowledge.*` เท่านั้น · collection `knowledge` (dense 1536 Cosine + bm25 IDF + index org_id[tenant]/doc_id/tags) · migrate ซ้ำ = up to date · `docker compose run --rm worker pytest` 19 passed · ruff ผ่าน · MCP ตอบ `initialize` ที่ `localhost:8765/mcp` · **image:** base 1.03 GB ไม่มี torch (deps 614 MB: pymupdf 116 MB, onnxruntime 68 MB, pythainlp 67 MB), dev 1.09 GB · ไม่ต้องใช้ build-essential (python-crfsuite มี wheel) · **เบี่ยงจากแผน:** (1) MinIO ไม่มี image แล้ว → ตัดออก, dev ใช้ local storage (2) mcp 2.3 → `MCPServer` แทน `FastMCP`, pin `mcp>=2.3,<3` (3) build image เฉพาะ service `migrate` (build tag เดียวกันขนานกันชน) และ service อื่น `pull_policy: never` (4) qdrant pin `v1.19.2` (v1.20.0 เพิ่งออก 5 วัน) (5) PyThaiNLP 5.4 ใช้ `PYTHAINLP_DATA` แทน `PYTHAINLP_DATA_DIR` (6) postgres standalone เปิด port 5433 (5432 ของเครื่องมี Postgres อยู่) · **ยังไม่ได้ทดสอบกับ Postgres ของแอป:** `.env` ของแอปชี้ server ภายนอก (114.119.173.23) — ยังไม่ได้รัน migrate ที่นั่น รอผู้ใช้ยืนยัน |
| 2026-10-26 | T2a Internal upload API | `api.py` (create_app + lifespan: ตรวจ token ≥ 32 ตัว, psycopg pool), `storage.py` (LocalStorage เขียนแบบ atomic + กัน path traversal, S3Storage), `file_types.py` (นามสกุล + magic bytes, `decode_text` utf-8-sig → cp874 → charset_normalizer) · endpoints: `GET /healthz`, `POST /documents` (201), `GET /documents?status=&tag=&limit=&offset=`, `GET /documents/{id}`, `POST /documents/{id}/reindex` (202), `DELETE /documents/{id}` (202) · error ทุกตัวเป็น `{"error": "<ไทย>"}` (409 มี `doc_id`) · **test:** 86 passed (เพิ่ม 67: upload 5 ชนิด, ชนิดไม่รองรับ, ไฟล์ปลอมนามสกุล .exe→.pdf / docx→pptx, ไฟล์ซ้ำ 409 + ข้าม org ได้, description ว่าง/สั้น, ไฟล์ว่าง, เกินขนาด 413, path traversal ในชื่อไฟล์, token ผิด/ไม่มี 401, X-Org-Id ผิด/ไม่มี 400, org ใน query/body ถูกเมิน, org B เห็น/reindex/ลบของ org A ไม่ได้, filter, reindex/delete idempotent, อัปโหลดซ้ำหลังลบได้, S3Storage ด้วย botocore Stubber) · ruff ผ่าน · smoke test service จริงด้วย curl + httpx (ชื่อไฟล์ไทยเก็บถูกต้อง) · **การตัดสินใจเพิ่ม:** description ยาวได้ ≤ 1,000 ตัวอักษร (ถูกใส่ใน embed_text ทุก chunk), tag ≤ 20 รายการ × 50 ตัวอักษร, ชื่อไฟล์ตัด directory/อักขระควบคุม/จุดนำหน้า ยาว ≤ 200, response มี `pending_job` (kind ของ job ที่ queued/running) ให้ UI แสดง "กำลังลบ/กำลังประมวลผล", ปิด `/docs` และ `/openapi.json`, ใช้ advisory lock กันอัปโหลดไฟล์เดียวกันพร้อมกัน, เพิ่ม dependency `psycopg[pool]` · **ยังไม่ได้ทดสอบ:** S3Storage กับ S3 จริง (ไม่มี S3 ใน dev หลังตัด MinIO), การอัปโหลดพร้อมกันหลาย request (มี advisory lock แต่ยังไม่มี test) |
| 2026-10-26 | T3 Worker + job queue | `worker.py` (class `Worker`: claim ด้วย `FOR UPDATE SKIP LOCKED` + ข้าม doc ที่มี job running + advisory lock ต่อ doc, retry `2^attempts` นาที, `requeue_stale`, `Heartbeat` thread อัปเดต `locked_at` ทุก 60 วิ, `run_forever` reconnect เมื่อ DB หลุด, SIGINT/SIGTERM), `errors.py` (`PermanentError`, `NeedsOcrError`, `TransientError`, `JobInterrupted`), `pipeline.py` (`WorkerContext`, `delete_document` ครบ, `process_document` เป็นโครงรอ T6–T8), `vector_store.delete_by_doc` (filter org_id + doc_id) · **test:** 104 passed (เพิ่ม 18: 4 worker แย่งคิว 40 job ไม่ซ้ำ, 1 job ต่อ doc, doc ถูก lock → คืนคิวไม่นับ attempt, backoff 2→4 นาทีแล้ว failed, exception อื่น retry, PermanentError/NeedsOcrError ไม่ retry, delete ล้มไม่เปลี่ยน status, kind ไม่รู้จัก, JobInterrupted คืนคิว, stale → queued/failed, heartbeat, run_forever หยุดได้, delete ลบ points เฉพาะ org+doc + ไฟล์ + status deleted, index ข้ามเมื่อมี delete รอ) · **smoke test:** `--scale worker=3` กับ stack จริง: upload → worker-1 ทำ index (failed ด้วยข้อความ "ยังประมวลผลไม่ได้" ตามคาด) → delete → worker-2 ลบไฟล์ + status deleted · `docker compose stop worker` ออกด้วย exit 0 ใน ~4 วิ · **การตัดสินใจเพิ่ม:** exception ที่ไม่รู้จักถือเป็น transient (retry) · job delete ที่ล้มถาวรไม่เปลี่ยน status เอกสาร แค่ใส่ error · stale job ที่ attempts ครบแล้วเป็น failed · ruff line-length 120 · dev override mount `pyproject.toml` ด้วย (ไม่งั้น pytest/ruff ใน container อ่าน config เก่าใน image) · **ข้อควรรู้:** ระหว่างนี้ทุกไฟล์ที่อัปโหลดจะ failed ทันทีที่ worker หยิบ จนกว่า T8 จะเสร็จ (สั่ง reindex ได้ภายหลัง) |
| 2026-10-26 | T4 thai_text.py | `normalize` (NFC, ลบ zero-width, แก้สระ/วรรณยุกต์ต่อบรรทัด, ยุบช่องว่าง, เก็บ `

`), `tokenize_words` (run ไทย→newmm + คำ/โค้ดภาษาอื่นเป็นก้อน + สัญลักษณ์แยก), `split_sentences` (crfcut / regex อังกฤษ, ทีละบรรทัด), `quality_check` (dictionary score + invalid_ratio), `get_trie` อ่าน `CUSTOM_WORDS_PATH` ตอนเรียก (เดิมผูกตอน import) · `custom_words.txt` เพิ่ม `นิวรอนโนวเลจ`, `ไอเอ็มซี` (ยังไม่มีข้อมูล index → ไม่ต้อง bump version) · **วัดก่อนออกแบบ:** dictionary score — ไทยปกติ 1.0, ชื่อคน/เบอร์ 0.94, ช่องว่างทุกตัวอักษร 0.0, glyph ฟอนต์เก่า 0.53, สระหน้าสลับที่ 0.78 ❌, วรรณยุกต์ก่อนสระ 0.94 ❌ → เพิ่ม invalid_ratio: ไทยปกติ 0.000, สระหน้าสลับ 0.113, วรรณยุกต์สลับ 0.014, ช่องว่าง 0.333, glyph 0.176 · คำใน dictionary 3,000 คำสุ่ม ถูกตีว่าผิด 0 คำ · **test:** 131 passed (T4 เพิ่ม 27: normalize 6 กรณี + เก็บย่อหน้า + idempotent, ไทยปกติ ok, ไทยมีชื่อ/เลขไทย/อังกฤษ ok, เพี้ยน 4 แบบ garbled, normalize ซ่อมวรรณยุกต์สลับได้ก่อนตรวจ, อังกฤษ/ไทยน้อย ok, threshold ปรับได้, token ไม่มีช่องว่าง, โค้ดอย่าง `KNOW-07` อยู่ครบ, custom words ทั้งไฟล์จริงและไฟล์ทดสอบไม่ถูกตัด, ตัดประโยคไทย/อังกฤษ/ทีละบรรทัด) · ruff ผ่าน · rebuild image (warmup ตอน build ผ่าน) · **ส่งต่อ T5:** token มีสัญลักษณ์ (`(`, `,`, `@`) → `bm25_terms` ต้องตัดทิ้ง; โค้ดอย่าง `KNOW-07` เป็น token เดียว (ค้น `KNOW 07` แบบเว้นวรรคจะไม่ตรง) |
| 2026-10-27 | ออกแบบ metadata PDF (v4.2, ยังไม่เขียนโค้ด) | แยก metadata 3 ระดับ: เอกสาร → `documents.metadata` JSONB (migration 002: title/author/subject/keywords/created/modified/running header-footer/has_toc/page_labels), หน้า → `Section.page_label` + `heading_path` จาก TOC, chunk → payload `page_label` + `section` + citation `หน้า {label} ({หัวข้อ})` · ตรวจ PyMuPDF 2.0 ใน image แล้ว: `doc.metadata`, `get_toc()`, `get_label()` (ตัวอย่างได้ `['i','1','2']`), `find_tables()`, `get_text("blocks"/"dict")` ใช้ได้ · เพิ่มการต่อบรรทัด hard wrap และตัดหัว/ท้ายกระดาษด้วยตำแหน่ง bbox + ข้อความซ้ำ (แทนเลขด้วย `#`) · metadata ระดับเอกสารไม่เข้า payload/text (กัน BM25 เพี้ยน) · แก้ T6 / T7 / T8 / §5 / §6 · **ค้างจากวันเดียวกัน:** `quality_check` ตีข้อความราชการที่มีคำย่อมาก (ก.พ., พ.ศ., สป.อว.) ว่า garbled (score 0.50) — ต้องแก้ก่อน T6 |
| 2026-10-27 | แก้ quality_check (T4) + T5 bm25.py | **quality_check:** คำย่อ (ก.พ., พ.ศ., สป.อว., ศ.ดร., มก.) ทำให้ข้อความราชการถูกตีว่า garbled (score 0.50) → ข้าม Thai run ≤ 5 ตัวที่ตามด้วย `.` ตอนคิด score และตัดสินจากไทยส่วนที่เหลือ · หลังแก้: ราชการ 1.00, ไม่เว้นวรรค 0.73, คำย่อล้วน ok, ตำแหน่งวิชาการ 0.93, บริษัท 0.92 · ข้อความเพี้ยนที่มีคำย่อปน และ "ทุกตัวอักษรมีจุด" ยังถูกจับ · **พบเพิ่ม:** เครื่องมือ Write/Edit แปลง escape `\uXXXX` ในโค้ดเป็นอักขระจริง (มองไม่เห็น เช่น U+0E00, zero-width, U+2028) ใน `thai_text.py` และ test 2 ไฟล์ — แปลงกลับเป็น escape 34 ตัว (พฤติกรรมเดิม test ผ่านอยู่แล้ว) และ regex ใหม่ใช้ช่วง `ก-๛` ที่มองเห็นได้ · **T5:** `bm25.py` (`bm25_terms`, `term_id` = mmh3 unsigned, `encode_document` สูตร BM25 + รวม id ที่ชนกัน, `encode_query` ค่า 1.0, `is_empty`, `Bm25Params`) · `tokenize_words` เพิ่ม token คำย่อไทย · stopword ไทยใช้รายการสั้นของเราเอง (เหตุผลใน T5) · **test:** 157 passed ×2 รอบ (เพิ่ม 15: realistic text 10 แบบ ok, คำย่อซ่อนข้อความเพี้ยนไม่ได้; bm25 16 กรณี: stopword/สัญลักษณ์/ตัวเดี่ยว, คำที่มีความหมายไม่ถูกตัด, tf, case/เลขไทย/normalize, คำย่อ+โค้ดเป็น term เดียว, doc/query id ตรงกัน, indices unique+sorted, id ชนกันถูกรวม, ค่า query = 1, สูตร BM25 (saturation, ความยาวเอกสาร, b=0), ข้อความว่าง → vector ว่าง, **ค้นจริงใน Qdrant** ด้วย sparse + filter org: `KNOW-07` → ticket, "ลาพักร้อนได้สูงสุดกี่วัน" → leave, "ลาป่วยต้องมีใบรับรองแพทย์ไหม" → sick, `ประกาศ ก.พ.` → leave อย่างเดียว, point ที่ไม่มี sparse ไม่ทำให้ค้นพัง) · ruff ผ่าน |
| 2026-10-27 | T6 Converters + metadata | `migrations/002_document_metadata.sql` (`documents.metadata JSONB DEFAULT '{}'`, รันผ่าน service `migrate` จริงแล้ว) · `converters/` = `base.py` (`Section` + `page_label`, `ConvertResult` + `metadata` + `quality_flag`, `GarbledTextError`, `clean_value`, `pdf_date`, `core_properties_metadata`, `join_wrapped_lines`, `markdown_table`, `text_quality`), `pdf.py`, `docx.py`, `pptx.py`, `text.py`, `convert()` · API คืน `metadata` · dev image มีฟอนต์ Garuda · **probe ก่อนเขียน:** PyMuPDF `table.to_markdown()` ทิ้งสระ/วรรณยุกต์ไทยในตาราง → อ่านทีละ cell ด้วย `get_textbox` (ได้ครบ) · PDF แปลง `-` เป็น U+2010 → เพิ่มการแปลงใน `normalize` · **test:** 205 passed ×2 รอบ (เพิ่ม 48: PDF — ข้อความไทย/เลขหน้า/ต่อบรรทัดไทย, bullet ไม่ถูกต่อ, หัว-ท้ายกระดาษซ้ำถูกตัดและหัวกระดาษเก็บใน metadata, เอกสาร < 3 หน้าไม่ตัด, metadata + TOC + page label (`i`,`1`,`2`,`3`), ไม่มี TOC/label, `pdf_date` 8 แบบ, ตารางไทยสระครบ + ลำดับก่อน/ตาราง/หลัง + ไม่อ่านซ้ำ, PDF สแกน → NeedsOcr, รหัสผ่าน, ไฟล์เสีย, หน้าเพี้ยน 1/3 → partial_garbled + warning, 2/3 → garbled, ทั้งเล่ม → GarbledTextError; DOCX — แบ่งตามหัวข้อ + heading_path, list รวมกัน, ตาราง + merged cell + escape `|`, core properties, ไม่เอา header หน้า, ไฟล์เสีย; PPTX — 1 Section/สไลด์ เรียงบน→ล่าง + group + notes + ตาราง, ข้ามสไลด์ว่าง, ไฟล์เสีย; MD — หัวข้อ/code fence/soft wrap/list; TXT — 1 Section + ต่อบรรทัด, cp874, binary, ไฟล์ว่าง; helper — ต่อบรรทัด 8 แบบ, markdown_table, clean_value; normalize ขีด 4 แบบ; bm25 `KNOW‐07` จาก PDF = `know-07`; migration 001+002 idempotent; API คืน metadata) · ruff ผ่าน · **ยังไม่ได้ทดสอบ:** PDF จริงของลูกค้า (fixture ทั้งหมดสร้างในโค้ด — ควรเก็บไฟล์จริงไว้ใน `tests/fixtures/real/` ก่อน T11), PDF ที่เป็นภาพสแกนบางหน้าปนข้อความ, การเดาหัวข้อจากขนาดฟอนต์ (ยังปิดไว้ตามแผน) |
| 2026-10-27 | T7 Chunker | `chunker.py` (`ChunkParams` จาก settings, `Chunk`, `count_tokens`, `hard_split`, `chunk_document`, `warmup`) · Dockerfile: `TIKTOKEN_CACHE_DIR` + warmup ตอน build, worker เรียก `chunker.warmup()` · **test:** 228 passed ×2 รอบ (เพิ่ม 23: ไม่มี chunk เกิน MAX และ token_count ตรง, ข้อความไทย > 3,000 ตัวอักษรได้ chunk เฉลี่ย ≥ 1,000 ตัวอักษร, hard split ไม่ทำอักษรแตก + อักษรเดียวใหญ่กว่าขีดจำกัดเก็บทั้งตัว, ทุกย่อหน้าอยู่ใน chunk, ข้อความที่ต้องตัดแข็งไม่หาย, overlap 2 ประโยค, overlap ถูกจำกัด 25%, ไม่ overlap ข้ามหน้า/ตาราง, ปิด overlap ได้, ตารางยาวแบ่งตามแถว + หัวซ้ำ + ทุกแถวครบตามลำดับ, ตารางสั้นอยู่ระหว่างข้อความ, citation PDF ใช้ label + หัวข้อ + embed_text ตรงรูปแบบ, PDF ไม่มี label/หัวข้อ, หน้าสั้นรวมเป็นช่วง `หน้า iv–…`, ไม่รวมข้ามหัวข้อ/ตาราง/หน้าไม่ติดกัน, สไลด์ + รวมสไลด์สั้น `สไลด์ 2–3`, DOCX/MD อ้างหัวข้อ, TXT `ส่วนที่ i`, text ไม่มี header, input ว่าง, params จาก settings) · end-to-end PDF → convert → chunk: `หน้า i`, `หน้า 1 (บทที่ 1 การลา)`, ตารางเป็น chunk แยก · **ข้อสังเกต:** บรรทัดสั้นก่อนตาราง (เช่น ชื่อตาราง) กลายเป็น chunk เล็กของตัวเอง — อาจรวมเป็นคำบรรยายของตาราง (ปรับตามผล T11) · **ค้างจาก T6:** ตารางที่ PyMuPDF หาไม่เจอ (< 3 แถว) → ข้อความในช่องถูกต่อติดกัน (`รายการจำนวนหมายเหตุ`) ยังไม่ได้แก้ |
| 2026-10-27 | T8 Embedder + Vector store + Pipeline | `embedder.py` (`OpenAIEmbedder`: batch 100, เรียงตาม index, retry tenacity, guard cl100k ≤ `EMBED_MAX_TOKENS`, ตรวจขนาด 1536), `vector_store` (`point_id`, `chunk_payload`, `upsert_chunks` batch 128 ไม่ใส่ sparse ที่ว่าง, `count_doc_points`), `pipeline.process_document` ครบ (extracting → chunking → embedding → delete_by_doc → upsert → indexed + chunk_count/page_count/quality_flag/metadata/embed_model/tokenizer_version, `ctx.check_stop()` ระหว่างขั้น), `WorkerContext.embedder`, worker สร้าง `OpenAIEmbedder` และเตือนเมื่อไม่มี key, `Bm25Params.from_settings(settings)` · **test:** 255 passed ×2 รอบ (เพิ่ม 27: embedder 12 — batch 250 → 100/100/50 เรียงถูก, retry 429/503/connection/timeout, หมด retry → Transient, 400 → Permanent ไม่ retry, 401 → Transient, ไม่มี key, ข้อความยาวเกิน → Permanent ก่อนเรียก API, ขนาดเวกเตอร์ผิด, response ขาด; pipeline ผ่าน API + worker + Postgres + Qdrant จริง (mock แค่ OpenAI) 15 — **อัปโหลด 5 ชนิด (PDF/DOCX/PPTX/TXT/MD) → indexed, points = chunk_count, payload/citation ถูก**, ค้น BM25 เจอใน org และไม่เจอข้าม org, เก็บ dense+sparse, metadata+quality ของ PDF, **reindex ไม่เพิ่ม points + ไฟล์สั้นลง points ลดตาม**, **ลบ → points หาย + ไฟล์หาย + deleted**, ลบระหว่าง embedding ชนะ, สถานะผ่าน embedding, ไม่มีข้อความ → failed, ไฟล์หาย → failed, PDF สแกน → needs_ocr, ไม่มี embedder → retry, ลบไม่แตะ org อื่น) · ruff ผ่าน · **smoke test stack จริง:** อัปโหลด → แปลง+chunk สำเร็จ → หยุดที่ embedding เพราะ `.env` ไม่มี `OPENAI_API_KEY` → job queued รอ retry ตามออกแบบ · **ยังไม่ได้ทดสอบ:** เรียก OpenAI จริง (ต้องใส่ `OPENAI_API_KEY` ใน `knowledge-engine/.env`), S3 จริง |
| 2026-10-28 | neuron-devdb + สลับ .env + T2b | **neuron-devdb/** (แบบเดียวกับ s02-testdb): Postgres 16 ที่ `127.0.0.1:5434`, database `imc_neuronknowledge` (`nk_app`) และ `knowledge_engine` (`nk_engine`), REVOKE CONNECT จาก PUBLIC, `pgcrypto` สร้างโดย superuser, `.gitattributes` บังคับ LF, README ไทย, zip `neuron-devdb.zip` (path แบบ `/`, `.sh` executable, ignore ใน git เพราะมีรหัสผ่าน) · ทดสอบ: รหัสผิดถูกปฏิเสธ (จากนอก container), ข้าม database ถูกปฏิเสธทั้ง 2 ทาง, init-db ของแอปด้วย `nk_app`, migrate + **engine 255 tests ผ่านด้วย `nk_engine`**, ลบแล้วเปิดใหม่ / แตก zip ในโฟลเดอร์ว่างแล้วเปิดได้ · **สลับ .env:** แอป `.env` → สำรองเป็น `.env.remote` (ignore แล้ว) แล้วแก้แค่ `POSTGRES_URL` → neuron-devdb + เพิ่ม `KNOWLEDGE_API_URL/TOKEN`; engine `.env` แก้แค่ `POSTGRES_URL` → `knowledge_engine`; หยุด Postgres ทดสอบตัวเดิม · server ร่วม (114.119.173.23) ไม่ถูกแตะ · **T2b:** `groups.org_id` (+ unique index บางส่วน) ใน `lib/db.ts` และ `scripts/schema.sql`, API กลุ่มรับ/ตรวจ/กันซ้ำ org_id, ช่องกรอกใน modal + ป้ายในตาราง, `lib/knowledge.ts` (`parseOrgIdField`, `listOrgsForUser`, `resolveOrg`, `knowledgeFetch`, `relay`), route `/api/knowledge/orgs`, `/documents`, `/documents/[id]`, `/documents/[id]/reindex`, หน้า `/knowledge` (`KnowledgeWorkspace`, `KnowledgeUploadForm`, `KnowledgeDocumentTable`, `knowledge-format`), ลิงก์ในเมนูแชท, `middleware.ts` → `proxy.ts`, `example.env` + README · **ทดสอบ:** tsc ผ่าน, ESLint ไฟล์ใหม่ไม่มี error (ไฟล์เดิมที่แก้มี error เท่าเดิมก่อนแก้), `next build` ผ่าน, token ไม่อยู่ใน `.next/static` · **API 27 ข้อผ่าน** (ผู้ใช้ 4 คน: admin / alice@acme / bob@beta / carol ไม่มี org — org_id ผิดรูปแบบ/ซ้ำ/แย่งของกลุ่มอื่น → 400/409, non-admin สร้างกลุ่มไม่ได้, รายชื่อ org ถูกตามสิทธิ์, ไม่ login → 401, อัปโหลด 201, ซ้ำ 409 + doc_id, .exe→.pdf 415, คำอธิบายสั้น 400, อัปโหลดข้าม org 403, ไม่มี org 403, admin หลาย org ต้องเลือก 400, bob ไม่เห็น/เปิด/ลบเอกสาร alice (403/404), admin ดู acme ได้, reindex 202) · **browser:** login alice → อัปโหลดผ่านฟอร์ม (ชื่อไฟล์ไทยถูก, แท็ก 2 ตัว, toast, ฟอร์ม reset) → ลบผ่าน dialog → หายจากรายการเอง (poll) · ไม่มี console error · มือถือ 375px ไม่มี scroll แนวนอน · light/dark · ลิงก์ในเมนูแชท · **ข้อควรรู้:** `npm` ใน shell นี้ชี้ไปโฟลเดอร์ผู้ใช้อื่น (`C:\Users\vadhi`) ใช้ `node scripts/init-db.mjs` / `node node_modules/next/dist/bin/next` แทน · บัญชีทดสอบอยู่ใน `.env.devusers` (ignore แล้ว) · เอกสารค้าง "กำลังสร้างดัชนี" จนกว่าจะใส่ `OPENAI_API_KEY` |
| 2026-10-28 | T9a + T9 | **T9a (แอป):** `getEnabledMCPTools` ตั้งชื่อ `<server>__<tool>` เมื่อหลาย server มี tool ชื่อเดียวกัน (ชื่อตาม `^[a-zA-Z0-9_-]{1,64}$`, ชนกันอีก → ต่อ `_<tool id>`) และคืน map ชื่อ → tool id · `executeMCPTool(toolId)` หาด้วย id แทนชื่อ · `TurnTools.mcpTools` + `executeTool(…, turn)` · admin test ส่ง `tool_id` และถ้าส่งแค่ชื่อที่มีหลาย server → 400 ไม่เดา · **T9 (engine):** `api_keys.py` (create/list/revoke, hash เท่านั้น, `KeyResolver` cache 30 วิ), `search.py` (`search` dense + filter org/tags/doc_ids + clamp top_k, `list_documents` เฉพาะ indexed, `get_document_chunk` ± window ≤ 3 + ตรวจ org), `mcp_server.py` (MCPServer 3 tools, `RequireApiKey` middleware, stateless JSON, CLI) · **test:** engine **279 passed** (เพิ่ม 24: key เก็บแค่ hash / map 1 org / revoke / org_id ผิดรูปแบบ / bearer parsing, ค้นได้เฉพาะ org ตัวเอง, filter tags/doc_ids/top_k, ทุก query ต้องมี org, list_documents เฉพาะ indexed + org, get_document_chunk window + org อื่นใช้ doc_id เดียวกันไม่ได้, **HTTP จริง:** ไม่มี/ผิด/revoke key → 401 + WWW-Authenticate, tools/list 3 ตัวไม่มี org_id, ค้น/list/get ผ่าน JSON-RPC ได้เฉพาะ org ของ key, `org_id` ที่แอบใส่ใน arguments ถูกเมิน, ไม่มี OpenAI key → บอกเหตุผล, ไม่เจอ → note) · แอป: tsc + `next build` ผ่าน, ESLint ไม่มี error ใหม่ · **live (แอป + engine จริง):** สร้าง key acme/beta ด้วย CLI → ลงทะเบียน 2 MCP server ในแอป (URL เดียวกัน key ต่างกัน) → sync ได้ 3 tools ทั้งคู่ → agent `kb-acme` (ผูกเฉพาะ server acme + กลุ่ม acme) เห็นชื่อปกติ, agent ที่ผูก 2 server ได้ `Knowledge_acme__search_knowledge` กับ `Knowledge_beta__search_knowledge` ไม่ซ้ำ → test-execute ตาม tool id: server acme เห็นเฉพาะเอกสาร acme, beta เห็นเฉพาะ beta → เรียกด้วยชื่ออย่างเดียวถูกปฏิเสธ → ค้นโดยไม่มี OpenAI key ได้ข้อความบอกเหตุผล (12/12 ผ่าน; ลบเอกสารทดสอบและ agent ทดสอบแล้ว) · **ยังไม่ได้ทดสอบ:** ถาม-ตอบในหน้าแชทจริง (ต้องมี LLM connection ในแอป + `OPENAI_API_KEY` ให้เอกสาร indexed และค้นได้) — **MVP checkpoint: ให้ผู้ใช้ทดลองกับไฟล์จริงก่อน T10** |
| 2026-10-28 | แก้บั๊กตาราง T6 | probe พบว่า: ตารางมีเส้น 2 แถว → `find_tables` = 0, ตารางไม่มีเส้น 3 แถว → 0, และ **ข้อความ 2 คอลัมน์ออกมาเป็น block เดียวสลับบรรทัด ซ้าย-ขวา** (เดิมจะต่อซ้ายกับขวาติดกันเป็นประโยคมั่ว) · แก้ `converters/pdf.py`: อ่าน `get_text("dict")` → แถว (บรรทัดซ้อนแนวตั้ง > 50%) → ขอบซ้ายคอลัมน์ (คลาดได้ 12pt) → ตาราง (ต้อง ≥ 2 แถว และ มีเส้นตาราง ≥ 2 ชิ้นรอบพื้นที่ / ≥ 3 คอลัมน์ / ช่องสั้น) หรืออ่านทีละคอลัมน์ หรือเว้นวรรคในแถว · รวมหลาย block ติดกันเป็นตารางเดียวเมื่อคอลัมน์ตรงกัน · **test:** 285 passed (เพิ่ม 6: ตารางมีเส้น 2 แถว, ตารางไม่มีเส้น, ช่องว่างคงคอลัมน์, 2 คอลัมน์อ่านทีละคอลัมน์ไม่ติดกัน, `label: value` เว้นวรรค, คอลัมน์ข้อความตามด้วยตารางไม่ปนกัน) · CLI กับ `sample-generated.pdf`: หน้า 2 จาก `รายการจำนวนหมายเหตุ` → ตาราง `| รายการ | จำนวน | หมายเหตุ |` · **ข้อจำกัด:** เกณฑ์ (ช่องสั้น 20 ตัวอักษร, คลาด 12pt) ตั้งจากไฟล์จำลอง — ตารางที่ช่องยาวไม่มีเส้นและมีแค่ 2 คอลัมน์ จะถูกอ่านเป็นข้อความ 2 คอลัมน์; ต้องยืนยันกับ PDF จริง |
| 2026-10-28 | T10 Hybrid + Rerank | `search.py`: `mode="hybrid"` (default) = Prefetch dense 30 + BM25 30 → `FusionQuery(RRF)` กรอง org/tags/doc_ids ทั้งสองฝั่ง · `mode="dense"/"sparse"` · fallback: query มีแต่ stopword → dense; embedder `TransientError` → BM25 อย่างเดียว (ถ้า BM25 ก็ว่าง → raise เดิม) · `Reranker` protocol + `rerank.py` (`CrossEncoderReranker` bge-reranker-v2-m3, cpu, `max_length=RERANK_MAX_LENGTH`; ส่ง 20 อันดับเข้า rerank แล้วตัด top_k; ไม่มี sentence-transformers → RuntimeError บอกวิธีแก้) · `mcp_server`: hybrid + reranker โหลดตอน start · Dockerfile stage `dev-rerank`, compose `mcp` image แยก (`MCP_TARGET`/`MCP_DEV_TARGET`) · **พฤติกรรมเปลี่ยน:** ไม่มี OpenAI key แล้วยังค้นด้วยคำที่ตรงกันได้ (เดิม error) · **test:** +12 — 3 ข้อรันเฉพาะใน image rerank (รหัส `KNOW-07` ที่ dense พลาด hybrid/sparse เจอ, `know-07` ตัวเล็ก, คำค้นตามความหมายยังได้ dense match, hybrid ไม่ข้าม org + filter ทั้งสองฝั่ง, stopword → dense, embeddings ล่ม → BM25, rerank ได้ 20 candidates แล้วเรียงใหม่, MCP ผ่าน HTTP เป็น hybrid + rerank, CrossEncoderReranker กับ model ปลอม, load_reranker; test เดิมย้าย `add_doc` ไป `tests/fixtures/search.py` และใส่ BM25 vector ด้วย) · **image rerank จริง (2.76GB):** chunk ใหญ่สุด 800 token (o200k) + query ≤ 1024 ด้วย tokenizer ของ reranker ทั้งไทย/อังกฤษ/ตาราง (test ข้ามใน image ที่ไม่มี transformers) · โมเดลจริงโหลดครั้งแรก 441 วินาที (ดาวน์โหลด ~2.3GB ลง `hf_cache`), เรียงไทยถูก (0.741 / 0.933), ข้อความสั้น 20 ชิ้น ~3 วินาทีบน CPU · **ยังไม่ได้วัด:** เวลา rerank กับ chunk ยาวจริง 20 ชิ้น (คาดว่าช้ากว่านี้หลายเท่า) |
| 2026-10-28 | T11 Evaluation | `evaluation.py` + `eval/run_eval.py`: อ่าน `eval/questions.jsonl` (บรรทัด `#` = comment; ต้องมี q, org_id และ expected_doc_id/expected_filename/expected_citation_contains อย่างน้อย 1; `kind` อิสระ) → recall@k + MRR ของ dense / hybrid / hybrid+rerank, แยกตาม kind, รายการที่พลาด · สถิติ corpus: term BM25 เฉลี่ยต่อ chunk → แนะนำ `BM25_AVGDL`, ความยาว chunk ไทย/อื่น, token ต่อ chunk → input token ที่ส่งเข้า LLM ต่อการค้น · ผลเก็บ `eval/results/eval-<เวลา>.md/.json` (git-ignored) · dev override mount `./eval` · `questions.jsonl` = template 3 ข้อ (general/name/number) · README มีวิธีใช้ · **test:** +13 (parse/validate คำถาม, template อ่านได้, เงื่อนไข match, recall/MRR/by_kind, ตัดที่ k, corpus stats, report, corpus จำลอง: dense recall@1 ของคำถามรหัส 0 → hybrid 1.0, CLI เขียนผล + ข้าม rerank เมื่อไม่มีแพ็กเกจ) · **demo จำลอง:** recall@1 dense 0.50 / hybrid 1.00 · **ข้อสังเกต:** คำถามที่เป็น paraphrase ล้วน ถ้า BM25 ไปเจอ chunk อื่นอันดับ 1 จะได้คะแนน RRF เท่ากับ chunk ที่ถูก (อันดับ 1 คนละฝั่ง) — เป็นกรณีที่ rerank และการวัดด้วยคำถามจริงต้องตอบ · **รอผู้ใช้:** คำถามจริง 30–50 ข้อ แล้วรัน eval เพื่อปรับ `BM25_AVGDL` (300 ยังเป็นค่าเดา), chunk size, top_k, และตัดสินว่าจะเปิด rerank หรือไม่ |
| 2026-10-28 | ทดสอบอัปโหลดจริง + แก้ worker ตาย | ใส่ `OPENAI_API_KEY` แล้ว: embedding จริงผ่าน (1536 มิติ), ไฟล์ txt ที่ค้าง reindex → indexed · **บั๊ก:** PDF จริง 25 หน้า (937KB) ค้าง "กำลังอ่านไฟล์" — worker ตายด้วย segfault (exit -11) ใน `find_tables()` ซึ่ง PyMuPDF 2.0 รันโมเดล layout ONNX ก่อนเป็นค่า default · ในโหมด dev `watchfiles` ไม่เริ่ม worker ใหม่เมื่อ crash และ job ค้าง `running` จนถึง stale timeout แล้วจะ crash ซ้ำทุกครั้ง · **แก้ 1:** `find_tables(use_layout=False)` → ไฟล์นี้อ่านได้ 86 ส่วน (ตาราง 57) → indexed 93 chunk · **แก้ 2:** `converters/isolated.py` รัน converter ใน process ลูก (forkserver ที่ preload converter + พจนานุกรมไทยไว้, เริ่มตอน worker start): ลูก crash → `PermanentError` "ตัวอ่านไฟล์หยุดทำงานกะทันหัน" (ไม่ retry), เกิน `CONVERT_TIMEOUT_SECONDS` (900, ต้อง < JOB_STALE_MINUTES×60 — ตรวจใน Settings) → failed, worker shutdown → หยุดลูก + `JobInterrupted`, exception ที่ pickle ไม่ได้ → RuntimeError ที่มีชื่อ+ข้อความ · overhead ~0.07 วินาที/ไฟล์ · **test:** +8 (ผลตรงกับ convert ปกติ, NeedsOcrError/ไม่รองรับชนิดไฟล์ผ่านมาครบ, segfault → failed และไฟล์ถัดไปยังอ่านได้, ค้าง → timeout, shutdown, exception pickle ไม่ได้, pipeline: ไฟล์ crash → failed attempts=1 ไม่ retry และไฟล์อื่นยัง indexed, ตรวจค่า timeout ใน config) · live: reindex ผ่าน worker จริงสำเร็จ · **ข้อจำกัด:** อ่าน PDF ที่มีตารางเยอะยังช้า (ไฟล์นี้ ~35 วินาที — อ่านทีละช่องด้วย `get_textbox`) |
| 2026-10-28 | ตรวจงานก่อน commit + ล็อกเวอร์ชัน | **ตรวจ:** แอป `tsc --noEmit` ผ่าน, ESLint ไม่มีปัญหาใหม่ (จำนวนเท่าเดิมทุกไฟล์ที่แก้, ไฟล์ใหม่ 0) · จำลอง merge (index ชั่วคราว ไม่แตะ working tree): กับ `origin/main` ชน `components/chat/ChatInterface.tsx`, กับ `origin/staging` ชน `proxy.ts` (staging ยังใช้ `middleware.ts` + เพิ่ม `/studio`) · ไม่มี path ซ้ำ (`/knowledge` ≠ `/studio/knowledge`) · **ข้อสังเกตทีม:** staging มี spec CORE-02 (branch `core/engine` ยังว่าง) ที่ร่างเป็น TypeScript + pgvector + Knowledge Set — ต้องตกลงกับทีมก่อนเปิด PR · **แก้ 1:** `postgres_url` ไม่อยู่ใน `repr(Settings)` แล้ว (`Field(repr=False)`) — เดิมรหัสผ่าน DB โผล่ใน output ของ pytest ตอน test fail; test เพิ่ม · **แก้ 2:** `docker/constraints.txt` = เวอร์ชันจริงที่ test ผ่าน (113 แพ็กเกจจาก image dev + dev-rerank, รวม `pymupdf==2.0`, `openai==3.39.0`, `torch==2.14.1+cpu`) ใช้กับ `pip install -c` ทุกขั้นใน Dockerfile; `pyproject.toml` ใส่เพดานเวอร์ชันหลัก (pymupdf <2.1, openai <4, qdrant-client <2, pythainlp <6, tiktoken <1, sentence-transformers <7) · แก้ stage `dev-rerank` ที่คำสั่ง RUN ถูกต่อเป็นบรรทัดเดียว · อัปเกรด: แก้ constraints → build → รัน test ทั้งหมด |
| 2026-10-28 | KNOW-13 OCR | **ผู้ใช้เลือก:** OpenAI vision (ใช้ key เดิม, ไม่เพิ่มผู้รับข้อมูลรายใหม่) · ขอบเขต: PDF สแกนทั้งเล่ม, PDF หน้าสแกนปน, ไฟล์ JPG/PNG (ไม่รวม PDF ฟอนต์เสีย) · **probe ก่อนเขียน:** หน้าไทย+ตาราง render เป็นภาพ → `gpt-4.1-mini` ตรงต้นฉบับ 99.8%, เลขไทยครบ, ตารางเป็น Markdown, 3.9 วินาที, 3,583 in / 180 out token (~$0.002/หน้า) · **ออกแบบ:** converter (process ลูก ไม่มี network) หาหน้าที่ไม่มีข้อความแต่มีภาพ/ลายเส้น → render JPEG 150 dpi ด้านยาว ≤ 2,000 px → `ConvertResult.ocr_pages` (`OcrPage`); worker (`ocr.py`: `OpenAIOcr`, retry แบบเดียวกับ embedder, 401/429/5xx → Transient, 4xx อื่น → Permanent) อ่านพร้อมกัน `OCR_CONCURRENCY` หน้า → Markdown แยกย่อหน้า/ตาราง → แทรกตามลำดับหน้า · `converters/image.py` (JPG/PNG = 1 หน้า) · `file_types`: jpg/jpeg/png ตรวจ signature · `quality_flag='ocr'` + `metadata.ocr_pages/ocr_model` · `OCR_MAX_PAGES=200` ปฏิเสธก่อนเรียก API · `OCR_ENABLED=false` → พฤติกรรมเดิม (`needs_ocr`) · **migration 003** (file_type jpg/png, quality_flag ocr — รันกับ DB dev ในเครื่องแล้ว) · แอป: รับ .jpg/.jpeg/.png, ป้าย "อ่านด้วย OCR", ข้อความช่วยในฟอร์ม · **test:** ทั้งหมด 342 passed (+27: render หน้าสแกน/ข้ามหน้าว่าง/เกินขีดจำกัด/จำกัดขนาด A0/PDF ปน text+scan รักษา label+หัวข้อ, รูป png/jpg, รูปเสีย, Markdown → ย่อหน้า+ตาราง, ลำดับหน้าเมื่ออ่านขนาน + เตือนหน้าว่าง, รูปแบบคำขอ OpenAI, retry/แปลง error, load_ocr, file type jpg/png/jpeg + เนื้อไม่ตรงนามสกุล, pipeline: PDF สแกน → indexed + citation + ค้น BM25 เจอ, รูป png/jpeg → indexed หน้า 1, ปิด OCR → needs_ocr, OCR อ่านไม่ได้อะไร → ไม่พบข้อความ, OCR ล่ม → job retry) · **live:** PDF สแกนภาษาไทย 2 หน้า (200 dpi, มีตาราง) อัปโหลดเข้า acme → indexed 3 chunk ใน 28 วินาที, OCR ถูกครบ, ค้นด้วยความหมาย/`KNOW-13`/คำได้หน้าถูก · **ยังไม่ได้ทดสอบ:** ไฟล์จากเครื่องสแกนจริง (เอียง, มีรอยเปื้อน, ลายมือ), ไม่ได้บันทึก token ที่ใช้ต่อเอกสาร (มีแค่ใน OpenAIOcr รวมทั้ง worker) |
