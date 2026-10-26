# SALES-01 — หน้าแรกฝ่ายขาย (Sales Landing)

- Route: `/` (หน้าขาย), `/neuronhub` (หน้าแนะนำ NeuronHub), `/neuronknowledge` (หน้าแรกเดิมของแอปนี้ ย้ายมา) • Branch: `page/sales-landing` • บทบาท: ผู้เยี่ยมชมทั่วไป (ไม่ต้อง login)
- ที่มา: คำสั่งเจ้าของโปรเจกต์ (แชท 2026-10-26) — ยังไม่มีการ์ดใน Miro ใช้ ID ชั่วคราว `SALES-01`

## 1. เป้าหมาย
ทำหน้าแรกใหม่ซ้อนหน้าเดิม ใช้ **ขาย/แนะนำ** ให้ลูกค้าองค์กร ยังไม่ใช่ตัวผลิตภัณฑ์จริง อธิบายแต่ละระบบ มีส่วน AI Transformation ตามเอกสารแนวคิดบริการ และลิงก์เอกสารบริการ

### 1.1 ชื่อและความหมาย (เจ้าของโปรเจกต์ยืนยัน 2026-10-26)
- **NeuronHub** = หน้าแชท AI (เดิมเรียก IMC Chat) — มีหน้าแนะนำที่ `/neuronhub` และลิงก์ไป Showcase ที่ทำให้ลูกค้า `plus.คิดค้า.com`
- **NeuronKnowledge** = โค้ดของระบบนี้ เป็นศูนย์รวม MCP Server และความรู้ — หน้าแนะนำคือหน้าแรกเดิมที่ `/neuronknowledge` (ไม่มีลิงก์เข้า login / register / Admin)

### 1.2 ชุดแพ็กเกจ (4 แพ็กเกจ)
- กลุ่มบริการ (ทีม IMC ลงมือทำ): แพ็กเกจ 1 Quick-win Dashboard, แพ็กเกจ 2 AI Transformation (สร้าง Bots ที่ทำงานแทนคน รวมอยู่ในแพ็กเกจนี้ ไม่แยก)
- กลุ่มแพลตฟอร์ม (ใช้งานต่อเนื่อง): แพ็กเกจ 3 NeuronHub (ใช้ร่วม / แยกของตัวเอง), แพ็กเกจ 4 NeuronKnowledge (Ready / Custom / Hybrid, Cloud / On-premise)
- ทางเข้า: Free Assessment, Workshop • ชุดรวม: Starter (Quick-win + NeuronHub), Transformation Suite (AI Transformation + NeuronHub + NeuronKnowledge)
- ราคาแพ็กเกจ 3, 4 และการดูแลต่อเนื่องยังไม่กำหนด หน้าเว็บสาธารณะไม่แสดงราคา
- ลดคำที่ดูเกินจริง: ไม่ใช้ "ภายในไม่กี่วัน", "ทันที", "100%", "เร็วที่สุด" ในข้อความขาย

## 2. Acceptance Criteria
1. `/` แสดงหน้าขาย: Hero, 4 แพ็กเกจ, ส่วน Quick-win + AI Transformation (รวมหลักฐาน 23 bots), ส่วน NeuronHub + NeuronKnowledge, ติดต่อ
2. ปุ่มบน Hero/เมนู: **NeuronHub** ไป `/neuronhub` และ **NeuronKnowledge** ไป `/neuronknowledge` (ทั้งสองอยู่ในแอปนี้ ไม่เปิดแอปจริง)
3. `/neuronhub` เป็นหน้าแนะนำ (มีภาพจำลองหน้าแชทที่ป้ายว่า "จำลอง") และมีปุ่มไป Showcase `plus.คิดค้า.com` (ค่าตั้งผ่าน `NEXT_PUBLIC_SHOWCASE_URL`, ค่าเริ่มต้น punycode `plus.xn--42ca1c5gh2k.com`) เปิดแท็บใหม่ด้วย `rel="noopener noreferrer"`
4. `/neuronknowledge` แสดงเนื้อหาหน้าแรกเดิม (anchor `#mcp`, `#architecture`, `#library` ใช้ได้) ภายใต้ header/footer ของหน้าขาย และไม่มีลิงก์ไป `/login`, `/register`, `/admin`
5. หน้าขายมีปุ่ม "เอกสารรายละเอียดบริการ" ชี้ Google Doc (`NEXT_PUBLIC_SERVICE_DOC_URL`) เปิดแท็บใหม่
6. รองรับ light/dark และมือถือ (375px) ไม่มี scroll แนวนอน
7. ฟีเจอร์ที่ยังไม่เปิดใช้ต้องระบุว่า "กำลังเปิดตัว" (ตาม lessons: landing ห้ามอ้างฟีเจอร์ที่ยังไม่มี)
8. ไม่แสดงราคาบนหน้าสาธารณะ และไม่มี form ที่เก็บข้อมูล (ติดต่อผ่านโทรศัพท์ อีเมล LINE Facebook)

## 3. ขอบเขตข้อมูล
ไม่ใช้ฐานข้อมูล ไม่มี API ใหม่ ไม่มี migration ไม่มี `logActivity()` (ไม่มีการสร้าง/แก้/ลบข้อมูล)

## 4. UI
Server component เป็นหลัก มี client เฉพาะ `SalesHeader` (เมนูมือถือ, สลับธีม) และ `ScrollReveal` (ใช้ซ้ำจาก `components/common` โดยไม่แก้) ใช้ Tailwind v4 และ lucide-react ที่มีอยู่ ไม่เพิ่มแพ็กเกจ

## 5. ข้อเสนอเปลี่ยน schema/type
ไม่มี

## 8. ไฟล์ที่เป็นเจ้าของ
- `app/page.tsx`, `app/neuronhub/page.tsx`, `app/neuronknowledge/page.tsx` (ย้ายมาจาก `app/page.tsx` เดิม), `components/sales/**`, `lib/sales/**`
- `docs/sales/**`, `docs/specs/SALES-01-sales-landing.md`, `docs/handoff/SALES-01.md`
- `example.env` (เพิ่มคอมเมนต์ตัวแปร `NEXT_PUBLIC_*` ของหน้าขาย)
- แก้เล็กน้อยในไฟล์ที่ไม่มีเจ้าของ: `components/landing/McpHubSection.tsx` เพิ่ม prop `showAdminLink` (ค่าเริ่มต้น `true` ไม่เปลี่ยนพฤติกรรมเดิม)

ไม่แตะ: `components/common/**` (Navbar, Footer เดิมไม่ได้ใช้ในหน้าใหม่แต่ยังอยู่), `app/layout.tsx`, `app/globals.css`, `middleware.ts`
