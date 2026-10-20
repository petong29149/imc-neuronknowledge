# Glossary (คำศัพท์)

| คำ | ความหมายในระบบ | ชื่อในโค้ด / ตาราง |
|---|---|---|
| Agent | Persona AI ที่กำหนด prompt, skill, tool และกลุ่มผู้ใช้ที่เข้าถึงได้ | `agents`, `lib/agents.ts` |
| Default agent | Agent ที่ใช้เมื่อไม่ได้เลือก มีได้ตัวเดียว | `agents.is_default` |
| Skill | ชุดคำสั่ง (instruction pack) ที่ AI โหลดเมื่อจำเป็นผ่าน tool `load_skill` | `skills`, `agent_skills` |
| Tool | ความสามารถที่ AI เรียกได้: built-in (`calculator`, `load_skill`) หรือจาก MCP server | `lib/builtin-tools/`, `mcp_tools`, `agent_tools` |
| MCP server | ระบบภายนอกที่ให้ tool ผ่าน Model Context Protocol (SSE, Streamable HTTP, stdio) | `mcp_servers`, `lib/mcp.ts` |
| LLM connection | ปลายทาง API แบบ OpenAI-compatible หรือ Ollama พร้อม API key | `llm_connections` |
| Model | โมเดลที่เปิดใช้จาก connection พร้อมค่าตั้ง | `models` |
| Core prompt | กฎหลักของ AI แก้ได้เมื่อปลดล็อกด้วยรหัส | `app_settings` key `core_prompt`, `lib/core-prompt-lock.ts` |
| Persona prompt | บุคลิกและน้ำเสียงของ AI ทั้งระบบ | `app_settings` key `persona_prompt` |
| Prompt revision | ประวัติการแก้ core / persona prompt | `prompt_revisions` |
| Effort level | ระดับการคิด low / medium / high กำหนดจำนวนรอบ tool และ reasoning | `chats.effort_level` |
| Chat / Conversation | บทสนทนาหนึ่งเรื่อง เก็บประวัติเป็น JSONB | `chats`, `chats.chat_history` |
| Turn | คำถามหนึ่งครั้งของผู้ใช้กับคำตอบทั้งหมดที่ตามมา (รวม tool calls) | `lib/turn-context.ts` |
| Chat run | งานสร้างคำตอบที่ยังทำงานอยู่ ต่อได้หลัง refresh | `lib/chat-runs.ts` |
| Group | กลุ่มผู้ใช้ ใช้จำกัดว่าใครเห็น agent ไหน | `groups`, `group_members`, `agent_groups` |
| Ready Knowledge | คลังความรู้โดเมนที่ IMC เตรียมไว้ (Medical, Trade, Legal, Finance, HR) | ยังไม่มี (KNOW-10) |
| Custom Knowledge | ความรู้จากข้อมูลขององค์กรลูกค้า (เอกสาร, DB, API, เว็บ) | ยังไม่มี (KNOW-01 ถึง 07) |
| Hybrid Knowledge | Agent ที่ใช้ทั้ง Ready และ Custom Knowledge | ยังไม่มี (KNOW-11) |
| Citation | การอ้างอิงแหล่งที่มาของคำตอบให้ตรวจย้อนได้ | ยังไม่มี (KNOW-07) |
| การ์ด / Card ID | งานหนึ่งใบใน Miro Feature Tracker รูปแบบ `<กลุ่ม>-<เลข>` | ใช้ใน branch, Spec, Handoff, Commit |
