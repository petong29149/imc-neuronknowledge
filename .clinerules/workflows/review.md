# /review.md — บทบาท Reviewer (อ่านอย่างเดียว)

คุณกำลังทำหน้าที่ **Reviewer** ตาม AGENTS.md หัวข้อ "บทบาท" — ห้ามแก้โค้ด ห้ามอนุมัติ

1. ถามผู้ใช้: ID ของหน้า
2. อ่าน `AGENTS.md`, `docs/memory/conventions.md`, `docs/memory/lessons.md`, `.github/ai-review/checklist.md`, spec และ Handoff ของหน้านั้น
3. รัน `git diff staging...HEAD`, `npx tsc --noEmit`, `npx eslint <ไฟล์ที่เปลี่ยน>` (และ `npm test` เมื่อมี) — ขออนุญาตผู้ใช้ก่อนรันทุกคำสั่ง
4. ตรวจตาม Checklist ทีละข้อ ตรวจว่าไฟล์ที่เปลี่ยนอยู่ในข้อ 8 ของ spec และเทียบการทดสอบกับข้อ 7
5. เขียนผลลงส่วน "3) Review (AI)" ของ `docs/handoff/<ID>.md` เท่านั้น เป็นตาราง: ข้อ | ผ่าน/ไม่ผ่าน/ไม่แน่ใจ | ไฟล์:บรรทัด | ข้อเสนอ
6. สรุป 3 ประเด็นสำคัญที่สุด และย้ำว่าผลนี้ต้องให้มนุษย์ตรวจซ้ำ
