# Sales — ชุดเอกสารและหน้าเว็บสำหรับขาย

รวมสิ่งที่ใช้ขายบริการ AI ของ IMC Institute ไว้ในที่เดียว (branch `page/sales-landing`, ID งาน `SALES-01`) ตอนนี้เป็นหน้า **แนะนำ/ขาย** ยังไม่ใช่ตัวผลิตภัณฑ์จริง

| รายการ | ที่อยู่ | หมายเหตุ |
|---|---|---|
| หน้าเว็บขาย | `/` (`app/page.tsx`, `components/sales/`) | หน้าแรกใหม่ มีปุ่ม NeuronHub และ NeuronKnowledge |
| หน้าแนะนำ NeuronHub (แชท AI) | `/neuronhub` | ภาพจำลองหน้าแชท + ลิงก์ Showcase `plus.คิดค้า.com` |
| หน้าแนะนำ NeuronKnowledge | `/neuronknowledge` (`app/neuronknowledge/page.tsx`) | หน้าแรกเดิมของแอปนี้ (ศูนย์รวม MCP Server) ไม่มีลิงก์เข้าแอปจริง |
| สไลด์แพ็กเกจ AI | `docs/sales/IMC_AI_Transformation_Packages.pptx` | 29 สไลด์ สไตล์ IMC |
| เอกสารบริการ ฉบับที่ 2 | `docs/sales/IMC_AI_Service_Concept_v2.docx` | ปรับจากเอกสารแนวคิดบริการเดิม (Google Doc) ให้รวม 4 แพ็กเกจ + NeuronHub + NeuronKnowledge — อัปโหลดแทนที่/เปิดใน Google Docs ได้ ลิงก์ Google Doc เดิมแสดงบนหน้าขายอยู่แล้ว |

## ชื่อ

- **NeuronHub** = หน้าแชท AI (เดิมเรียก IMC Chat)
- **NeuronKnowledge** = โค้ดของระบบนี้ เป็นศูนย์รวม MCP Server และความรู้

## 4 แพ็กเกจ

| แพ็กเกจ | กลุ่ม | สรุป |
|---|---|---|
| 1 Quick-win Dashboard | บริการ | ปรับข้อมูล ERP ให้ผู้บริหารตัดสินใจได้ง่ายขึ้น (ระยะสั้น) |
| 2 AI Transformation | บริการ | อบรม + ลงมือสร้าง Bots ที่ทำงานแทนคน 1–2 เดือน คนอนุมัติก่อนส่งออก |
| 3 NeuronHub | แพลตฟอร์ม | หน้าแชท AI ขององค์กร (ใช้ร่วม / แยกของตัวเอง) |
| 4 NeuronKnowledge | แพลตฟอร์ม | ศูนย์รวม MCP Server และความรู้ (Ready / Custom / Hybrid) |

ทางเข้า: Free Assessment และ Workshop • ชุดรวม: Starter (1+3) และ Transformation Suite (2+3+4)

## ลิงก์ที่ตั้งค่าได้ (`.env`, ค่าถูกฝังตอน build)

- `NEXT_PUBLIC_SHOWCASE_URL` — Showcase ที่ทำให้ลูกค้า (ค่าเริ่มต้น `https://plus.xn--42ca1c5gh2k.com` = plus.คิดค้า.com)
- `NEXT_PUBLIC_SERVICE_DOC_URL` — เอกสารรายละเอียดบริการ (Google Doc)
- ที่อยู่ของหน้า NeuronHub จริง (แอปแชท) ยังไม่ได้ผูกกับหน้านี้ — เมื่อกำหนดแล้วให้เพิ่มปุ่มใน `components/sales/NeuronHubShowcase.tsx`

## หมายเหตุเรื่องสไลด์

- สไลด์ราคา (หน้า 24) เป็นตัวเลขร่างจากเอกสารแนวคิดบริการ (เฉพาะ Free Assessment, Workshop และแพ็กเกจ 1–2) ยังไม่ได้รับการยืนยัน ส่วนแพ็กเกจ 3–4 และการดูแลต่อเนื่องยังไม่กำหนดราคา ลบหรือยืนยันก่อนส่งลูกค้า
- วัน AI Expo ในสไลด์ Roadmap เขียนเพียง "พ.ย. 2026" เพราะเอกสารในโปรเจกต์ระบุไม่ตรงกัน (5 พ.ย. / ปลายเดือน พ.ย.)
- หน้าเว็บสาธารณะ**ไม่แสดงราคา** และไม่ได้เปิดให้ดาวน์โหลดสไลด์ (ไฟล์เก็บใน repository เท่านั้น)
- ไฟล์ `.pptx` ฝังฟอนต์ League Spartan / Poppins ไว้จากสไลด์ workshop ต้นแบบ
