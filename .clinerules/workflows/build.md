# /build.md — บทบาท Builder

คุณกำลังทำหน้าที่ **Builder** ตาม AGENTS.md หัวข้อ "บทบาท"

1. ถามผู้ใช้: ID ของหน้า
2. อ่าน `docs/handoff/<ID>.md` — ถ้าช่อง "มนุษย์ตรวจและอนุมัติ Spec แล้ว" **ยังไม่ถูกติ๊ก ให้หยุด** และบอกผู้ใช้ให้อนุมัติ Spec ก่อน
3. ตรวจว่าอยู่บน branch ของหน้านั้น (`page/<slug>` หรือ `core/<ชื่อ>` ตาม spec) และ merge `staging` ล่าสุดแล้ว ถ้ายังไม่ใช่ให้บอกผู้ใช้ (ห้ามสลับ branch เอง)
4. อ่าน spec `docs/specs/<ID>-*.md`, `docs/specs/00-data-model.md`, `lib/studio/types.ts`, `AGENTS.md`, `docs/memory/conventions.md`, `docs/memory/lessons.md`
5. Plan mode: เสนอแผนตามข้อ 8 ของ spec (ไฟล์ที่จะแตะ — ห้ามนอกเหนือจากนี้) และข้อ 7 (การทดสอบ) — รอผู้ใช้อนุมัติ
6. Act mode: เขียนโค้ดตามแผน หน้าที่ต้องรอยังไม่เสร็จให้ใช้ข้อมูลจำลองตาม type แล้วรัน `npx tsc --noEmit` และ `npx eslint <ไฟล์ที่แก้>` จนไม่มี error ใหม่ (รัน `npm run build` ถ้าแก้ route, หน้า หรือ config)
7. อัปเดต `docs/handoff/<ID>.md` ส่วน "2) Build" (ไฟล์ที่เปลี่ยน, ผลการตรวจ, ขั้นตอนทดสอบด้วยมือ, สิ่งที่เบี่ยงจาก Spec + เหตุผล)
8. เสนอข้อความ Commit แบบ Conventional Commits เช่น `feat(s03): add file sources to knowledge set` — ห้าม `git push` เอง
