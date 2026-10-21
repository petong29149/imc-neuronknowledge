# Spec: Use Cases (S04)

- ผู้ใช้: Creator, Admin • Route: `/studio/knowledge/[id]/use-cases` • Branch: `page/studio-use-cases` → PR เข้า `staging`
- ขึ้นกับ: CORE-01, S03 (มี Knowledge Set ก่อน) • หน้าที่รอ: S05 (ร่าง prompt), S06 (ชุดสอบ), CORE-02 (dynamic few-shot)

## 1. เป้าหมาย
creator บอกระบบว่า Knowledge Set ชุดนี้ใช้ตอบเรื่องอะไร อย่างไร และให้ตัวอย่างคำถามพร้อมเฉลย ซึ่งใช้ 3 ทาง: สรุปขอบเขตใน system prompt, ตัวอย่างนำทางที่ระบบค้นมาใส่เฉพาะข้อที่คล้ายคำถาม และชุดสอบวัดความแม่นยำ (ดู D-012)

## 2. ขอบเขต
- ทำ:
  1. รายการ use case ของ Knowledge Set: ชื่อ, คำอธิบาย, จำนวนตัวอย่าง, จำนวนตัวอย่างที่มีเฉลย
  2. เพิ่ม/แก้/ลบ use case: ชื่อ, คำอธิบาย ("ใช้ตอบเรื่องอะไร อย่างไร"), **คำแนะนำการตอบ** (เช่น "ตอบเป็นขั้นตอน ระบุเอกสารที่ต้องใช้")
  3. ตัวอย่างใน use case: คำถาม, **คำตอบที่ถูก** (เฉลย), **แหล่งที่ควรใช้ตอบ** (เลือกจาก source ของชุด), สวิตช์ **"ต้องปฏิเสธ"** สำหรับคำถามนอกขอบเขต
  4. เพิ่มตัวอย่างทีละหลายข้อ: วางข้อความหลายบรรทัด หรือนำเข้า CSV (question, expected_answer)
  5. **ให้ AI ช่วยร่าง:** ปุ่มสร้างคำถามตัวอย่างจากเอกสารใน Knowledge Set (creator ต้องตรวจและกดยืนยันก่อนบันทึก)
  6. ตัวชี้วัดความครบ: % ตัวอย่างที่มีเฉลย, มีตัวอย่างที่ต้องปฏิเสธหรือยัง, เตือนถ้า use case มีตัวอย่างน้อยกว่า 5 ข้อ
- ไม่ทำ: สร้าง prompt ของ agent (S05), รันชุดสอบ (S06)

## 3. หน้าจอ
- คำแนะนำในหน้า: "ใส่ตัวเลขที่เปลี่ยนบ่อย (อัตราภาษี, มูลค่า) ในเฉลยแบบระบุช่วงเวลา หรือใช้รูปแบบแทน เพื่อไม่ให้ agent ลอกตัวเลขเก่า"
- สถานะว่าง: อธิบายว่า use case และตัวอย่างใช้ทำอะไร

## 4. API
| Method | Path | สิทธิ์ | หมายเหตุ |
|---|---|---|---|
| GET / POST | `/api/studio/knowledge-sets/[id]/use-cases` | creator, admin | รายการ / สร้าง |
| PUT / DELETE | `/api/studio/use-cases/[useCaseId]` | creator, admin | |
| GET / POST | `/api/studio/use-cases/[useCaseId]/examples` | creator, admin | POST รับ array ได้ (สูงสุด 200 ข้อต่อครั้ง) |
| PUT / DELETE | `/api/studio/examples/[exampleId]` | creator, admin | |
| POST | `/api/studio/use-cases/[useCaseId]/suggest-examples` | creator, admin | AI ร่างคำถามจากเอกสาร คืนรายการให้ยืนยัน ยังไม่บันทึก |

## 5. ข้อมูล
เขียน: `use_cases`, `use_case_examples` (เมื่อบันทึก สั่ง CORE-02 ทำ embedding ของคำถาม) • type: `UseCase`, `UseCaseExample`

## 6. สิทธิ์และความปลอดภัย
- เฉลยและตัวอย่างที่ต้องปฏิเสธเป็นข้อมูลภายใน ห้ามส่งไปหน้า P02 หรือ API ฝั่งผู้ใช้

## 7. Acceptance criteria และกรณีทดสอบ
| # | เกณฑ์ | วิธีทดสอบ | ผลที่คาด |
|---|---|---|---|
| 1 | Knowledge Set หนึ่งมีหลาย use case | เพิ่ม 3 use case | แสดงครบ พร้อมจำนวนตัวอย่าง |
| 2 | ตัวอย่างมีเฉลยและแหล่ง | บันทึกตัวอย่างพร้อมเลือก source | เปิดดูอีกครั้งข้อมูลครบ |
| 3 | นำเข้า CSV | ไฟล์ 30 แถว | ได้ 30 ตัวอย่าง |
| 4 | AI ช่วยร่างไม่บันทึกเอง | กดร่างแล้วไม่ยืนยัน | ไม่มีตัวอย่างเพิ่มใน DB |
| 5 | เตือนเมื่อตัวอย่างน้อย | use case มี 2 ตัวอย่าง | เห็นคำเตือน |

## 8. ไฟล์ที่เป็นเจ้าของ
`app/studio/knowledge/[id]/use-cases/**`, `components/studio/use-cases/**`, `app/api/studio/knowledge-sets/[id]/use-cases/**`, `app/api/studio/use-cases/**`, `app/api/studio/examples/**`, `lib/studio/use-cases.ts`

## 9. Activity log ที่ต้องเขียน
`use_case.create`, `use_case.update`, `use_case.delete`, `example.import` (นับจำนวน ไม่ต้อง log ทีละข้อ)

## 10. คำถามที่ยังเปิด
- ใครเป็นคนเขียนเฉลยของชุดนำเข้าส่งออกสำหรับ Expo และต้องการกี่ข้อ (แนะนำอย่างน้อย 30)
