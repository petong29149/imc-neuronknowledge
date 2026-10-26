# Handoff: SALES-01 — หน้าแรกฝ่ายขาย

- Spec: `docs/specs/SALES-01-sales-landing.md` • การ์ด Miro: ยังไม่มี • Branch: `page/sales-landing` → PR เข้า `staging`

## 1) Design
- ผู้ทำ: Claude (Designer + Builder ในรอบเดียว ตามคำสั่งเจ้าของโปรเจกต์) 
- Spec: `docs/specs/SALES-01-sales-landing.md`
- สรุปแนวทาง: ย้ายหน้าแรกเดิมไป `/hub` แล้วสร้างหน้าขายใหม่ที่ `/` มีปุ่ม IMC Chat (ลิงก์ภายนอกผ่าน env) และ NeuronHub (`/hub`) พร้อมส่วน AI Transformation ตามเอกสารแนวคิดบริการ
- [x] **มนุษย์อนุมัติแผนแล้ว** — โดยเจ้าของโปรเจกต์ (แชท 2026-10-26: "อนุมัติแผนหน้าเว็บขายตามที่เสนอ")
- [ ] มนุษย์ตรวจ Spec ฉบับลายลักษณ์อักษรนี้ (เขียนหลังอนุมัติแผน)

## 2) Build
- ผู้ทำ: Claude (Builder) • ควบคุมโดยเจ้าของโปรเจกต์
- ไฟล์ที่เปลี่ยน: `app/page.tsx` (หน้าขายใหม่), `app/neuronknowledge/page.tsx` (หน้าแรกเดิมย้ายมา ใช้ header/footer ของหน้าขาย), `app/neuronhub/page.tsx` (ใหม่), `components/sales/*` (SalesHeader, SalesHero, SalesPackages, SalesTransformation, SalesSystems, SalesContact, SalesFooter, SalesCtaButtons, SectionHeading, NeuronHubShowcase), `lib/sales/links.ts`, `components/landing/McpHubSection.tsx` (เพิ่ม prop `showAdminLink` ค่าเริ่มต้น true), `example.env`, `docs/sales/*` (README + สไลด์), `docs/specs/SALES-01-sales-landing.md`, `docs/handoff/SALES-01.md`
- คำสั่งตรวจที่รันและผล: ดูท้ายส่วนนี้
- ขั้นตอนทดสอบด้วยมือ (ทำซ้ำได้):
  1. `npm run dev` เปิด `/` — เห็นหน้าขาย 4 แพ็กเกจ ปุ่ม NeuronHub / NeuronKnowledge / เอกสารบริการ
  2. กด **NeuronHub** — ไป `/neuronhub` เห็นภาพจำลองแชท (ป้าย "จำลอง") ปุ่ม Showcase ชี้ `https://plus.xn--42ca1c5gh2k.com` เปิดแท็บใหม่
  3. กด **NeuronKnowledge** — ไป `/neuronknowledge` เห็นเนื้อหาหน้าแรกเดิม เมนู MCP Server / สถาปัตยกรรม / คลังความรู้ เลื่อนได้ และไม่มีปุ่ม login / register / Admin Console
  4. กดปุ่ม "เอกสารรายละเอียดบริการ" — เปิด Google Doc ในแท็บใหม่
  5. สลับ light/dark และย่อหน้าต่างเป็น 375px — ไม่มี scroll แนวนอน เมนูมือถือเปิดปิดได้
- สิ่งที่เบี่ยงจาก Spec + เหตุผล: ไม่มี (Spec ปรับตามคำสั่งเจ้าของโปรเจกต์ 2026-10-26: เหลือ 4 แพ็กเกจ, เปลี่ยนชื่อเป็น NeuronHub/NeuronKnowledge, ปุ่มไปหน้าแนะนำแทนแอปจริง)

## 3) Review (AI)
- (ยังไม่ได้ทำ — ให้ Reviewer ตรวจ `git diff staging...HEAD` เทียบ Spec และ `.github/ai-review/checklist.md`)

## 4) Human decision
- Reviewer (มนุษย์): @ • ผล: • วันที่:
- [ ] ย้ายการ์ดใน Miro (เมื่อมีการ์ด)

## เสนอการ์ดใหม่
- เจ้าของ (Maintainer): กำหนดที่อยู่จริงของแอปแชท (NeuronHub) แล้วเพิ่มปุ่มเข้าใช้งานจริงในหน้า `/neuronhub`
- เจ้าของ (Maintainer/ทีมขาย): ยืนยันราคาแพ็กเกจ แล้วตัดสินใจว่าจะเผยแพร่สไลด์ราคาหรือไม่

## เสนอเพิ่มใน memory
- ไฟล์: decisions • ข้อความที่เสนอ: `## D-0xx หน้าแรกฝ่ายขายและชื่อผลิตภัณฑ์` — `/` เป็นหน้าขาย 4 แพ็กเกจ; NeuronHub = หน้าแชท AI (`/neuronhub`), NeuronKnowledge = โค้ดระบบนี้ ศูนย์รวม MCP Server (`/neuronknowledge` = หน้าแรกเดิม); ทั้งสองเป็นหน้าแนะนำ ไม่เข้าแอปจริง; Showcase `plus.คิดค้า.com` — วันที่ 2026-10-26 ผู้ตัดสินใจ: เจ้าของโปรเจกต์
