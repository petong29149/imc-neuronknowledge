# Knowledge Engine

แปลงเอกสารที่ลูกค้าอัปโหลด (PDF, DOCX, PPTX, TXT, MD และ JPG/PNG หรือ PDF สแกนผ่าน OCR) เป็นคลังความรู้ใน Qdrant แล้วให้ agent ในแอป NeuronKnowledge ค้นผ่าน MCP พร้อม citation — spec ทั้งหมดอยู่ใน [`Plan/KNOWLEDGE_ENGINE_PLAN.md`](../Plan/KNOWLEDGE_ENGINE_PLAN.md)

| Service | หน้าที่ | Port (dev, localhost เท่านั้น) |
|---|---|---|
| `migrate` | สร้าง schema `knowledge` + ตาราง และ collection ใน Qdrant แล้วจบ | — |
| `api` | API ภายในสำหรับ upload (ผู้เรียกมีแค่ Next.js server) | 8000 |
| `worker` | ประมวลผลเอกสารจากคิว (scale ได้) | — |
| `mcp` | MCP server (Streamable HTTP) | 8765 → `http://localhost:8765/mcp` |
| `qdrant` | vector DB | 6333 → `http://localhost:6333/dashboard` |
| `postgres` | เฉพาะ `--profile standalone-db` | 5433 |

ทุก service ของ engine ใช้ image เดียว (`knowledge-engine`) เพราะต้องตัดคำไทยด้วยโค้ดชุดเดียวกันทั้งตอน index และตอนค้น

## เริ่มต้น

ต้องมี Docker Desktop (Windows/macOS) หรือ Docker Engine + Compose v2.20+

```bash
cp example.env .env
```

แก้ `.env`:
- `POSTGRES_URL` — database ของแอป (ใช้ `host.docker.internal` แทน `localhost`) หรือใช้ Postgres ใน compose ด้วย `--profile standalone-db`
- `INTERNAL_API_TOKEN` — สตริงสุ่ม ≥ 32 ตัวอักษร (`python -c "import secrets; print(secrets.token_urlsafe(48))"`)

## คำสั่ง

```bash
docker compose up -d --build                                  # ขึ้นทั้งระบบ (dev) กับ Postgres ของแอป
docker compose --profile standalone-db up -d --build          # ขึ้นทั้งระบบพร้อม Postgres ใน compose
docker compose logs -f worker
docker compose run --rm worker pytest                         # รัน test ใน container
docker compose run --rm migrate                               # รัน migration ซ้ำ (idempotent)
docker compose up -d --scale worker=3                         # เพิ่ม worker
docker compose down                                           # หยุด (ข้อมูลยังอยู่ใน volume)
```

`docker-compose.override.yml` ถูกโหลดอัตโนมัติ (dev): ใช้ image `dev` ที่มี pytest, mount `src/` และ reload เองเมื่อแก้โค้ด, เปิด port ที่ `127.0.0.1` เท่านั้น
Production: `docker compose -f docker-compose.yml up -d` (ไม่เปิด port ออก host — ให้ reverse proxy ที่มี HTTPS ชี้ไปที่ `mcp`, และห้ามเปิด `api` ออกอินเทอร์เน็ต)

> ⚠️ ห้ามใช้ `docker compose down -v` กับ production — ลบ volume (`qdrant_storage`, `files`, `pgdata`, `hf_cache`) ทั้งหมด

## Internal API (`api`)

ทุก endpoint ยกเว้น `/healthz` ต้องมี `Authorization: Bearer <INTERNAL_API_TOKEN>` และ `X-Org-Id: <org_id>` — `org_id` มาจาก header นี้เท่านั้น (Next.js server หาให้จาก session) · error เป็น `{"error": "<ข้อความไทย>"}`

| Method | Path | ผล |
|---|---|---|
| GET | `/healthz` | `{"status": "ok"}` |
| POST | `/documents` | multipart `file`, `description` (≥ 10 ตัวอักษร), `tags` (ซ้ำได้) → 201 `{doc_id, status}` · 400 / 409 (`doc_id` เดิม) / 413 / 415 |
| GET | `/documents?status=&tag=&limit=&offset=` | `{documents: [...]}` (ไม่รวม `deleted` ถ้าไม่ระบุ status) |
| GET | `/documents/{id}` | status, quality_flag, error, chunk_count, `pending_job` ฯลฯ |
| POST | `/documents/{id}/reindex` | 202 `{doc_id, job_id, kind}` · 409 ถ้ากำลังลบ |
| DELETE | `/documents/{id}` | 202 `{doc_id, job_id, kind: "delete"}` — worker ลบ points + ไฟล์ แล้วตั้ง status `deleted` |

เอกสารของ org อื่นตอบ 404 เสมอ (ไม่ใช่ 403)

## MCP server (`mcp`) — ค้นหาจากแชทของแอป

Streamable HTTP ที่ `http://localhost:8765/mcp` · ทุกคำขอต้องมี `Authorization: Bearer <key>` และ **key 1 ตัว = 1 องค์กร** (เก็บแค่ hash) · tool: `search_knowledge`, `list_documents`, `get_document_chunk` — ไม่มี tool ไหนรับ `org_id`

```bash
docker compose run --rm --no-deps mcp python -m knowledge.mcp_server create-key --org acme --label "NeuronKnowledge app"   # แสดง key ครั้งเดียว
docker compose run --rm --no-deps mcp python -m knowledge.mcp_server list-keys [--org acme]
docker compose run --rm --no-deps mcp python -m knowledge.mcp_server revoke-key <key>
```

ลงทะเบียนในแอป (Admin → MCP Servers) **1 server ต่อ 1 องค์กร**: transport Streamable HTTP, URL `http://localhost:8765/mcp`, header `Authorization: Bearer <key ขององค์กรนั้น>` → Sync tools → สร้าง agent ขององค์กร ผูกเฉพาะ tool ของ server นั้น และจำกัดสิทธิ์เป็นกลุ่มที่มี `org_id` เดียวกัน

### การค้นหา (T10)

`search_knowledge` ค้นแบบ **hybrid**: ความหมาย (dense, OpenAI) + คำที่ตรงกัน (BM25) รวมอันดับด้วย RRF ใน Qdrant — ชื่อเฉพาะ/รหัส เช่น `KNOW-07` จึงหาเจอแม้ embedding จะพลาด · คำค้นที่มีแต่ stopword → dense อย่างเดียว · OpenAI ใช้ไม่ได้ → BM25 อย่างเดียว (ถ้าคำค้นไม่มีคำให้ BM25 ก็แจ้งเหตุผลกลับไป)

**Rerank (ปิดไว้ก่อน):** `bge-reranker-v2-m3` ให้คะแนน 20 อันดับแรกใหม่แล้วคืน top_k · ต้องใช้ image ที่มี torch (ใหญ่ขึ้น ~2GB) และโหลดโมเดล ~2.3GB ลง volume `hf_cache` ครั้งแรก · ใช้ CPU ~1–3 วินาทีต่อคำค้น

```bash
# .env: RERANK_ENABLED=true และ MCP_TARGET=rerank (dev: MCP_DEV_TARGET=dev-rerank)
docker compose up -d --build mcp
```

## Evaluation (T11)

วัด recall@5 และ MRR ของ `dense` / `hybrid` / `hybrid+rerank` จากคำถามจริง + สถิติ chunk (แนะนำค่า `BM25_AVGDL`, token ที่ผลค้นส่งเข้า LLM ต่อครั้ง)

1. แก้ `eval/questions.jsonl` — คำถามจริง 30–50 ข้อจากเอกสารที่ index แล้ว (รูปแบบอยู่ในหัวไฟล์)
2. รัน (ผลเก็บใน `eval/results/` ซึ่งไม่ถูก commit):

```bash
docker compose exec api python eval/run_eval.py
docker compose exec api python eval/run_eval.py --configs dense,hybrid --k 5   # ไม่มี image rerank
```

ต้องมี `OPENAI_API_KEY` (คำถามถูก embed เหมือนตอนค้นจริง) · `hybrid+rerank` ถูกข้ามถ้า container ไม่มี sentence-transformers

## OCR (KNOW-13)

PDF สแกนทั้งเล่ม, PDF ที่มีหน้าสแกนปน และไฟล์ **JPG / PNG** อ่านด้วย OpenAI vision (`OCR_MODEL`, ค่าเริ่มต้น `gpt-4.1-mini`)

- converter (ใน process ลูก) หาหน้าที่ไม่มีชั้นข้อความแต่มีภาพ/ลายเส้น แล้ว render เป็น JPEG 150 dpi (ด้านยาวไม่เกิน 2,000 px) · หน้าว่างจริงถูกข้าม
- worker ส่งทีละ `OCR_CONCURRENCY` หน้า → ได้ Markdown (ตารางแยกเป็นชิ้นตาราง) → แทรกตามลำดับหน้า → chunk / embed ตามปกติ · citation `ไฟล์, หน้า N` (รูปภาพ = หน้า 1)
- เอกสารขึ้นคุณภาพ `ocr` ("อ่านด้วย OCR") และ `metadata.ocr_pages`, `metadata.ocr_model`
- หน้าต้อง OCR เกิน `OCR_MAX_PAGES` (200) → ล้มเหลวก่อนเรียก API · OpenAI ล่ม/429 → job ลองใหม่ · `OCR_ENABLED=false` → สถานะ "ต้องใช้ OCR" แบบเดิม
- ทดสอบจริง (28 ต.ค. 2026): PDF สแกนภาษาไทย 2 หน้า + ตาราง → ถูกต้องครบ (เลขไทย, `KNOW-13`, `1,500`) ใช้เวลา 28 วินาที · ~3,600 input + ~200–1,000 output token ต่อหน้า ≈ $0.002–0.004
- เอกสารส่งออกไปที่ OpenAI เท่านั้น (เจ้าเดียวกับที่รับข้อความไปทำ embedding อยู่แล้ว) · PDF ที่ฟอนต์ไทยเสีย (garbled) ยังไม่ส่ง OCR

## Test

Test แบบ integration ใช้ schema และ collection ชื่อ `knowledge_test` (สร้างแล้วลบเอง) ไม่แตะของจริง — เปลี่ยนชื่อได้ด้วย `TEST_KNOWLEDGE_NAMESPACE`

```bash
docker compose run --rm worker pytest                    # ทั้งหมด
docker compose run --rm worker pytest -m "not integration"   # ไม่ต้องใช้ Postgres/Qdrant
docker compose run --rm worker ruff check src tests
```
