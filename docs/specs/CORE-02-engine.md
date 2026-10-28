# Spec: Knowledge Engine (CORE-02)

- ผู้ใช้: ทุกบทบาท (งานหลังบ้าน) • Branch: `core/engine` → PR เข้า `staging` • เจ้าของ: Engine team (แนะนำ 2 คน)
- ขึ้นกับ: CORE-01 (ตารางและ migration) • หน้าที่รอ: S03, S06, P03

## 1. เป้าหมาย
เครื่องยนต์กลางที่เปลี่ยนแหล่งข้อมูลเป็นความรู้ที่ค้นได้ และตอบพร้อมแหล่งอ้างอิง ทุกหน้าเรียกผ่าน `lib/knowledge/*` เท่านั้น ไม่มีหน้าไหนเขียน SQL กับ `knowledge_chunks` เอง

## 2. ขอบเขต
- ทำ:
  1. **แปลงไฟล์เป็นข้อความ** (`lib/knowledge/extract.ts`): PDF, DOCX, XLSX/CSV (แถวละ 1 record พร้อมชื่อคอลัมน์), TXT/MD เก็บ locator (หน้า, sheet+row)
  2. **ตัดคำไทยและแบ่ง chunk** (`chunk.ts`): ตาม `RagSettings` preset `long_document`, `faq_short`, `table_rows`
  3. **Embedding** (`embed.ts`): เรียกโมเดลผ่าน LLM Gateway เดิม (OpenAI-compatible `/embeddings`) แบบ batch, ล็อกชื่อโมเดลต่อ Knowledge Set
  4. **Vector store** (`store.ts`): เขียน/ลบ chunk ตาม source ใช้ pgvector ตามร่าง (ออกแบบ interface ให้สลับเป็น Qdrant ได้)
  5. **Hybrid search** (`search.ts`): `searchKnowledge({ knowledgeSetIds, query, settings })` → keyword + vector รวมคะแนนตาม `keywordWeight`, rerank เมื่อเปิด, ตัดด้วย `minScore` คืน `Citation[]`
  6. **Query สดจาก DB** (`live-query.ts`): สำหรับ source โหมด `live` ให้ LLM เขียน SQL แบบ SELECT อย่างเดียว เฉพาะตาราง/คอลัมน์ที่อนุญาต จำกัดแถวและเวลา
  7. **Job queue** (`jobs.ts`): ตาราง `ingestion_jobs` + worker ที่ดึงงานทีละชิ้น (ไม่บล็อก request) อัปเดต progress
  8. **Tool ให้ agent**: `search_knowledge` (built-in tool ใหม่ใน `lib/builtin-tools/`) ใช้ Knowledge Set ที่ผูกกับ agent และส่ง citation กลับ
  9. **Dynamic few-shot**: `findSimilarExamples(agentId, question, k=3)` จาก `use_case_examples.embedding`
- ไม่ทำ: หน้าจอใดๆ (หน้าอยู่ที่ S03/S06), OCR ไฟล์สแกน (หลัง Expo)

## 3. หน้าจอ
ไม่มี

## 4. API (ภายใน)
| Method | Path | สิทธิ์ | ใช้โดย |
|---|---|---|---|
| POST | `/api/studio/jobs` | creator, admin | S03 สั่ง index / reindex source |
| GET | `/api/studio/jobs?knowledgeSetId=` | creator, admin | S03, S01 ดูความคืบหน้า |
| POST | `/api/studio/search` | creator, admin | S03/S06 playground ค้นทดสอบ (คืน citation + คะแนน) |

## 5. ข้อมูล
เขียน: `knowledge_chunks`, `ingestion_jobs`, `knowledge_sources.status/chunk_count/error`, `use_case_examples.embedding` • อ่าน: `knowledge_sets`, `data_connections`

## 6. สิทธิ์และความปลอดภัย
- live query: บังคับ SELECT, ห้าม `;` หลายคำสั่ง, whitelist ตาราง/คอลัมน์, `LIMIT` และ statement timeout, ใช้ account อ่านอย่างเดียว
- ไม่ log เนื้อหาเอกสารหรือคำถามของผู้ใช้ลง server log
- ไฟล์อัปโหลดเก็บนอก `public/` จำกัดขนาด (ค่าเริ่มต้น 50 MB) และตรวจ MIME จริง

## 7. Acceptance criteria และกรณีทดสอบ
| # | เกณฑ์ | วิธีทดสอบ | ผลที่คาด |
|---|---|---|---|
| 1 | index PDF ภาษาไทย 20 หน้าได้ | สั่ง job | status ready, chunk_count > 0, locator มีเลขหน้า |
| 2 | Excel แถวละ record | ไฟล์ 100 แถว preset table_rows | 100 chunk, locator = sheet+row |
| 3 | ค้นคำไทยที่ไม่มีช่องว่างเจอ | ค้น "ใบขนสินค้า" | ได้ chunk ที่มีคำนี้ในอันดับต้น |
| 4 | hybrid ดีกว่า vector อย่างเดียว | ชุดคำถามทดสอบ 20 ข้อ | recall@5 ของ hybrid ≥ vector |
| 5 | live query ปฏิเสธคำสั่งเขียน | ให้ LLM ถูกหลอกให้ DELETE | ถูกบล็อกก่อนส่งถึง DB |
| 6 | ลบ source แล้ว chunk หาย | ลบ source | ไม่มี chunk ของ source นั้นเหลือ |

## 8. ไฟล์ที่เป็นเจ้าของ
`lib/knowledge/**`, `lib/builtin-tools/search-knowledge.ts`, `app/api/studio/jobs/**`, `app/api/studio/search/**`, worker script ใน `scripts/` (ขอ OPS ตอนรวม)

## 9. Activity log ที่ต้องเขียน
`job.index`, `job.reindex`, `job.failed`

## 10. คำถามที่ยังเปิด
- pgvector หรือ Qdrant • embedding model รันเอง (bge-m3) หรือใช้ API • ใช้ library ตัดคำไทยตัวไหน (ต้องขออนุมัติแพ็กเกจ) • worker รันเป็น process แยกหรือใน Next.js
