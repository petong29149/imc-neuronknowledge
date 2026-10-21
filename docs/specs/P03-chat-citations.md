# Spec: Chat with Citations (P03)

- ผู้ใช้: User • Route: `/chat`, `/chat/[id]` (หน้าเดิม) • Branch: `page/chat-citations` → PR เข้า `staging`
- ขึ้นกับ: CORE-02 (tool `search_knowledge` ที่ส่ง citation) • หน้าเดิมทำงานได้แล้ว งานนี้คือต่อยอด

## 1. เป้าหมาย
คำตอบที่มาจาก Knowledge Set แสดงแหล่งอ้างอิงที่ตรวจย้อนได้ ผู้ใช้ให้คะแนนคำตอบได้ และคะแนนนั้นกลับไปช่วย creator ปรับ agent

## 2. ขอบเขต
- ทำ:
  1. รับ `?agent=<slug>&q=<คำถาม>` จาก P01/P02 เพื่อเลือก agent และเติมคำถามให้
  2. แสดง citation ใต้คำตอบ: เลขอ้างอิงในข้อความ [1] [2] และรายการแหล่ง (ชื่อเอกสาร, หน้า/แถว, ข้อความสั้น) กดดูข้อความเต็มของ chunk ได้
  3. ปุ่มถูกใจ / ไม่ถูกใจ พร้อมช่องเหตุผล (บันทึกใน `message_feedback`)
  4. เก็บ citation ลงใน `chat_history` ของข้อความนั้น เพื่อเปิดแชทเก่าแล้วยังเห็น
  5. แก้บั๊กที่กระทบความน่าเชื่อถือของเดโม: เปลี่ยนโมเดลกลางแชทแล้วไม่บันทึก (เดิม CHAT-15), markdown ลิงก์ไม่ทำงาน (CHAT-17), error ดิบของ provider หลุดถึงผู้ใช้ (CHAT-19)
- ไม่ทำ: แนบไฟล์ในแชท, แชร์แชท

## 3. หน้าจอ
- citation แบบพับได้ ไม่บังคับให้ทุกคำตอบมี (คำตอบจาก skill หรือ tool อื่นไม่มี citation)
- ถ้า agent ปฏิเสธเพราะนอกขอบเขต แสดงข้อความที่ creator ตั้งไว้ (จาก S05)

## 4. API
| Method | Path | สิทธิ์ | หมายเหตุ |
|---|---|---|---|
| POST | `/api/chat/completions` | login | เพิ่ม event `citations` ใน SSE (`Citation[]`) |
| POST | `/api/chat/feedback` | login (เจ้าของแชท) | `{ chatId, messageId, rating: 1 \| -1, comment? }` |

## 5. ข้อมูล
เขียน: `message_feedback`, เพิ่มฟิลด์ `citations` ใน element ของ `chats.chat_history` • อ่าน: ผลจาก CORE-02

## 6. สิทธิ์และความปลอดภัย
- feedback ได้เฉพาะแชทของตัวเอง (`user_id` ของ session) • snippet ใน citation มาจาก Knowledge Set ที่ agent มีสิทธิ์เท่านั้น

## 7. Acceptance criteria และกรณีทดสอบ
| # | เกณฑ์ | วิธีทดสอบ | ผลที่คาด |
|---|---|---|---|
| 1 | คำตอบจากเอกสารมี citation | ถามคำถามที่อยู่ในเอกสาร | เห็น [1] และรายการแหล่ง พร้อมเลขหน้า |
| 2 | เปิดแชทเก่ายังเห็น citation | refresh หน้า | citation อยู่ครบ |
| 3 | ให้คะแนนได้ครั้งเดียวต่อข้อความ | กดถูกใจ 2 ครั้ง | เก็บค่าล่าสุดค่าเดียว |
| 4 | มาจาก catalog พร้อมคำถาม | เปิด `/chat?agent=import-export&q=...` | เลือก agent และเติมคำถามแล้ว |

## 8. ไฟล์ที่เป็นเจ้าของ
`app/chat/**`, `components/chat/**`, `app/api/chat/**`, `lib/llm-core.ts`, `lib/chat-runs.ts`, `lib/chat-title.ts`

## 9. Activity log ที่ต้องเขียน
`chat.feedback` (ไม่ log เนื้อหาคำถาม)

## 10. คำถามที่ยังเปิด
- feedback ไม่ถูกใจ ส่งไปให้ creator ของ agent เห็นที่ S01 เลยหรือไม่
