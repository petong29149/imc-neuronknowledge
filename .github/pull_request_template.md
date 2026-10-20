## การ์ด
- ID: <!-- เช่น CHAT-20 -->
- ลิงก์การ์ดใน Miro: <!-- Feature Tracker → การ์ดนี้ -->
- PR เข้า: `group/<กลุ่ม>` <!-- PR ปลาย sprint เท่านั้นที่เปิดเข้า main -->

## เปลี่ยนอะไร
<!-- 2–4 บรรทัด -->

## Spec และ Handoff
- [ ] `docs/specs/<ID>-<slug>.md` (คนอนุมัติแล้ว)
- [ ] `docs/handoff/<ID>.md` ส่วน 1–3 ครบ

## ตรวจแล้ว
- [ ] `npx tsc --noEmit` ไม่มี error ในไฟล์ที่แก้
- [ ] `npx eslint <ไฟล์ที่แก้>` ไม่มี error ใหม่
- [ ] `npm run build` ผ่าน (ถ้าแก้ route, หน้า หรือ config)
- [ ] แก้เฉพาะไฟล์ในขอบเขตของกลุ่ม (`docs/groups/<กลุ่ม>.md`)
- [ ] ไม่มี secret, token หรือข้อมูลส่วนบุคคลในโค้ดและ log

## วิธีทดสอบด้วยมือ
1.
