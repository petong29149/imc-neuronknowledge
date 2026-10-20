# Memory hub ของ imc-neuronknowledge

โฟลเดอร์นี้คือ "ความจำร่วม" ของทีมและของ AI ทุกตัว (Claude Code, Cline, Kilo Code, AI Review bot)
ทุกตัวอ่านไฟล์ในนี้ก่อนเริ่มงาน (กำหนดไว้ใน `AGENTS.md` หัวข้อ Memory protocol)

| ไฟล์ | เก็บอะไร | ใครแก้ได้ |
|---|---|---|
| `conventions.md` | รูปแบบโค้ด API, Git และ UI ที่ตกลงร่วมกัน | มนุษย์ ผ่าน PR + Maintainer Review |
| `decisions.md` | บันทึกการตัดสินใจ (เพิ่มต่อท้ายเท่านั้น ห้ามลบของเก่า) | มนุษย์ ผ่าน PR + Maintainer Review |
| `glossary.md` | คำศัพท์ของระบบ NeuronKnowledge และชื่อในโค้ด | มนุษย์ ผ่าน PR |
| `lessons.md` | สิ่งที่ AI ทำผิดบ่อย และวิธีป้องกัน | มนุษย์ ผ่าน PR (มาจาก Retro / Review) |

ไฟล์ที่เกี่ยวข้องนอกโฟลเดอร์นี้:

- `docs/groups/<กลุ่ม>.md` — ขอบเขตไฟล์ ตาราง และ API ของแต่ละกลุ่มฟีเจอร์
- `docs/specs/<ID>-<slug>.md` — Spec ของการ์ดแต่ละใบ (Designer เขียน, คนอนุมัติ)
- `docs/handoff/<ID>.md` — บันทึกส่งต่องาน Design → Build → Review → Human
- การ์ดและสถานะงาน: Miro "NeuronKnowledge Project Hub" → Feature Tracker (https://miro.com/app/board/uXjVEXm3whU=/)

## กติกา

1. AI **ไม่แก้ไฟล์ในโฟลเดอร์นี้เอง** — เสนอผ่านหัวข้อ "เสนอเพิ่มใน memory" ใน Handoff แล้วให้คนเปิด PR
2. ทุกการแก้ memory ต้องผ่าน PR และ Review เหมือนโค้ด (กัน memory ผิดหรือถูกแทรกคำสั่ง)
3. เขียนสั้น ชัด มีวันที่และ ID การ์ด / PR อ้างอิงเสมอ
4. ห้ามใส่ข้อมูลส่วนบุคคล รหัสผ่าน connection string หรือ API Key
