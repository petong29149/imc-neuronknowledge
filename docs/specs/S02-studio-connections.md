# Spec: Data Connections และ Data Catalog (S02)

- ผู้ใช้: Creator, Admin (จัดการ) • User (เลือก DB ที่จะใช้) • ระบบภายนอก/ทีม MCP (ผ่าน API key)
- Route: `/studio/connections` (creator) • `/connections` (user) • Branch: `page/studio-connections` → PR เข้า `staging`
- ขึ้นกับ: CORE-01 (`lib/crypto.ts`, `lib/activity.ts`, migration) • หน้าที่รอ: S03 (เลือกตารางจาก connection), P03/CORE-02 (ใช้ DB ที่ user เลือก), ทีม MCP (ห่อ API เป็น tool)
- ประวัติ: v1 2026-10-21 (เชื่อมต่อ ทดสอบ ดู schema) • **v2 2026-10-26** เพิ่ม Data Catalog, คำอธิบายตารางด้วย AI, ช่องทดสอบ query, API สำหรับ MCP, การเลือก DB ของ user และรูปประจำ connection ตามคำสั่งเจ้าของงาน (ดู Handoff S02)

## 1. เป้าหมาย
1. creator เชื่อม database ภายนอกได้เอง ทดสอบว่าใช้ได้และเป็นบัญชีอ่านอย่างเดียว
2. creator ทำ **Data Catalog**: เลือกตาราง/คอลัมน์ที่เปิดให้ AI ใช้ และเขียนคำอธิบายที่ชัดพอให้ AI เขียน SQL ได้ถูก (AI ร่างให้ คนตรวจและยืนยัน)
3. creator ทดสอบได้ทันทีในหน้าเดียว ทั้ง SQL และคำถามภาษาคน (AI เขียน SQL จากคำอธิบาย) เพื่อวัดว่าคำอธิบายดีพอหรือยัง
4. ทีม MCP นำ catalog และ query endpoint ไปห่อเป็น MCP tool ได้โดยไม่ต้องต่อ DB เอง (เราไม่ได้สร้าง MCP server)
5. user ทั่วไปเลือกได้ว่าจะใช้ DB ไหน จากชุดที่ creator เผยแพร่

## 2. ขอบเขต
- ทำ (v1):
  1. รายการ connection แบบ sidebar + รายละเอียด: ชื่อ, ประเภท, host, สถานะ, ทดสอบล่าสุด, Knowledge Set ที่ใช้อยู่
  2. ฟอร์มสร้าง/แก้ไข: 8 ประเภท (PostgreSQL, MySQL, SQL Server, MariaDB, Oracle, CockroachDB, Amazon Redshift, ClickHouse), host, port/SSL ตามประเภท, database, username, password
  3. ทดสอบการเชื่อมต่อ + ตรวจสิทธิ์อ่านอย่างเดียว ถ้าเขียนได้เตือนสีแดงและต้องยืนยันก่อนบันทึก
  4. ดู schema: ตาราง → คอลัมน์ + ตัวอย่าง 5 แถว
  5. ลบ connection (ห้ามลบถ้ามี Knowledge Set ใช้อยู่)
- ทำ (v2):
  6. **รูป 2 ชั้น**: โลโก้ประเภท DB (ตายตัว) + รูปประจำ connection 3 แบบ — `auto` (เลือกไอคอนจากคำในชื่อ connection/database เช่น trade→เรือ, hr→คน ถ้าไม่ตรงใช้อักษรย่อบนสีจากชื่อ), `preset` (ไอคอนชุด default + สี), `custom` (อัปโหลด PNG/JPG/WebP/SVG ≤ 256 KB, SVG ถูก sanitize)
  7. **Catalog sync**: ดึงรายการตาราง/คอลัมน์มาเก็บ ตารางใหม่ = ปิดไว้ก่อน, ตารางที่หายไปจาก DB = ติดธง "ไม่พบใน DB" (ไม่ลบคำอธิบาย)
  8. **เปิด/ปิด** ตารางและคอลัมน์ที่ให้ AI/MCP ใช้, ติดธง **PII** ที่คอลัมน์ (คอลัมน์ PII ไม่ถูกส่งให้ AI และ API ของ MCP ไม่คืนค่า)
  9. **คำอธิบาย**: ตาราง (คำอธิบาย, คำพ้อง, ตัวอย่างคำถาม) และคอลัมน์ (คำอธิบาย, ตัวอย่างค่า) สถานะ `empty` → `draft` → `approved`
  10. **AI ร่างคำอธิบาย**: เลือกตาราง → AI ร่างจาก schema (+ ตัวอย่าง 5 แถวถ้าติ๊กอนุญาต, ไม่รวมคอลัมน์ PII) ผลเป็น `draft` เสมอ ไม่ทับรายการที่ `approved` แล้ว
  11. **ทดสอบ Query**: แท็บ SQL (SELECT/WITH คำสั่งเดียว, read-only transaction, ≤ 100 แถว, ≤ 10 วินาที) และแท็บ ถามภาษาคน (AI เขียน SQL จาก catalog ที่เปิดใช้ แสดง SQL ให้ตรวจก่อนกดรัน)
  12. **API key ต่อ connection** สำหรับทีม MCP: สร้าง (แสดงครั้งเดียว), ดูรายการ, ยกเลิก
  13. **API สำหรับ MCP**: อ่าน catalog และ query แบบอ่านอย่างเดียวที่บังคับใช้เฉพาะตาราง/คอลัมน์ที่เปิด (ตรวจด้วย SQL parser) + หน้าคู่มือการเชื่อม MCP ในแท็บ "เชื่อม MCP"
  14. **เผยแพร่**: creator เปิดให้ user เห็น connection ได้ (ต้องสถานะ "ใช้ได้" และมีตารางเปิดใช้อย่างน้อย 1 ตาราง)
  15. **หน้า `/connections` สำหรับ user**: การ์ด DB ที่เผยแพร่ (รูป, คำอธิบาย, จำนวนตาราง) กดเลือก/เลิกเลือก และ API ให้ฝั่งแชท/agent อ่าน DB ที่ user เลือก
  16. **สวิตช์ใช้/ไม่ใช้ระดับฐานข้อมูล** (v2.1): ปิดแล้ว user มองไม่เห็น, API ของ MCP ตอบ 403, การตั้งค่าตาราง/คอลัมน์/คำอธิบายยังอยู่ creator ยังทดสอบได้ — เพิ่มจากการเปิด/ปิดระดับตารางและคอลัมน์
- ไม่ทำ: ดึงข้อมูลเข้า index (CORE-02 ผ่าน S03), สร้าง MCP server (ทีม MCP), การใช้ DB ที่เลือกในแชทจริง (P03/CORE-02), SSH tunnel, NoSQL, query ที่แก้ข้อมูล

## 3. หน้าจอ
- `/studio/connections`: sidebar (ค้นหา, จัดกลุ่มตามประเภท, รูป connection ซ้อนโลโก้ประเภท, จุดสถานะ) + รายละเอียดเป็นแท็บ: **ภาพรวม** (ข้อมูลเชื่อมต่อ, รูป, เผยแพร่) • **ตารางและคำอธิบาย** • **ทดสอบ Query** • **เชื่อม MCP** (API key + ตัวอย่าง)
- `/connections` (user ที่ login): การ์ด DB ที่เผยแพร่ ปุ่ม "ใช้ DB นี้" / "เลิกใช้" และตัวกรอง "ที่ฉันเลือก"
- รหัสผ่านและ API key เต็มไม่ถูกส่งกลับมาที่ browser หลังบันทึก • error เป็นภาษาคน
- ฟอร์มกรอกไม่ปิดเมื่อคลิกนอกหน้าต่าง

## 4. API
Creator/Admin (`requireRole(['admin','creator'])`, creator เห็นเฉพาะ connection ที่ตัวเองสร้าง admin เห็นทั้งหมด):

| Method | Path | Request / Response |
|---|---|---|
| GET / POST | `/api/studio/connections` | v1 |
| PUT / DELETE | `/api/studio/connections/[id]` | v1 (PUT รับ `description` เพิ่ม) |
| POST | `/api/studio/connections/test`, `/api/studio/connections/[id]/test` | v1 |
| GET | `/api/studio/connections/[id]/schema`, `/[id]/preview?schema=&table=` | v1 |
| PUT | `/api/studio/connections/[id]/icon` | `{ kind: 'auto'\|'preset'\|'custom', preset?, color?, dataUrl? }` |
| PUT | `/api/studio/connections/[id]/enabled` | `{ enabled: boolean }` สวิตช์ใช้/ไม่ใช้ทั้งฐานข้อมูล |
| PUT | `/api/studio/connections/[id]/publish` | `{ published: boolean }` → 409 ถ้ายังไม่พร้อม |
| GET | `/api/studio/connections/[id]/catalog` | `{ tables: CatalogTable[] }` (รวมคอลัมน์) |
| POST | `/api/studio/connections/[id]/catalog/sync` | `{ added, removed, tables }` |
| PUT | `/api/studio/connections/[id]/catalog/tables/[tableId]` | `{ enabled?, description?, synonyms?, sampleQuestions?, status? }` |
| PUT | `/api/studio/connections/[id]/catalog/columns/[columnId]` | `{ enabled?, isPii?, description?, exampleValues?, status? }` |
| POST | `/api/studio/connections/[id]/catalog/describe` | `{ tableIds, modelId?, includeSamples }` → ร่างคำอธิบาย |
| POST | `/api/studio/connections/[id]/query` | `{ sql }` → `{ columns, rows, rowCount, truncated, durationMs }` |
| POST | `/api/studio/connections/[id]/query/ask` | `{ question, modelId? }` → `{ sql, explanation }` (ยังไม่รัน) |
| GET / POST | `/api/studio/connections/[id]/api-keys` | รายการ (prefix, ใช้ล่าสุด) / สร้าง → `{ key }` แสดงครั้งเดียว |
| DELETE | `/api/studio/connections/[id]/api-keys/[keyId]` | ยกเลิก key |
| GET | `/api/studio/connections/models` | LLM model ที่เปิดใช้ (สำหรับ dropdown) |

User (`getSession()`, ทุกบทบาท):

| Method | Path | Request / Response |
|---|---|---|
| GET | `/api/connections` | connection ที่เผยแพร่ + `selected` ของ user คนนี้ (ไม่มี host/username) |
| PUT | `/api/connections/[id]/selection` | `{ selected: boolean }` |
| GET | `/api/connections/selected` | connection ที่ user เลือก (ให้ P03/CORE-02 ใช้) |

ระบบภายนอก/MCP (`Authorization: Bearer nkc_…`, key ผูกกับ connection เดียว):

| Method | Path | Request / Response |
|---|---|---|
| GET | `/api/connections/[id]/catalog` | ตาราง/คอลัมน์ที่เปิดใช้ (ไม่รวม PII) + คำอธิบายที่ `approved` (ร่างส่งเป็น `draft`), ประเภท DB และ dialect |
| POST/GET | `/api/connections/[id]/mcp` | **MCP server ในตัว** (Streamable HTTP, stateless) สำหรับเพิ่มใน MCP Hub — tool `describe_<ชื่อ>` และ `query_<ชื่อ>` ใช้ catalog/allowlist เดียวกับ REST (v2.2) |
| POST | `/api/connections/[id]/query` | `{ sql, maxRows? ≤ 100 }` → `{ columns, rows, rowCount, truncated }` • 400 ถ้าอ้างตาราง/คอลัมน์ที่ไม่เปิดหรือ parser ตรวจไม่ได้ |

## 5. ข้อมูล
- ตาราง v1: `data_connections` (รหัสผ่านผ่าน `encryptSecret()`), อ่าน `knowledge_sources.connection_id`
- เพิ่มใน v2 (สร้างใน DB ของ `.env` ตามคำสั่งเจ้าของงาน 2026-10-26 — CORE-01 ต้องรวมเข้า migration):

```sql
ALTER TABLE data_connections
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS icon_kind VARCHAR(10) NOT NULL DEFAULT 'auto' CHECK (icon_kind IN ('auto', 'preset', 'custom')),
  ADD COLUMN IF NOT EXISTS icon_preset VARCHAR(40),
  ADD COLUMN IF NOT EXISTS icon_color VARCHAR(9),
  ADD COLUMN IF NOT EXISTS icon_data TEXT,               -- data URL ของรูปที่อัปโหลด (≤ 256 KB)
  ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT true,       -- v2.1 สวิตช์ใช้/ไม่ใช้
  ADD COLUMN IF NOT EXISTS catalog_synced_at TIMESTAMPTZ;

CREATE TABLE connection_tables (
  id SERIAL PRIMARY KEY,
  connection_id INTEGER NOT NULL REFERENCES data_connections(id) ON DELETE CASCADE,
  schema_name VARCHAR(255) NOT NULL,
  table_name VARCHAR(255) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  missing BOOLEAN NOT NULL DEFAULT false,                -- ไม่พบใน DB ตอน sync ล่าสุด
  row_estimate BIGINT,
  description TEXT NOT NULL DEFAULT '',
  synonyms JSONB NOT NULL DEFAULT '[]',
  sample_questions JSONB NOT NULL DEFAULT '[]',
  description_status VARCHAR(10) NOT NULL DEFAULT 'empty' CHECK (description_status IN ('empty', 'draft', 'approved')),
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (connection_id, schema_name, table_name)
);

CREATE TABLE connection_columns (
  id SERIAL PRIMARY KEY,
  table_id INTEGER NOT NULL REFERENCES connection_tables(id) ON DELETE CASCADE,
  column_name VARCHAR(255) NOT NULL,
  data_type VARCHAR(255) NOT NULL,
  nullable BOOLEAN NOT NULL DEFAULT true,
  ordinal INTEGER NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  is_pii BOOLEAN NOT NULL DEFAULT false,
  missing BOOLEAN NOT NULL DEFAULT false,
  description TEXT NOT NULL DEFAULT '',
  example_values JSONB NOT NULL DEFAULT '[]',
  description_status VARCHAR(10) NOT NULL DEFAULT 'empty' CHECK (description_status IN ('empty', 'draft', 'approved')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (table_id, column_name)
);

CREATE TABLE connection_api_keys (
  id SERIAL PRIMARY KEY,
  connection_id INTEGER NOT NULL REFERENCES data_connections(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  key_prefix VARCHAR(20) NOT NULL UNIQUE,                -- ส่วนที่แสดงได้ เช่น nkc_ab12cd34
  key_hash CHAR(64) NOT NULL,                            -- SHA-256 ของ key เต็ม
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

CREATE TABLE user_connection_selections (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  connection_id INTEGER NOT NULL REFERENCES data_connections(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, connection_id)
);
```
- LLM: ใช้ `llm_connections` + `models` ที่มีอยู่ (อ่านอย่างเดียว) ค่าเริ่มต้นของหน้านี้ = `models.model_id` ที่ตั้งใน env `STUDIO_AI_DEFAULT_MODEL` (ตอนนี้ `Qwen/Qwen3.8-27B` บน VLLM ของ IMC — ข้อมูลไม่ออกนอก และไม่มีค่าต่อ token) ถ้าไม่ได้ตั้งหรือ model ถูกปิด ใช้ model ที่ `is_default` ของระบบ เลือก model อื่นที่ `is_active` ได้ เรียก OpenAI-compatible `chat/completions` ผ่าน `resolveEndpointUrl()`/`getLLMHeaders()` โดยไม่แก้ `lib/llm-core.ts`
- ไลบรารี: `pg`, `mysql2`, `mssql`, `oracledb`, `@clickhouse/client`, `node-sql-parser` (อนุมัติแล้วในแชท)

## 6. สิทธิ์และความปลอดภัย
- SSRF: ห้าม localhost, 127.0.0.0/8, 169.254.0.0/16, IP ของเซิร์ฟเวอร์ (ยกเว้น `STUDIO_DB_HOST_ALLOWLIST`) และต่อไปที่ IP ที่ตรวจแล้วเท่านั้น
- timeout 10 วินาที, preview 5 แถว, query ≤ 100 แถว และค่าในเซลล์ตัดที่ 500 ตัวอักษร
- **Query ทุกช่องทาง**: คำสั่งเดียว เริ่มด้วย SELECT/WITH, ห้ามคำสั่งแก้ข้อมูล/DDL/`INTO`/การเรียกฟังก์ชันอันตรายที่รู้จัก, รันใน read-only transaction (หรือ rollback เสมอสำหรับ SQL Server/ClickHouse) และบัญชี DB ควรเป็นอ่านอย่างเดียว
- **API ของ MCP เพิ่ม**: parser ต้องแยกตาราง/คอลัมน์ได้ และทุกตัวต้องอยู่ในชุดที่เปิดใช้และไม่ใช่ PII, `SELECT *` ใช้ได้เฉพาะตารางที่ทุกคอลัมน์เปิดใช้ ถ้า parser ไม่รองรับ dialect (Oracle, ClickHouse) หรือ parse ไม่ผ่าน → ปฏิเสธ (fail-closed)
- API key: สุ่ม 32 byte, เก็บเฉพาะ SHA-256, เปรียบเทียบแบบ timing-safe, ผูก connection เดียว, ยกเลิกได้, ห้าม log
- ส่งข้อมูลให้ LLM: เฉพาะตาราง/คอลัมน์ที่เลือกและไม่ใช่ PII, ตัวอย่างข้อมูลส่งเมื่อ creator ติ๊กเท่านั้น
- รูปอัปโหลด: ตรวจ MIME จาก magic bytes, SVG ตัด `<script>`, `on*`, `href` ภายนอก, `<foreignObject>`
- user เห็นเฉพาะ connection ที่ `published` และไม่เห็น host/username/รหัสผ่าน
- ห้าม log connection string, รหัสผ่าน, API key และเนื้อ SQL/คำถาม (log แค่ความยาวและผลลัพธ์)

## 7. Acceptance criteria และกรณีทดสอบ
| # | เกณฑ์ | วิธีทดสอบ | ผลที่คาด |
|---|---|---|---|
| 1 | สร้าง PostgreSQL ที่ใช้ได้ | ใส่ค่า DB ทดสอบแบบ read-only | สถานะ "ใช้ได้", readOnly = true |
| 2 | เตือนเมื่อเขียนได้ | ใช้ account ที่เขียนได้ | เตือนสีแดง |
| 3 | รหัสผ่านไม่หลุด | ดู response ของ GET | ไม่มี password, มีแค่ `hasPassword` |
| 4 | host ภายในถูกบล็อก | ใส่ `127.0.0.1` | 400 พร้อมข้อความภาษาไทย |
| 5 | ดู schema ได้ | กดดูตาราง | เห็นคอลัมน์และ 5 แถว |
| 6 | ลบตัวที่ใช้อยู่ไม่ได้ | ลบ connection ที่ผูก source | 409 บอกชื่อ Knowledge Set |
| 7 | รูป auto จากชื่อ | สร้าง connection ชื่อ "trade demo" | ได้ไอคอนเรือ |
| 8 | อัปโหลดรูป | อัปโหลด SVG ที่มี `<script>` และไฟล์ 1 MB | script ถูกตัด / 400 ไฟล์ใหญ่เกิน |
| 9 | Sync ไม่ลบคำอธิบาย | เขียนคำอธิบาย → sync ซ้ำ | คำอธิบายยังอยู่ ตารางใหม่ปิดไว้ |
| 10 | AI ร่างคำอธิบาย | กดร่าง 1 ตาราง | ได้คำอธิบายสถานะ `draft`, คอลัมน์ PII ไม่ถูกส่ง |
| 11 | Query SQL | `SELECT * FROM products` / `DELETE FROM products` | ได้ผล ≤ 100 แถว / 400 |
| 12 | ถามภาษาคน | "ส่งออกไปจีนเดือนไหนมากสุด" | ได้ SQL ให้ตรวจก่อน กดรันแล้วได้ผล |
| 13 | API key | สร้าง key → เรียก catalog | 200 • key ผิด/ยกเลิก → 401 |
| 14 | MCP query บังคับ allowlist | อ้างตารางที่ปิด / คอลัมน์ PII | 400 บอกชื่อตาราง/คอลัมน์ |
| 15 | เผยแพร่และ user เลือก | เผยแพร่ → login เป็น user → เลือก | เห็นในหน้า `/connections` และใน `/api/connections/selected` |
| 16 | user ไม่เห็นข้อมูลลับ | ดู `/api/connections` | ไม่มี host, username, รหัสผ่าน |
| 18 | เพิ่มใน MCP Hub | เพิ่ม server แบบ Streamable HTTP ด้วย URL `/mcp` + header API key | ได้ 2 tool, describe ไม่มีคอลัมน์ PII, query บังคับ allowlist |
| 17 | ปิดใช้ทั้งฐานข้อมูล | ปิดสวิตช์ใน sidebar | user มองไม่เห็น, MCP API 403, เปิดกลับแล้วทุกอย่างกลับมาเหมือนเดิม |

## 8. ไฟล์ที่เป็นเจ้าของ
`app/studio/connections/**`, `components/studio/connections/**`, `app/api/studio/connections/**`, `lib/studio/connections/**`, **`app/connections/**`, `app/api/connections/**`, `components/connections/**`** (v2)

## 9. Activity log ที่ต้องเขียน
`connection.create`, `connection.update`, `connection.delete`, `connection.test` • v2 (เสนอเพิ่มในตารางของ A01): `connection.publish`, `connection.catalog_sync`, `connection.catalog_update`, `connection.catalog_ai_draft`, `connection.query`, `connection.query_ai`, `connection.api_key_create`, `connection.api_key_revoke`, `connection.api_query`, `connection.select`

## 10. คำถามที่ยังเปิด
- เดโม Expo ใช้ DB อะไร
- การนำ DB ที่ user เลือกไปใช้ในแชท/agent (P03, CORE-02) จะใช้ API `/api/connections/selected` หรือผ่าน MCP ของทีม MCP
- ควรจำกัดจำนวนครั้งที่เรียก API ของ MCP ต่อ key (rate limit) หรือไม่
