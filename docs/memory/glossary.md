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
| User / Creator / Admin | 3 บทบาทของระบบ: ใช้ agent / สร้างความรู้และ agent ใน `/studio` / ดูแลระบบและดูประวัติ | `users.role` = `user`, `creator`, `admin` |
| Ready Agent | Agent ที่เผยแพร่แล้ว ผู้ใช้เห็นในหน้า catalog และเรียกใช้ได้ทันที | `agents.status = 'published'` |
| Data connection | การเชื่อมต่อไป database ภายนอก (PostgreSQL, MySQL, SQL Server) แบบอ่านอย่างเดียว | `data_connections` (S02) |
| Knowledge Set | ความรู้หนึ่งชุดที่รวมหลายแหล่ง (ไฟล์, ตารางจาก DB, MCP tool) พร้อมค่าตั้ง RAG | `knowledge_sets` (S03) |
| Source (แหล่ง) | แหล่งข้อมูลหนึ่งรายการใน Knowledge Set มีโหมด `index` หรือ `live` | `knowledge_sources` |
| โหมด index / query สด | index = ตัด chunk + embedding แล้วค้นแบบ hybrid; query สด = ถามจาก DB หรือ MCP ตอนตอบ | `knowledge_sources.mode` |
| Chunk | ชิ้นข้อความที่ตัดจากแหล่งเพื่อค้นหา มี locator (หน้า, แถว) | `knowledge_chunks` |
| Hybrid RAG | ค้นด้วย keyword (ตัดคำไทยแล้ว) ร่วมกับ vector แล้ว rerank | `lib/knowledge/search.ts` (CORE-02) |
| RAG preset | ค่าตั้งสำเร็จรูป: เอกสารยาว/กฎหมาย, FAQ, ตาราง | `RagSettings.preset` |
| Use case | สิ่งที่ Knowledge Set ใช้ตอบได้ พร้อมคำแนะนำการตอบ | `use_cases` (S04) |
| ตัวอย่าง / เฉลย | คำถามตัวอย่างพร้อมคำตอบที่ถูก แหล่งที่ควรใช้ หรือธงว่าต้องปฏิเสธ | `use_case_examples` |
| Dynamic few-shot | ค้นตัวอย่างที่คล้ายคำถามจริง 2–3 ข้อมาใส่ prompt เฉพาะรอบนั้น | `findSimilarExamples()` (CORE-02) |
| Prompt version | system prompt ของ agent แต่ละครั้งที่แก้ ย้อนกลับได้ | `agent_prompt_versions` (S05) |
| ชุดสอบ / Eval run | การรันตัวอย่างทั้งหมดให้ agent ตอบแล้ววัด % ความแม่นยำ | `eval_runs`, `eval_results` (S06) |
| Citation | การอ้างอิงแหล่งที่มาของคำตอบให้ตรวจย้อนได้ | type `Citation` (CORE-02, P03) |
| Activity log | ประวัติการกระทำของทุกบทบาท | `activity_logs`, `logActivity()` (A01, CORE-01) |
| IMC Trade Data MCP | MCP ของ IMC: `customs_trade_data`, `gta_trade_data`, `moc_news` (ใช้เป็น source โหมดสด) | `mcp_tools` |
| Page ID | รหัสงานตามหน้า: `P01–P03`, `S01–S06`, `A01`, `CORE-01–03` | ใช้ใน branch, Spec, Handoff, Commit |
