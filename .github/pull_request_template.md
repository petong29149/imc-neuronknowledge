## หน้า / งาน
- ID: <!-- เช่น S03 หรือ CORE-01 -->
- Spec: `docs/specs/<ID>-<slug>.md`
- การ์ดใน Miro (Page Tracker): <!-- ลิงก์ -->
- PR เข้า: `staging` <!-- เฉพาะ release ของ Maintainer เท่านั้นที่เปิด staging → main -->

## เปลี่ยนอะไร
<!-- 2–4 บรรทัด -->

## Spec และ Handoff
- [ ] Spec ได้รับอนุมัติแล้ว (ติ๊กใน `docs/handoff/<ID>.md` ส่วนที่ 1)
- [ ] `docs/handoff/<ID>.md` ส่วน 1–3 ครบ

## ตรวจแล้ว
- [ ] merge `staging` ล่าสุดเข้า branch นี้แล้ว ไม่มี conflict
- [ ] `npx tsc --noEmit` ไม่มี error ในไฟล์ที่แก้
- [ ] `npx eslint <ไฟล์ที่แก้>` ไม่มี error ใหม่
- [ ] `npm run build` ผ่าน (ถ้าแก้ route, หน้า หรือ config)
- [ ] แก้เฉพาะไฟล์ในข้อ 8 ของ spec ไม่แก้ `lib/studio/types.ts` หรือของกลางเอง
- [ ] ไม่มี secret, token หรือข้อมูลส่วนบุคคลในโค้ดและ log
- [ ] ต้องการ migration ใหม่ → แจ้ง CORE-01 แล้ว (ไม่สร้างไฟล์ migration เอง)

## วิธีทดสอบบน staging
1.
