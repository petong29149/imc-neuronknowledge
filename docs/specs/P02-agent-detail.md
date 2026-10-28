# Spec: Agent Detail (P02)

- ผู้ใช้: User • Route: `/agents/[slug]` • Branch: `page/agent-detail` → PR เข้า `staging`
- ขึ้นกับ: CORE-01, S05 (ข้อมูล agent), CORE-03 (ช่องทาง API/MCP/LINE — ถ้ายังไม่เสร็จให้แสดง "เร็วๆ นี้")

## 1. เป้าหมาย
ผู้ใช้เข้าใจ agent ตัวหนึ่งครบในหน้าเดียว: รู้อะไร ใช้ทำอะไรได้ ถามแบบไหน และเรียกใช้จากระบบของตัวเองอย่างไร

## 2. ขอบเขต
- ทำ: ส่วนหัว (ชื่อ, คำอธิบาย, โดเมน, ปุ่มเริ่มแชท) • แท็บ/ส่วน **Knowledge** (Knowledge Set ที่ใช้: ชื่อ, คำอธิบาย, ประเภทแหล่งข้อมูล, วันที่อัปเดตล่าสุด) • **Use case** พร้อมตัวอย่างคำถาม (กดแล้วเริ่มแชทด้วยคำถามนั้น) • **ช่องทางเรียกใช้** พร้อมโค้ดให้คัดลอก: curl ของ OpenAI-compatible API, JSON ตั้งค่า MCP, วิธีต่อ LINE • **ข้อจำกัด** (เรื่องที่ agent ไม่ตอบ, disclaimer) • ส่วนจัดการ API key ของตัวเอง (เมื่อ CORE-03 พร้อม)
- ไม่ทำ: แก้ไข agent (S05), แสดงเอกสารต้นฉบับทั้งหมด

## 3. หน้าจอ
- slug ไม่พบหรือไม่มีสิทธิ์ → หน้า 404 ของ Next (`notFound()`)
- โค้ดตัวอย่างแทน slug ของ agent จริงและ base URL ของ environment ปัจจุบันอัตโนมัติ ไม่ใส่ key จริงในตัวอย่าง (ใช้ `YOUR_API_KEY`)

## 4. API
| Method | Path | สิทธิ์ | Response |
|---|---|---|---|
| GET | `/api/agents/[slug]` | login + มีสิทธิ์ใช้ agent | `AgentDetail` |

`AgentDetail = { slug, name, description, icon, domains, knowledgeSets: { name, description, sourceKinds, updatedAt }[], useCases: { title, description, sampleQuestions: string[] }[], limitations: string[], channels: { web: true, api: boolean, mcp: boolean, line: boolean } }`

## 5. ข้อมูล
อ่าน: `agents`, `agent_knowledge_sets`, `knowledge_sets`, `knowledge_sources.kind`, `use_cases`, `use_case_examples` (เฉพาะที่ `should_refuse = false`)

## 6. สิทธิ์และความปลอดภัย
- ไม่แสดง: system prompt, เฉลย (`expected_answer`), ชื่อตาราง/connection ของ DB, ตัวอย่างที่ต้องปฏิเสธ
- ตรวจสิทธิ์ซ้ำฝั่ง server ทุกครั้ง ไม่เชื่อว่าผู้ใช้มาจากหน้า catalog

## 7. Acceptance criteria และกรณีทดสอบ
| # | เกณฑ์ | วิธีทดสอบ | ผลที่คาด |
|---|---|---|---|
| 1 | เปิด agent ที่ไม่มีสิทธิ์ | พิมพ์ URL ตรง | 404 |
| 2 | กดตัวอย่างคำถาม | กดคำถามใน use case | ไปหน้าแชทพร้อมคำถามในช่องพิมพ์ |
| 3 | โค้ดตัวอย่างถูกต้อง | คัดลอก curl ไปรันบน staging พร้อม key จริง | ได้คำตอบ (เมื่อ CORE-03 เสร็จ) |
| 4 | ไม่มีข้อมูลลับหลุด | ดู response ของ API | ไม่มี prompt, เฉลย, ชื่อตาราง |

## 8. ไฟล์ที่เป็นเจ้าของ
`app/agents/[slug]/**`, `components/agents/detail/**`, `app/api/agents/[slug]/**`

## 9. Activity log ที่ต้องเขียน
ไม่มี (การสร้าง key เขียนโดย CORE-03)

## 10. คำถามที่ยังเปิด
- แสดงคะแนนความแม่นยำล่าสุด (จาก S06) ให้ผู้ใช้เห็นหรือไม่
