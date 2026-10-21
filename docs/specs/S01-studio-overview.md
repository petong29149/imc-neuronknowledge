# Spec: Studio Overview (S01)

- ผู้ใช้: Creator, Admin • Route: `/studio` • Branch: `page/studio-overview` → PR เข้า `staging`
- ขึ้นกับ: CORE-01 • ข้อมูลมาจากทุกหน้าใน Studio ทำทีหลังได้โดยใช้ข้อมูลจำลองไปก่อน

## 1. เป้าหมาย
creator เข้ามาแล้วรู้ทันทีว่าต้องทำอะไรต่อ: อะไรกำลังประมวลผล อะไรพัง agent ตัวไหนคะแนนตก และผู้ใช้ถามอะไรที่ agent ตอบไม่ได้

## 2. ขอบเขต
- ทำ:
  1. การ์ดตัวเลข: จำนวน data connection, Knowledge Set (แยกตามสถานะ), use case, ตัวอย่างคำถาม, agent (draft / published)
  2. งานที่กำลังประมวลผลและงานที่ error (จาก `ingestion_jobs`) พร้อมลิงก์ไป Knowledge Set นั้น
  3. คะแนนทดสอบล่าสุดของแต่ละ agent และแนวโน้มเทียบครั้งก่อน
  4. คำตอบที่ถูกกด "ไม่ถูกใจ" ล่าสุด (จาก P03) พร้อมปุ่ม "เพิ่มเป็นตัวอย่าง" ไปหน้า S04
  5. ปุ่มลัด: เชื่อมแหล่งข้อมูล, สร้าง Knowledge Set, สร้าง agent
  6. สถานะว่างสำหรับ creator ใหม่: ขั้นตอน 1-2-3 ให้เริ่มต้น
- ไม่ทำ: กราฟสถิติการใช้งานละเอียด (อยู่ที่ admin dashboard)

## 3. หน้าจอ
แสดงข้อมูลทั้งหมด (admin) หรือเฉพาะของตัวเองก่อน (creator) ตามคำถามเปิดข้อ 1

## 4. API
| Method | Path | สิทธิ์ | Response |
|---|---|---|---|
| GET | `/api/studio/overview` | creator, admin | `{ counts, activeJobs, failedJobs, agentScores, recentNegativeFeedback }` |

## 5. ข้อมูล
อ่านอย่างเดียว: `data_connections`, `knowledge_sets`, `use_cases`, `use_case_examples`, `agents`, `ingestion_jobs`, `eval_runs`, `message_feedback`

## 6. สิทธิ์และความปลอดภัย
`requireRole(['admin','creator'])` • feedback แสดงคำถามของผู้ใช้ — แสดงเฉพาะของ agent ที่ creator คนนั้นดูแล และไม่แสดงชื่อผู้ถาม

## 7. Acceptance criteria และกรณีทดสอบ
| # | เกณฑ์ | วิธีทดสอบ | ผลที่คาด |
|---|---|---|---|
| 1 | ตัวเลขตรงกับข้อมูลจริง | สร้าง Knowledge Set 2 ชุด | การ์ดแสดง 2 |
| 2 | งาน error มองเห็นได้ | ทำให้ job หนึ่ง error | ขึ้นในรายการพร้อมลิงก์ |
| 3 | creator ใหม่ไม่งง | บัญชีที่ยังไม่มีข้อมูล | เห็นขั้นตอนเริ่มต้น |
| 4 | user เรียก API ไม่ได้ | เรียกด้วย session user | 403 |

## 8. ไฟล์ที่เป็นเจ้าของ
`app/studio/page.tsx`, `components/studio/overview/**`, `app/api/studio/overview/**`

## 9. Activity log ที่ต้องเขียน
ไม่มี

## 10. คำถามที่ยังเปิด
1. creator เห็นงานของ creator คนอื่นด้วยหรือไม่ (ทำงานเป็นทีมเดียว หรือแยกเจ้าของ)
