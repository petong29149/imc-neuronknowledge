# AGENT — Agent Factory

สร้างและจัดการ Agent, Skill, built-in tool และ system prompt หลายชั้น

| | |
|---|---|
| Branch ของกลุ่ม | `group/agent-factory` |
| Branch ของการ์ด | `feat/agent-factory/<ID>-<slug>` หรือ `fix/agent-factory/<ID>-<slug>` |
| ทีม | Team 3 |
| ช่วงเลข migration | 300-399 |
| สถานะการ์ด | Miro Feature Tracker แถว "AGENT Agent Factory" — https://miro.com/app/board/uXjVEXm3whU=/ |

## ไฟล์ที่กลุ่มนี้ดูแล (ตรงกับ `.github/CODEOWNERS`)
- `lib/agents.ts`
- `lib/agent-validation.ts`
- `lib/skills.ts`
- `lib/skills-constants.ts`
- `lib/system-prompt.ts`
- `lib/settings.ts`
- `lib/core-prompt-lock.ts`
- `lib/turn-context.ts`
- `lib/tool-executor.ts`
- `lib/builtin-tools/`
- `app/admin/agents/`
- `app/admin/skills/`
- `app/admin/prompts/`
- `components/admin/AdminAgentsSection.tsx`
- `components/admin/AdminSkillsSection.tsx`
- `components/admin/AdminPromptsSection.tsx`
- `app/api/admin/agents/`
- `app/api/admin/skills/`
- `app/api/admin/settings/`
- `app/api/chat/agents/`

## ตารางใน DB
- agents
- agent_skills
- agent_tools
- agent_groups
- skills
- app_settings
- prompt_revisions

## API Route
- `GET, POST /api/admin/agents`
- `PUT, DELETE /api/admin/agents/[id]`
- `GET, POST /api/admin/skills`
- `GET, PUT, DELETE /api/admin/skills/[id]`
- `GET, PUT /api/admin/settings/prompts`
- `GET /api/admin/settings/prompts/revisions`
- `GET /api/admin/settings/prompts/preview`
- `POST, DELETE /api/admin/settings/core-prompt/unlock`
- `GET /api/chat/agents`

## หน้าจอ
- `/admin/agents`
- `/admin/skills`
- `/admin/prompts`

## ฟีเจอร์ที่มีแล้ว (จากการตรวจโค้ด 2026-10-20)
- AGENT-01 Agent CRUD + enable / default — app/api/admin/agents, AdminAgentsSection.tsx, default agent มีได้ตัวเดียว
- AGENT-02 Bind skills to agent — agent_skills, load_skill เห็นเฉพาะ skill ที่ผูก
- AGENT-03 Bind MCP tools to agent — agent_tools, เลือกทั้ง server ได้
- AGENT-04 Restrict agent to groups — agent_groups, ไม่เลือก group = ทุกคนใช้ได้
- AGENT-05 Skills CRUD + load_skill on demand — ใส่แค่ชื่อและคำอธิบายใน prompt แล้วโหลดเนื้อหาเมื่อจำเป็น
- AGENT-06 Built-in calculator tool — mathjs sandbox (lib/builtin-tools/calculator.ts)
- AGENT-07 Layered system prompt — core > persona > agent > effort > skills > tools > วันเวลา (lib/system-prompt.ts)
- AGENT-08 Persona prompt editor — แก้ได้ทุก admin มีผู้แก้ล่าสุด
- AGENT-09 Core prompt password lock — ปลดล็อก 15 นาทีด้วย CORE_PROMPT_PASSWORD_HASH (lib/core-prompt-lock.ts)
- AGENT-10 Prompt revision history + restore — prompt_revisions 30 รายการล่าสุด
- AGENT-11 Full prompt preview per agent — GET /api/admin/settings/prompts/preview

## การ์ดที่ยังเปิดอยู่ (ภาพ ณ 2026-10-20 — สถานะล่าสุดดูใน Miro)
| ID | งาน | สถานะ | Priority | Phase |
|---|---|---|---|---|
| AGENT-12 | Default model per agent | Partial | P2 | Phase 2 |
| AGENT-13 | Synthesis step forces Thai | Partial | P1 | Phase 1 |
| AGENT-14 | Block empty core prompt save | Not Started | P1 | Phase 0 |
| AGENT-15 | Bind knowledge sources to agent | Not Started | P0 | Phase 1 |
| AGENT-16 | Domain-ready agent templates | Not Started | P1 | Phase 2 |
| AGENT-17 | Agent prompt versioning | Not Started | P2 | Phase 3 |
| AGENT-18 | Skill import / export (SKILL.md) | Not Started | P2 | Phase 3 |
| AGENT-19 | Per-agent built-in tool toggle | Not Started | P2 | Phase 3 |
