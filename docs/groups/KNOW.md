# KNOW — Knowledge Engine (RAG)

Knowledge Engine: อัปโหลดเอกสาร, chunking, embedding, vector search, RAG และ citation (ยังไม่มีโค้ด)

| | |
|---|---|
| Branch ของกลุ่ม | `group/knowledge` |
| Branch ของการ์ด | `feat/knowledge/<ID>-<slug>` หรือ `fix/knowledge/<ID>-<slug>` |
| ทีม | Team 6 |
| ช่วงเลข migration | 600-699 |
| สถานะการ์ด | Miro Feature Tracker แถว "KNOW Knowledge Engine" — https://miro.com/app/board/uXjVEXm3whU=/ |

## ไฟล์ที่กลุ่มนี้ดูแล (ตรงกับ `.github/CODEOWNERS`)
- `lib/knowledge/` (ใหม่)
- `app/api/knowledge/` (ใหม่)
- `app/admin/knowledge/` (ใหม่)
- `components/knowledge/` (ใหม่)

## ตารางใน DB
- ยังไม่มี — เสนอ: knowledge_collections, knowledge_documents, knowledge_chunks, agent_knowledge (ตัดสินใน KNOW-01 และ Open Decision เรื่อง pgvector / Qdrant)

## API Route
- ยังไม่มี — ออกแบบใน Spec ของ KNOW-01, KNOW-02, KNOW-06

## หน้าจอ
- `/admin/knowledge` (ใหม่, ต้องขอ OPS เพิ่มแท็บใน AdminTabs)

## ฟีเจอร์ที่มีแล้ว (จากการตรวจโค้ด 2026-10-20)
- ยังไม่มี

## การ์ดที่ยังเปิดอยู่ (ภาพ ณ 2026-10-20 — สถานะล่าสุดดูใน Miro)
| ID | งาน | สถานะ | Priority | Phase |
|---|---|---|---|---|
| KNOW-01 | Knowledge data model | Not Started | P0 | Phase 1 |
| KNOW-02 | Document upload PDF / DOC / Excel | Not Started | P0 | Phase 1 |
| KNOW-03 | Text extraction + Thai chunking | Not Started | P0 | Phase 1 |
| KNOW-04 | Embedding pipeline | Not Started | P0 | Phase 1 |
| KNOW-05 | Vector store (pgvector or Qdrant) | Not Started | P0 | Phase 1 |
| KNOW-06 | search_knowledge tool for agents | Not Started | P0 | Phase 1 |
| KNOW-07 | Source citation in answers | Not Started | P0 | Phase 1 |
| KNOW-08 | Knowledge admin UI | Not Started | P1 | Phase 2 |
| KNOW-09 | Hybrid search + rerank | Not Started | P1 | Phase 2 |
| KNOW-10 | Ready Knowledge Library content | Not Started | P1 | Phase 2 |
| KNOW-11 | Hybrid agent (IMC + org data) | Not Started | P1 | Phase 2 |
| KNOW-12 | Connectors: Database, API, Website | Not Started | P2 | Phase 3 |
| KNOW-13 | OCR for scanned documents | Not Started | P2 | Phase 3 |
