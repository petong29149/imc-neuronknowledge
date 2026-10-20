# CHAT — Chat Experience

หน้าแชทของผู้ใช้: ส่งข้อความ, streaming, tool loop, ประวัติแชท และการตั้งค่าส่วนตัว

| | |
|---|---|
| Branch ของกลุ่ม | `group/chat` |
| Branch ของการ์ด | `feat/chat/<ID>-<slug>` หรือ `fix/chat/<ID>-<slug>` |
| ทีม | Team 2 |
| ช่วงเลข migration | 200-299 |
| สถานะการ์ด | Miro Feature Tracker แถว "CHAT Chat" — https://miro.com/app/board/uXjVEXm3whU=/ |

## ไฟล์ที่กลุ่มนี้ดูแล (ตรงกับ `.github/CODEOWNERS`)
- `app/chat/`
- `components/chat/`
- `app/api/chat/completions/`
- `app/api/chat/conversations/`
- `lib/llm-core.ts`
- `lib/chat-runs.ts`
- `lib/chat-title.ts`

## ตารางใน DB
- chats (chat_history JSONB, token totals)
- อ่าน: models, agents, app_settings

## API Route
- `POST /api/chat/completions`
- `GET, POST /api/chat/conversations`
- `GET, PUT, DELETE /api/chat/conversations/[id]`
- `POST /api/chat/conversations/[id]/stop`
- `GET /api/chat/conversations/[id]/stream`

## หน้าจอ
- `/chat`
- `/chat/[id]`

## ฟีเจอร์ที่มีแล้ว (จากการตรวจโค้ด 2026-10-20)
- CHAT-01 Send message + SSE streaming — POST /api/chat/completions stream event meta/status/content/tool/done
- CHAT-02 Reasoning / thinking display — เก็บ reasoning_content ต่อข้อความ (lib/llm-core.ts)
- CHAT-03 Effort levels Low / Medium / High — กำหนดจำนวนรอบ tool 5/10/20 และ reasoning_effort
- CHAT-04 Agent selection + welcome cards — GET /api/chat/agents ตรวจสิทธิ์ตาม group ทุก turn
- CHAT-05 Agentic tool loop + steps timeline — เรียก tool ตามลำดับ, heartbeat, synthesis round, แสดงขั้นตอนใน UI
- CHAT-06 Stop generation — POST /api/chat/conversations/[id]/stop เก็บคำตอบบางส่วน
- CHAT-07 Auto chat title — lib/chat-title.ts สร้าง emoji + 2-6 คำ ขนานกับคำตอบ
- CHAT-08 Conversation list + infinite scroll — GET /api/chat/conversations keyset pagination
- CHAT-09 Rename / delete conversation — PUT / DELETE /api/chat/conversations/[id] (ลบถาวร ไม่มี confirm)
- CHAT-10 Deep link + back / forward — /chat/[id] รองรับ UUID และ id ตัวเลข
- CHAT-11 Copy answer and code block — ปุ่มคัดลอกใน ChatInterface.tsx
- CHAT-12 User settings modal — ธีม, ขนาดตัวอักษร, โปรไฟล์, รหัสผ่าน, About + patch notes (SettingsModal.tsx)
- CHAT-13 User guide carousel — UserGuideModal.tsx 6 ขั้น เปิดอัตโนมัติครั้งแรก

## การ์ดที่ยังเปิดอยู่ (ภาพ ณ 2026-10-20 — สถานะล่าสุดดูใน Miro)
| ID | งาน | สถานะ | Priority | Phase |
|---|---|---|---|---|
| CHAT-14 | Resumable background runs | Partial | P1 | Phase 2 |
| CHAT-15 | Model picker per message | Partial | P1 | Phase 1 |
| CHAT-16 | Search conversations | Partial | P2 | Phase 3 |
| CHAT-17 | Markdown rendering | Partial | P1 | Phase 1 |
| CHAT-18 | Archive conversations | Partial | P2 | Phase 3 |
| CHAT-19 | Error display and retry | Partial | P1 | Phase 1 |
| CHAT-20 | Context window management | Not Started | P0 | Phase 1 |
| CHAT-21 | File attachments + image input | Not Started | P1 | Phase 3 |
| CHAT-22 | Regenerate / edit and resend | Not Started | P2 | Phase 3 |
| CHAT-23 | Answer feedback (thumbs up / down) | Not Started | P2 | Phase 3 |
| CHAT-24 | Share / export chat | Not Started | P2 | Phase 3 |
| CHAT-25 | Token usage display for users | Not Started | P2 | Phase 3 |
| CHAT-26 | Fix tool result mapped to wrong card | Not Started | P2 | Phase 1 |
