# Spec: <ชื่อหน้า> (<ID>)

- ผู้ใช้: <User | Creator | Admin | ทุกบทบาท (งานกลาง)> • Route: `<route>` • Branch: `page/<slug>` → PR เข้า `staging`
- ขึ้นกับ: <ID ของงานที่ต้องเสร็จก่อน> • หน้าที่รอ: <ID ที่รองานนี้>
- การ์ด Miro: <ลิงก์การ์ดใน Page Tracker> • เจ้าของ: @<github-username>

## 1. เป้าหมาย
<1–3 บรรทัด: ทำอะไร ให้ใคร เพื่ออะไร>

## 2. ขอบเขต
- ทำ: …
- ไม่ทำ (นอกขอบเขต): …

## 3. หน้าจอ
- ส่วนต่างๆ ของหน้า และ 4 สถานะ: กำลังโหลด, ว่าง, error, มีข้อมูล

## 4. API
| Method | Path | สิทธิ์ (`getSession` / `requireRole` / `requireAdmin`) | Request / Response |
|---|---|---|---|

## 5. ข้อมูล
- ตาราง/คอลัมน์ที่อ่านหรือเขียน (อ้างอิง `docs/specs/00-data-model.md`) และ type จาก `lib/studio/types.ts`
- ต้องการตาราง/คอลัมน์ใหม่: เขียน SQL ที่เสนอไว้ที่นี่ ให้ CORE-01 สร้าง migration

## 6. สิทธิ์และความปลอดภัย
- …

## 7. Acceptance criteria และกรณีทดสอบ
| # | เกณฑ์ | วิธีทดสอบ (มือบน staging หรือ automated) | ผลที่คาด |
|---|---|---|---|

## 8. ไฟล์ที่เป็นเจ้าของ (ตรงกับ `.github/CODEOWNERS`)
- …

## 9. Activity log ที่ต้องเขียน
- ชื่อ action จากตารางใน `docs/specs/A01-admin-activity.md`

## 10. คำถามที่ยังเปิด (ต้องให้คนตอบก่อน Build)
- …
