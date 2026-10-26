# Sales — ชุดเอกสารและหน้าเว็บสำหรับขาย

รวมสิ่งที่ใช้ขายบริการ AI ของ IMC Institute ไว้ในที่เดียว (branch `page/sales-landing`, ID งาน `SALES-01`)

| รายการ | ที่อยู่ | หมายเหตุ |
|---|---|---|
| หน้าเว็บขาย | `/` (`app/page.tsx`, `components/sales/`) | หน้าแรกใหม่ มีปุ่ม IMC Chat และ NeuronHub |
| หน้าแรกเดิมของ NeuronHub | `/hub` (`app/hub/page.tsx`) | ย้ายมาจาก `/` โดยไม่แก้เนื้อหา |
| สไลด์แพ็กเกจ AI | `docs/sales/IMC_AI_Transformation_Packages.pptx` | 30 สไลด์ สไตล์ IMC อธิบาย 5 แพ็กเกจ (ดูหมายเหตุด้านล่าง) |

## 5 แพ็กเกจ

| แพ็กเกจ | กลุ่ม | สรุป |
|---|---|---|
| 1 Quick-win Dashboard | บริการ | ปรับข้อมูล ERP ให้ผู้บริหารตัดสินใจได้ ภายในไม่กี่วัน |
| 2 AI Transformation | บริการ | อบรม + Implement พร้อมกัน 1–2 เดือน |
| 3 Bot ทำงานแทนคน | บริการ | IMC สร้าง bot ใน workflow จริง คนอนุมัติก่อนส่ง (Starter / Department Pack / Care) |
| 4 IMC Chat | แพลตฟอร์ม | หน้าแชทผู้ช่วย AI ขององค์กร (ใช้ร่วม / แยกของตัวเอง) |
| 5 Knowledge & MCP Hub | แพลตฟอร์ม | ตัวรวมความรู้และ MCP Tools (Ready / Custom / Hybrid) |

ทางเข้า: Free Assessment และ Workshop • ชุดรวม: Starter (1+4) และ Transformation Suite (2+3+4+5)

## ปุ่มบนหน้าเว็บขาย

- **IMC Chat** — ไป `https://moc.imcinstitute.com` (เปิดแท็บใหม่) ชั่วคราว จนกว่าจะกำหนดที่อยู่จริงของ `imc-chat-aiagent`
  เปลี่ยนได้โดยตั้ง `NEXT_PUBLIC_CHAT_URL` ใน `.env` (ค่าถูกฝังตอน build ต้อง build ใหม่) หรือแก้บรรทัดเดียวใน `lib/sales/links.ts`
- **NeuronHub** — ไป `/hub` คือหน้าแรกเดิมของ NeuronHub (MCP Hub / Knowledge Hub) ภายในแอปนี้

## หมายเหตุเรื่องสไลด์

- สไลด์ 25 (ราคา) เป็นตัวเลขร่างจากเอกสารแนวคิดบริการ (เฉพาะ Free Assessment, Workshop และแพ็กเกจ 1–2) ยังไม่ได้รับการยืนยัน ส่วนแพ็กเกจ 3–5 ยังไม่กำหนดราคา ลบหรือยืนยันก่อนส่งลูกค้า
- วัน AI Expo ในสไลด์ Roadmap เขียนเพียง "พ.ย. 2026" เพราะเอกสารในโปรเจกต์ระบุไม่ตรงกัน (5 พ.ย. / ปลายเดือน พ.ย.)
- หน้าเว็บสาธารณะ**ไม่แสดงราคา** และไม่ได้เปิดให้ดาวน์โหลดสไลด์ (ไฟล์เก็บใน repository เท่านั้น)
- ไฟล์ `.pptx` ฝังฟอนต์ League Spartan / Poppins ไว้จากสไลด์ workshop ต้นแบบ
