# SALES-01 — หน้าแรกฝ่ายขาย (Sales Landing)

- Route: `/` (ใหม่) และ `/hub` (หน้าแรกเดิมย้ายมา) • Branch: `page/sales-landing` • บทบาท: ผู้เยี่ยมชมทั่วไป (ไม่ต้อง login)
- ที่มา: คำสั่งเจ้าของโปรเจกต์ (แชท 2026-10-26) — ยังไม่มีการ์ดใน Miro ใช้ ID ชั่วคราว `SALES-01`

## 1. เป้าหมาย
ทำหน้าแรกใหม่ซ้อนหน้าเดิม ใช้ขายให้ลูกค้าองค์กร อธิบายแต่ละระบบ และมีส่วน AI Transformation ตามเอกสารแนวคิดบริการ พร้อมปุ่มสองปุ่ม

## 2. Acceptance Criteria
1. `/` แสดงหน้าขาย: Hero, 3 เสาหลัก, การ์ดอธิบาย IMC Chat และ NeuronHub, ส่วน AI Transformation, ติดต่อ
2. ปุ่ม **IMC Chat** เปิด `NEXT_PUBLIC_CHAT_URL` (ค่าเริ่มต้น `https://moc.imcinstitute.com`) ในแท็บใหม่ด้วย `rel="noopener noreferrer"`
3. ปุ่ม **NeuronHub** ไป `/hub` ซึ่งต้องเป็นหน้าแรกเดิมของ NeuronHub ที่เนื้อหาไม่เปลี่ยน (anchor `#mcp`, `#architecture`, `#library` ยังทำงาน)
4. โลโก้ใน Navbar ของ `/hub` กลับมาที่ `/`
5. รองรับ light/dark และมือถือ (375px) ไม่มี scroll แนวนอน
6. ข้อความที่เป็นฟีเจอร์ที่ยังไม่เปิดใช้ ต้องระบุว่า "กำลังเปิดตัว" ไม่ระบุเป็นของที่พร้อมใช้ (ตาม lessons: landing ห้ามอ้างฟีเจอร์ที่ยังไม่มี)
7. ไม่แสดงราคาบนหน้าสาธารณะ และไม่มี form ที่เก็บข้อมูล (ติดต่อผ่านโทรศัพท์ อีเมล LINE Facebook)

## 3. ขอบเขตข้อมูล
ไม่ใช้ฐานข้อมูล ไม่มี API ใหม่ ไม่มี migration ไม่มี `logActivity()` (ไม่มีการสร้าง/แก้/ลบข้อมูล)

## 4. UI
Server component เป็นหลัก มี client เฉพาะ `SalesHeader` (เมนูมือถือ, สลับธีม) และ `ScrollReveal` (ใช้ซ้ำจาก `components/common` โดยไม่แก้) ใช้ Tailwind v4 และ lucide-react ที่มีอยู่ ไม่เพิ่มแพ็กเกจ

## 5. ข้อเสนอเปลี่ยน schema/type
ไม่มี

## 8. ไฟล์ที่เป็นเจ้าของ
- `app/page.tsx`, `app/hub/page.tsx` (ย้ายมา), `components/sales/**`, `lib/sales/**`
- `docs/sales/**`, `docs/specs/SALES-01-sales-landing.md`, `docs/handoff/SALES-01.md`
- `example.env` (เพิ่มคอมเมนต์ `NEXT_PUBLIC_CHAT_URL` เท่านั้น)

ไม่แตะ: `components/common/**` (Navbar, Footer ใช้ตามเดิม), `app/layout.tsx`, `app/globals.css`, `middleware.ts`
