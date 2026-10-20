# STUDIO — Dataset Studio

Dataset Studio: หน้าหลังบ้านให้ทีมงาน (Knowledge Curator) โยนชุดข้อมูล เขียน use case และตัวอย่างคำถาม ดูผลการประมวลผล ทดลองค้นหา และเผยแพร่ (ยังไม่มีโค้ด) — งานประมวลผลจริงเรียก API ของกลุ่ม KNOW

| | |
|---|---|
| Branch ของกลุ่ม | `group/studio` |
| Branch ของการ์ด | `feat/studio/<ID>-<slug>` หรือ `fix/studio/<ID>-<slug>` |
| ทีม | Team 10 |
| ช่วงเลข migration | 900-999 |
| สถานะการ์ด | Miro Feature Tracker แถว "STUDIO Dataset Studio" — https://miro.com/app/board/uXjVEXm3whU=/ |

## ไฟล์ที่กลุ่มนี้ดูแล (ตรงกับ `.github/CODEOWNERS`)
- `lib/studio/` (ใหม่)
- `app/api/admin/studio/` (ใหม่)
- `app/admin/studio/` (ใหม่)
- `components/studio/` (ใหม่)

## ตารางใน DB
- ยังไม่มี — เสนอ: datasets, dataset_files, dataset_use_cases, example_questions (พร้อม golden answer), dataset_tags (ออกแบบร่วมกับ KNOW-01)

## API Route
- ยังไม่มี — ออกแบบใน Spec ของ STUDIO-01, STUDIO-02, STUDIO-03

## หน้าจอ
- `/admin/studio` (ใหม่, ต้องขอ OPS เพิ่มแท็บใน AdminTabs)

## ฟีเจอร์ที่มีแล้ว (จากการตรวจโค้ด 2026-10-20)
- ยังไม่มี

## การ์ดที่ยังเปิดอยู่ (ภาพ ณ 2026-10-20 — สถานะล่าสุดดูใน Miro)
| ID | งาน | สถานะ | Priority | Phase |
|---|---|---|---|---|
| STUDIO-01 | Dataset catalog + metadata | Not Started | P0 | Phase 1 |
| STUDIO-02 | Upload files or pick existing dataset | Not Started | P0 | Phase 1 |
| STUDIO-03 | Use cases + example questions | Not Started | P0 | Phase 1 |
| STUDIO-04 | AI enrichment: summary, tags, entities | Not Started | P0 | Phase 1 |
| STUDIO-05 | Processing status + re-index UI | Not Started | P0 | Phase 1 |
| STUDIO-06 | Retrieval playground | Not Started | P0 | Phase 1 |
| STUDIO-07 | Agent perspective from use cases | Not Started | P0 | Phase 1 |
| STUDIO-08 | Import-Export dataset for AI Expo | Not Started | P0 | Phase 1 |
| STUDIO-09 | Golden answers + auto evaluation | Not Started | P1 | Phase 1 |
| STUDIO-10 | Review AI tags and summaries | Not Started | P1 | Phase 2 |
| STUDIO-11 | Publish workflow Draft / Review / Published | Not Started | P1 | Phase 2 |
| STUDIO-12 | Guardrails per agent | Not Started | P1 | Phase 2 |
| STUDIO-13 | Synonym and abbreviation glossary TH-EN | Not Started | P1 | Phase 2 |
| STUDIO-14 | Unanswered question review queue | Not Started | P1 | Phase 2 |
| STUDIO-15 | Curator role and permissions | Not Started | P1 | Phase 2 |
| STUDIO-16 | Customer private dataset upload | Not Started | P1 | Phase 2 |
| STUDIO-17 | Dataset versioning + rollback | Not Started | P2 | Phase 2 |
| STUDIO-18 | Freshness schedule + expiry flags | Not Started | P2 | Phase 3 |
