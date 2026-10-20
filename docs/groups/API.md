# API — Public API & Channels

Public API สำหรับระบบภายนอก, API key, webhook และช่องทาง LINE / Teams / Slack (ยังไม่มีโค้ด)

| | |
|---|---|
| Branch ของกลุ่ม | `group/integrations` |
| Branch ของการ์ด | `feat/integrations/<ID>-<slug>` หรือ `fix/integrations/<ID>-<slug>` |
| ทีม | Team 8 |
| ช่วงเลข migration | 800-899 |
| สถานะการ์ด | Miro Feature Tracker แถว "API Integrations" — https://miro.com/app/board/uXjVEXm3whU=/ |

## ไฟล์ที่กลุ่มนี้ดูแล (ตรงกับ `.github/CODEOWNERS`)
- `app/api/v1/` (ใหม่)
- `lib/api-keys.ts` (ใหม่)
- `docs/openapi.yaml` (ใหม่ — contract กลาง)

## ตารางใน DB
- ยังไม่มี — เสนอ: api_keys, webhooks

## API Route
- ยังไม่มี — ออกแบบใน Spec ของ API-02 และ API-03

## หน้าจอ
- ไม่มี

## ฟีเจอร์ที่มีแล้ว (จากการตรวจโค้ด 2026-10-20)
- ยังไม่มี

## การ์ดที่ยังเปิดอยู่ (ภาพ ณ 2026-10-20 — สถานะล่าสุดดูใน Miro)
| ID | งาน | สถานะ | Priority | Phase |
|---|---|---|---|---|
| API-01 | API key management | Not Started | P1 | Phase 3 |
| API-02 | Public REST API v1 | Not Started | P1 | Phase 3 |
| API-03 | OpenAPI 3.1 docs | Not Started | P1 | Phase 3 |
| API-04 | Webhooks | Not Started | P2 | Phase 3 |
| API-05 | LINE OA channel | Not Started | P2 | Phase 3 |
| API-06 | Microsoft Teams / Slack channel | Not Started | P2 | Phase 3 |
| API-07 | Workflow automation | Not Started | P2 | Phase 3 |
