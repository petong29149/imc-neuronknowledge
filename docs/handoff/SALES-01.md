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
- ไฟล์ที่เปลี่ยน: `app/page.tsx` (ใหม่), `app/hub/page.tsx` (ย้ายจาก `app/page.tsx` เนื้อหาเดิม), `components/sales/*` (SalesHeader, SalesHero, SalesPillars, SalesSystems, SalesTransformation, SalesContact, SalesFooter, SalesCtaButtons, SectionHeading), `lib/sales/links.ts`, `example.env` (คอมเมนต์), `docs/sales/*` (README + สไลด์), `docs/specs/SALES-01-sales-landing.md`, `docs/handoff/SALES-01.md`
- คำสั่งตรวจที่รันและผล: `npx tsc --noEmit` → ผ่าน • `npx eslint app/page.tsx app/hub/page.tsx components/sales lib/sales` → ผ่าน • `npm run build` → ผ่าน (`/` และ `/hub` เป็น static) • ตรวจในเบราว์เซอร์: `/` และ `/hub` ทั้งจอ 1440px และมือถือ 375px, light/dark, ปุ่มทั้งสองชี้ปลายทางถูกต้อง
- ขั้นตอนทดสอบด้วยมือ (ทำซ้ำได้):
  1. `npm run dev` เปิด `/` — เห็นหน้าขาย ปุ่ม **เข้าสู่ IMC Chat** ชี้ไป `https://moc.imcinstitute.com` เปิดแท็บใหม่
  2. กด **เข้าสู่ NeuronHub** — ไป `/hub` เห็นหน้าแรกเดิม (หัวข้อ "MCP Server & Knowledge Hub") และเมนู MCP Hub / สถาปัตยกรรม / คลังความรู้ เลื่อนไปยัง section ได้
  3. กดโลโก้บน `/hub` — กลับ `/`
  4. สลับ light/dark และย่อหน้าต่างเป็น 375px — ไม่มี scroll แนวนอน เมนูมือถือเปิดปิดได้
  5. ตั้ง `NEXT_PUBLIC_CHAT_URL=https://example.com` แล้ว build ใหม่ — ปุ่ม IMC Chat ชี้ไปค่าใหม่
- สิ่งที่เบี่ยงจาก Spec + เหตุผล: ไม่มี

## 3) Review (AI)
- (ยังไม่ได้ทำ — ให้ Reviewer ตรวจ `git diff staging...HEAD` เทียบ Spec และ `.github/ai-review/checklist.md`)

## 4) Human decision
- Reviewer (มนุษย์): @ • ผล: • วันที่:
- [ ] ย้ายการ์ดใน Miro (เมื่อมีการ์ด)

## เสนอการ์ดใหม่
- เจ้าของไฟล์ (CORE-01): ถ้าต้องการให้เมนูใน `components/common/Navbar.tsx` บน `/hub` มีลิงก์ "หน้าขาย/AI Transformation" เพิ่ม ต้องให้ CORE-01 แก้ (ตอนนี้ใช้โลโก้กลับ `/` ได้อยู่แล้ว)
- เจ้าของ (Maintainer): กำหนดที่อยู่จริงของ imc-chat-aiagent แล้วตั้ง `NEXT_PUBLIC_CHAT_URL` บน staging/production

## เสนอเพิ่มใน memory
- ไฟล์: decisions • ข้อความที่เสนอ: `## D-0xx หน้าแรกฝ่ายขาย` — `/` เป็นหน้าขาย (IMC Chat + NeuronHub + AI Transformation), หน้าแรกเดิมของ NeuronHub ย้ายไป `/hub`, ลิงก์แชทมาจาก `NEXT_PUBLIC_CHAT_URL` (ค่าเริ่มต้น moc.imcinstitute.com ชั่วคราว) — วันที่ 2026-10-26 ผู้ตัดสินใจ: เจ้าของโปรเจกต์
