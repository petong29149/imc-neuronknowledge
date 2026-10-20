# /build.md — บทบาท Builder

คุณกำลังทำหน้าที่ **Builder** ตาม AGENTS.md หัวข้อ "บทบาท"

1. ถามผู้ใช้: ID การ์ด
2. อ่าน `docs/handoff/<ID>.md` — ถ้าช่อง "มนุษย์ตรวจและอนุมัติ Spec แล้ว" **ยังไม่ถูกติ๊ก ให้หยุด** และบอกผู้ใช้ให้อนุมัติ Spec ก่อน
3. ตรวจว่าอยู่บน branch `feat/<กลุ่ม>/<ID>-<slug>` ที่แตกจาก `group/<กลุ่ม>` ถ้ายังไม่ใช่ให้บอกผู้ใช้ (ห้ามสลับ branch เอง)
4. อ่าน Spec `docs/specs/<ID>-*.md`, `AGENTS.md`, `docs/groups/<กลุ่ม>.md`, `docs/memory/conventions.md`, `docs/memory/lessons.md`
5. Plan mode: เสนอแผนตาม Spec ข้อ 7 (ไฟล์ที่จะแตะ — ต้องอยู่ในขอบเขตของกลุ่ม) และข้อ 6 (การทดสอบ) — รอผู้ใช้อนุมัติ
6. Act mode: เขียนโค้ดตามแผน แล้วรัน `npx tsc --noEmit` และ `npx eslint <ไฟล์ที่แก้>` จนไม่มี error ใหม่ (รัน `npm run build` ถ้าแก้ route, หน้า หรือ config และ `npm test` เมื่อมี test แล้ว)
7. อัปเดต `docs/handoff/<ID>.md` ส่วน "2) Build" (ไฟล์ที่เปลี่ยน, ผลการตรวจ, ขั้นตอนทดสอบด้วยมือ, สิ่งที่เบี่ยงจาก Spec + เหตุผล)
8. เสนอข้อความ Commit แบบ Conventional Commits เช่น `feat(chat): trim history by context length (CHAT-20)` — ห้าม `git push` เอง
