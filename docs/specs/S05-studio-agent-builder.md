# Spec: Agent Builder (S05)

- ผู้ใช้: Creator, Admin • Route: `/studio/agents` (รายการ), `/studio/agents/[id]` (สร้าง/แก้ไข) • Branch: `page/studio-agent-builder` → PR เข้า `staging`
- ขึ้นกับ: CORE-01, S03, S04 • หน้าที่รอ: S06 (ทดสอบ), P01/P02 (แสดง agent ที่เผยแพร่)

## 1. เป้าหมาย
creator ประกอบ agent จาก Knowledge Set หลายชุดและ MCP tool ให้ AI ร่าง system prompt จาก use case แล้วคนตรวจแก้ได้ ทุกครั้งที่แก้ prompt เกิด version ใหม่ ย้อนกลับได้

## 2. ขอบเขต
- ทำ:
  1. **รายการ agent:** ชื่อ, สถานะ (ร่าง / เผยแพร่ / เก็บถาวร), Knowledge Set ที่ใช้, คะแนนทดสอบล่าสุด, อัปเดตล่าสุด
  2. **ข้อมูลทั่วไป:** ชื่อ, slug, ไอคอน, คำอธิบายสำหรับผู้ใช้ (แสดงใน P01/P02), โมเดลเริ่มต้น, กลุ่มผู้ใช้ที่เข้าถึงได้
  3. **ความรู้และเครื่องมือ:** เลือกหลาย Knowledge Set (แสดงจำนวน use case และสถานะ) และ MCP tool เพิ่มเติม (เช่น MCP ข้อมูลการค้าของ IMC)
  4. **ขอบเขตและข้อจำกัด:** เรื่องที่ห้ามตอบ, ข้อความ disclaimer, ข้อความเมื่อคำถามนอกขอบเขต, รูปแบบคำตอบ
  5. **System prompt:** ปุ่ม **"ให้ AI ร่าง prompt"** ใช้คำอธิบาย + ขอบเขต + สรุป use case (ไม่ใส่ตัวอย่างทั้งหมด) → แสดงใน editor ให้แก้ → บันทึกเป็น version ใหม่พร้อมหมายเหตุ • ดูประวัติ version และเทียบ 2 version • ตั้ง version ที่ใช้งาน
  6. **กติกาของ tool:** ถ้าเลือก MCP ข้อมูลการค้า ให้เติมกติกาลง prompt อัตโนมัติ: `moc_news` ต้องถามเป็นภาษาอังกฤษ และห้ามเดาพิกัด HS (ดู D-008)
  7. **เผยแพร่:** ปุ่มเผยแพร่ต้องมีผลทดสอบจาก S06 อย่างน้อย 1 ครั้งที่ผ่านเกณฑ์ (ค่าเริ่มต้น 70%) • ยกเลิกเผยแพร่ได้
  8. ใช้ตาราง `agents` เดิม (agent ที่สร้างจาก admin เดิมยังทำงานได้)
- ไม่ทำ: หน้าแชททดสอบ (S06), ช่องทาง API/LINE (CORE-03)

## 3. หน้าจอ
- prompt editor แสดงจำนวน token โดยประมาณ และเตือนเมื่อยาวเกินที่แนะนำ
- แก้ prompt ของ agent ที่เผยแพร่แล้ว → สร้าง version ใหม่ แต่ยังไม่ใช้งานจนกว่าจะกดตั้งเป็น version ที่ใช้งาน

## 4. API
| Method | Path | สิทธิ์ | หมายเหตุ |
|---|---|---|---|
| GET / POST | `/api/studio/agents` | creator, admin | รายการ / สร้าง (draft) |
| GET / PUT / DELETE | `/api/studio/agents/[id]` | creator, admin | DELETE = เก็บถาวร |
| POST | `/api/studio/agents/[id]/draft-prompt` | creator, admin | AI ร่าง prompt คืนข้อความ ยังไม่บันทึก |
| GET / POST | `/api/studio/agents/[id]/prompt-versions` | creator, admin | ประวัติ / บันทึก version ใหม่ |
| PUT | `/api/studio/agents/[id]/active-version` | creator, admin | `{ version }` |
| POST | `/api/studio/agents/[id]/publish` | creator, admin | 409 ถ้ายังไม่มีผลทดสอบที่ผ่าน |
| POST | `/api/studio/agents/[id]/unpublish` | creator, admin | |

## 5. ข้อมูล
เขียน: `agents` (คอลัมน์ใหม่ `status`, `active_prompt_version`, `published_at`), `agent_knowledge_sets`, `agent_prompt_versions`, `agent_tools`, `agent_groups` • อ่าน: `knowledge_sets`, `use_cases`, `mcp_tools`, `eval_runs` • type: `StudioAgent`, `AgentPromptVersion`

## 6. สิทธิ์และความปลอดภัย
- runtime ของแชท (`lib/turn-context.ts`, `lib/system-prompt.ts` ของ AGENT เดิม) ต้องอ่าน prompt จาก `active_prompt_version` — ประสานกับเจ้าของไฟล์ผ่าน CORE-01
- agent ที่เป็น draft ใช้ได้เฉพาะใน S06

## 7. Acceptance criteria และกรณีทดสอบ
| # | เกณฑ์ | วิธีทดสอบ | ผลที่คาด |
|---|---|---|---|
| 1 | agent ใช้หลาย Knowledge Set | เลือก 2 ชุด + MCP tool 1 ตัว | บันทึกครบ |
| 2 | AI ร่าง prompt จาก use case | กดร่าง | prompt มีขอบเขตจาก use case และกติกา tool |
| 3 | version ย้อนกลับได้ | บันทึก 2 version แล้วตั้งกลับเป็น v1 | แชทใช้ prompt v1 |
| 4 | เผยแพร่ต้องมีผลทดสอบ | กดเผยแพร่โดยยังไม่ทดสอบ | 409 พร้อมข้อความ |
| 5 | agent เดิมไม่พัง | เปิดแชทกับ agent ที่สร้างจาก admin เดิม | ทำงานปกติ |

## 8. ไฟล์ที่เป็นเจ้าของ
`app/studio/agents/page.tsx`, `app/studio/agents/[id]/page.tsx`, `components/studio/agents/**`, `app/api/studio/agents/**` (ยกเว้น `test` และ `eval`), `lib/studio/agents.ts`, `lib/studio/prompt-builder.ts`

## 9. Activity log ที่ต้องเขียน
`agent.create`, `agent.update`, `agent.archive`, `agent.publish`, `agent.unpublish`, `prompt.version_create`, `prompt.version_activate`

## 10. คำถามที่ยังเปิด
- เกณฑ์คะแนนขั้นต่ำก่อนเผยแพร่ใช้ 70% หรือค่าอื่น • หน้า `/admin/agents` เดิมจะเลิกใช้หรือคงไว้สำหรับ agent ทั่วไป
