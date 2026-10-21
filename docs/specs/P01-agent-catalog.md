# Spec: Agent Catalog (P01)

- ผู้ใช้: User (และ creator/admin ที่เข้ามาดู) • Route: `/agents` • Branch: `page/agent-catalog` → PR เข้า `staging`
- ขึ้นกับ: CORE-01 • หน้าที่ต่อจากนี้: P02 (กดการ์ดแล้วไปหน้า detail)

## 1. เป้าหมาย
หลัง login ผู้ใช้เห็น agent ทั้งหมดที่ตัวเองใช้ได้ในหน้าเดียว รู้ว่าแต่ละตัวเก่งเรื่องอะไร แล้วเลือกเข้าไปดูรายละเอียดหรือเริ่มแชทได้ทันที

## 2. ขอบเขต
- ทำ: header ของพื้นที่ผู้ใช้ (โลโก้, ไปหน้าแชท, ธีม, ผู้ใช้, ออกจากระบบ) ใน `app/agents/layout.tsx` • รายการการ์ด agent • ค้นหาด้วยชื่อ/คำอธิบาย • กรองตามโดเมน • ปุ่ม "เริ่มแชท" และ "ดูรายละเอียด" • เปลี่ยน redirect หลัง login ของ user ใน `middleware.ts` จาก `/chat` เป็น `/agents` (ประสานกับ CORE-01)
- ไม่ทำ: หน้ารายละเอียด (P02), การซื้อหรือขอสิทธิ์ใช้ agent

## 3. หน้าจอ
- การ์ดแต่ละใบ: ไอคอน, ชื่อ, คำอธิบายสั้น, ป้ายโดเมน, จำนวน Knowledge Set, ตัวอย่างคำถาม 1 ข้อ, ช่องทางที่ใช้ได้ (ไอคอนเว็บ / API / MCP / LINE)
- สถานะ: กำลังโหลด (skeleton), ไม่มี agent ("ยังไม่มี agent ที่คุณใช้ได้ ติดต่อผู้ดูแลระบบ"), error
- รองรับมือถือ (การ์ด 1 คอลัมน์) และ dark mode

## 4. API
| Method | Path | สิทธิ์ | Response |
|---|---|---|---|
| GET | `/api/agents?q=&domain=` | login | `{ agents: AgentCatalogItem[] }` |

`AgentCatalogItem = { slug, name, description, icon, domains: string[], knowledgeSetCount, sampleQuestion, channels: ('web'\|'api'\|'mcp'\|'line')[] }`
- คืนเฉพาะ agent ที่ `status = 'published'` และ `is_active` และผู้ใช้มีสิทธิ์ตามกลุ่ม (ใช้เงื่อนไขเดิมใน `lib/agents.ts`)

## 5. ข้อมูล
อ่าน: `agents`, `agent_groups`, `group_members`, `agent_knowledge_sets`, `knowledge_sets.domain`, `use_case_examples` (คำถามตัวอย่าง 1 ข้อ)

## 6. สิทธิ์และความปลอดภัย
- `getSession()` ต้องมี session • ห้ามส่ง system prompt หรือข้อมูลภายในของ agent ไปฝั่ง client

## 7. Acceptance criteria และกรณีทดสอบ
| # | เกณฑ์ | วิธีทดสอบ | ผลที่คาด |
|---|---|---|---|
| 1 | เห็นเฉพาะ agent ที่มีสิทธิ์ | ผู้ใช้ที่ไม่อยู่ในกลุ่มของ agent X | ไม่เห็น X |
| 2 | ไม่เห็น agent ที่ยังเป็น draft | ตั้ง agent เป็น draft | หายจากรายการ |
| 3 | ค้นหาภาษาไทยได้ | พิมพ์ "นำเข้า" | เห็น Import-Export Agent |
| 4 | เริ่มแชทได้ | กด "เริ่มแชท" | ไป `/chat` พร้อมเลือก agent นั้นแล้ว |
| 5 | login เป็น user แล้วมาที่หน้านี้ | login | อยู่ที่ `/agents` |

## 8. ไฟล์ที่เป็นเจ้าของ
`app/agents/page.tsx`, `app/agents/layout.tsx`, `components/agents/catalog/**`, `components/agents/AgentCard.tsx`, `app/api/agents/route.ts`, `lib/agents-catalog.ts`

## 9. Activity log ที่ต้องเขียน
ไม่มี (หน้าอ่านอย่างเดียว)

## 10. คำถามที่ยังเปิด
- รายชื่อโดเมนมาจาก `knowledge_sets.domain` หรือเป็นรายการที่ admin กำหนด
