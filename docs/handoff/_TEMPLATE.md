# Handoff: <ID การ์ด> — <ชื่องาน>

- การ์ด Miro: <ลิงก์> • Branch: `feat/<กลุ่ม>/<ID>-<slug>`

## 1) Design
- ผู้ทำ: <Designer agent + Model>
- Spec: `docs/specs/<ID>-<slug>.md`
- สรุปแนวทาง (3 บรรทัด): …
- [ ] **มนุษย์ตรวจและอนุมัติ Spec แล้ว** — โดย @<username> วันที่ <YYYY-MM-DD>

## 2) Build
- ผู้ทำ: <Builder agent + Model> • ควบคุมโดย @<username>
- ไฟล์ที่เปลี่ยน: …
- คำสั่งตรวจที่รันและผล: `npx tsc --noEmit` → ผ่าน/ไม่ผ่าน • `npx eslint <ไฟล์>` → ผ่าน/ไม่ผ่าน • `npm run build` → ผ่าน/ไม่ผ่าน/ไม่ได้รัน
- ขั้นตอนทดสอบด้วยมือ (ทำซ้ำได้): …
- สิ่งที่เบี่ยงจาก Spec + เหตุผล: ไม่มี / …

## 3) Review (AI)
- ผู้ทำ: <Reviewer agent + Model>
- ผลตาม Checklist: (ตาราง ข้อ / ผ่าน-ไม่ผ่าน-ไม่แน่ใจ / ไฟล์:บรรทัด / ข้อเสนอ)
- ต้องแก้ก่อน Merge: …

## 4) Human decision
- Reviewer (มนุษย์): @<username> • ผล: Approve / Request changes • วันที่: …
- ข้อที่ AI Review พลาดหรือแจ้งเกินจริง (ใช้ปรับ lessons.md): …
- [ ] ย้ายการ์ดใน Miro เป็น Done แล้ว

## เสนอการ์ดใหม่ (ถ้ามี — งานที่ต้องแก้ไฟล์ของกลุ่มอื่นหรือไฟล์ส่วนกลาง)
- กลุ่ม: … • ชื่อการ์ด: … • เหตุผล: …

## เสนอเพิ่มใน memory (ถ้ามี)
- ไฟล์: <decisions | conventions | lessons | glossary> • ข้อความที่เสนอ: …
