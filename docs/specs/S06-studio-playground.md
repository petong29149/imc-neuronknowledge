# Spec: Playground and Evaluation (S06)

- ผู้ใช้: Creator, Admin • Route: `/studio/agents/[id]/test` • Branch: `page/studio-playground` → PR เข้า `staging`
- ขึ้นกับ: CORE-02 (search + citation), S04 (ตัวอย่าง), S05 (agent + prompt version)

## 1. เป้าหมาย
creator ทดสอบ agent ก่อนเผยแพร่: ลองถามแล้วเห็นว่าระบบค้นเจออะไร และรันชุดสอบจากตัวอย่างใน use case เพื่อได้ % ความแม่นยำที่เทียบกันได้ระหว่าง version

## 2. ขอบเขต
- ทำ:
  1. **แชททดสอบ:** ใช้ prompt version ที่เลือก (ไม่จำเป็นต้องเป็น version ที่ใช้งาน) • แต่ละคำตอบแสดง **trace**: chunk ที่ค้นได้พร้อมคะแนน, ตัวอย่างนำทางที่ถูกเลือก, tool ที่ถูกเรียก, token ที่ใช้ • แชททดสอบไม่ปนกับประวัติแชทของผู้ใช้
  2. **รันชุดสอบ:** ใช้ตัวอย่างทั้งหมดของ Knowledge Set ที่ agent ใช้ → ให้ agent ตอบ → ตัดสินผล: ถ้ามีเฉลยใช้ LLM เทียบความหมายกับเฉลย, ถ้าระบุแหล่งที่ควรใช้ ตรวจว่าค้นเจอแหล่งนั้น, ถ้าเป็นตัวอย่างที่ต้องปฏิเสธ ตรวจว่าปฏิเสธจริง
  3. **ผลทดสอบ:** คะแนนรวม, แยกตาม use case, รายการข้อที่ไม่ผ่านพร้อมเหตุผล และปุ่มไปแก้ตัวอย่าง (S04) หรือ prompt (S05)
  4. **เทียบ version:** กราฟคะแนนตามรอบการทดสอบและ prompt version
  5. ปุ่ม **เผยแพร่** (เรียก API ของ S05) เมื่อผ่านเกณฑ์
- ไม่ทำ: ตั้งค่า agent (S05)

## 3. หน้าจอ
- ชุดสอบทำงานเบื้องหลัง แสดง progress และยกเลิกได้ • แสดงค่าใช้จ่าย token โดยประมาณก่อนกดรัน

## 4. API
| Method | Path | สิทธิ์ | หมายเหตุ |
|---|---|---|---|
| POST | `/api/studio/agents/[id]/test/chat` | creator, admin | SSE เหมือนแชทจริง + event `trace` |
| POST | `/api/studio/agents/[id]/eval` | creator, admin | เริ่มรอบทดสอบ `{ promptVersion }` → `{ runId }` |
| GET | `/api/studio/agents/[id]/eval` | creator, admin | ประวัติรอบทดสอบ `EvalRun[]` |
| GET | `/api/studio/eval-runs/[runId]` | creator, admin | ผลรายข้อ `EvalResult[]` และ progress |
| POST | `/api/studio/eval-runs/[runId]/cancel` | creator, admin | |

## 5. ข้อมูล
เขียน: `eval_runs`, `eval_results`, `agents.latest_eval_score` • อ่าน: `use_case_examples`, `agent_prompt_versions` • type: `EvalRun`, `EvalResult`, `Citation`

## 6. สิทธิ์และความปลอดภัย
- จำกัดการรันชุดสอบพร้อมกันได้ 1 รอบต่อ agent • ค่าใช้จ่าย token นับเข้า usage ของ creator คนที่รัน

## 7. Acceptance criteria และกรณีทดสอบ
| # | เกณฑ์ | วิธีทดสอบ | ผลที่คาด |
|---|---|---|---|
| 1 | เห็น trace | ถามคำถามจากเอกสาร | เห็น chunk + คะแนน + tool ที่เรียก |
| 2 | ชุดสอบได้คะแนน | ตัวอย่าง 30 ข้อมีเฉลย | ได้คะแนนรวมและรายข้อ |
| 3 | ตรวจการปฏิเสธ | ตัวอย่างที่ต้องปฏิเสธ 3 ข้อ | ผ่านเมื่อ agent ปฏิเสธ |
| 4 | เทียบ version | รันกับ prompt v1 และ v2 | เห็นคะแนนทั้ง 2 รอบ |
| 5 | แชททดสอบไม่ปนแชทจริง | ดูประวัติแชทของ creator | ไม่มีแชททดสอบ |

## 8. ไฟล์ที่เป็นเจ้าของ
`app/studio/agents/[id]/test/**`, `components/studio/playground/**`, `app/api/studio/agents/[id]/test/**`, `app/api/studio/agents/[id]/eval/**`, `app/api/studio/eval-runs/**`, `lib/studio/eval.ts`

## 9. Activity log ที่ต้องเขียน
`eval.run`, `eval.cancel`

## 10. คำถามที่ยังเปิด
- ใช้โมเดลไหนเป็นผู้ตัดสินผล (ควรต่างจากโมเดลของ agent) • เกณฑ์ผ่านต่อข้อ
