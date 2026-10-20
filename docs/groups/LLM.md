# LLM — LLM Gateway

เชื่อมต่อ LLM provider และจัดการโมเดลที่เปิดให้ใช้

| | |
|---|---|
| Branch ของกลุ่ม | `group/llm-gateway` |
| Branch ของการ์ด | `feat/llm-gateway/<ID>-<slug>` หรือ `fix/llm-gateway/<ID>-<slug>` |
| ทีม | Team 4 |
| ช่วงเลข migration | 400-499 |
| สถานะการ์ด | Miro Feature Tracker แถว "LLM LLM Gateway" — https://miro.com/app/board/uXjVEXm3whU=/ |

## ไฟล์ที่กลุ่มนี้ดูแล (ตรงกับ `.github/CODEOWNERS`)
- `lib/llm-utils.ts`
- `app/admin/llm/`
- `components/admin/AdminLLMSection.tsx`
- `app/api/admin/llm-connections/`
- `app/api/admin/models/`
- `app/api/chat/models/`

## ตารางใน DB
- llm_connections
- models

## API Route
- `GET, POST /api/admin/llm-connections`
- `GET, PUT, DELETE /api/admin/llm-connections/[id]`
- `POST /api/admin/llm-connections/test`
- `GET, POST /api/admin/models`
- `PUT, DELETE /api/admin/models/[id]`
- `GET /api/chat/models`

## หน้าจอ
- `/admin/llm`

## ฟีเจอร์ที่มีแล้ว (จากการตรวจโค้ด 2026-10-20)
- LLM-01 LLM connection CRUD — OpenAI-compatible และ Ollama (app/api/admin/llm-connections)
- LLM-02 Test connection — เรียก /models หรือ /api/tags แล้วแสดงรายชื่อโมเดล
- LLM-03 Unified model catalog — รวมโมเดลจาก provider กับที่บันทึกใน DB, cache 60 วินาที
- LLM-04 Add custom model — POST /api/admin/models
- LLM-05 Model settings — ชื่อ, context, max_tokens, temperature, top_p, supports_tools
- LLM-06 Default model — ไม่ได้ทำใน transaction อาจมี default 0 หรือ 2 ตัว
- LLM-07 OpenRouter header normalization — lib/llm-utils.ts (HTTP-Referer ยัง hardcode localhost)

## การ์ดที่ยังเปิดอยู่ (ภาพ ณ 2026-10-20 — สถานะล่าสุดดูใน Miro)
| ID | งาน | สถานะ | Priority | Phase |
|---|---|---|---|---|
| LLM-08 | Connection priority | Partial | P1 | Phase 2 |
| LLM-09 | Model on / off | Partial | P1 | Phase 1 |
| LLM-10 | Native Ollama streaming | Partial | P1 | Phase 1 |
| LLM-11 | Respect temperature 0 and max_tokens | Partial | P1 | Phase 1 |
| LLM-12 | Encrypt and mask API keys | Not Started | P0 | Phase 0 |
| LLM-13 | Provider-aware reasoning params | Not Started | P1 | Phase 1 |
| LLM-14 | Auto failover between connections | Not Started | P1 | Phase 2 |
| LLM-15 | Model access per group | Not Started | P1 | Phase 2 |
| LLM-16 | Cost tracking per model | Not Started | P2 | Phase 3 |
