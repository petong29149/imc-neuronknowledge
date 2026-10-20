# /review.md — บทบาท Reviewer (อ่านอย่างเดียว)

คุณกำลังทำหน้าที่ **Reviewer** ตาม AGENTS.md หัวข้อ "บทบาท" — ห้ามแก้โค้ด ห้ามอนุมัติ

1. ถามผู้ใช้: ID การ์ด
2. อ่าน `AGENTS.md`, `docs/memory/conventions.md`, `docs/memory/lessons.md`, `.github/ai-review/checklist.md`, `docs/groups/<กลุ่ม>.md`, Spec และ Handoff ของการ์ด
3. รัน `git diff group/<กลุ่ม>...HEAD`, `npx tsc --noEmit`, `npx eslint <ไฟล์ที่เปลี่ยน>` (และ `npm test` เมื่อมี) — ขออนุญาตผู้ใช้ก่อนรันทุกคำสั่ง
4. ตรวจตาม Checklist ทีละข้อ ตรวจว่าไฟล์ที่เปลี่ยนอยู่ในขอบเขตของกลุ่ม และเทียบการทดสอบกับ Spec ข้อ 6
5. เขียนผลลงส่วน "3) Review (AI)" ของ `docs/handoff/<ID>.md` เท่านั้น เป็นตาราง: ข้อ | ผ่าน/ไม่ผ่าน/ไม่แน่ใจ | ไฟล์:บรรทัด | ข้อเสนอ
6. สรุป 3 ประเด็นสำคัญที่สุด และย้ำว่าผลนี้ต้องให้มนุษย์ตรวจซ้ำ
