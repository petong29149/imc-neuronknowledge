# Sales — ชุดเอกสารและหน้าเว็บสำหรับขาย

รวมสิ่งที่ใช้ขายบริการ AI ของ IMC Institute ไว้ในที่เดียว (branch `page/sales-landing`, ID งาน `SALES-01`)

| รายการ | ที่อยู่ | หมายเหตุ |
|---|---|---|
| หน้าเว็บขาย | `/` (`app/page.tsx`, `components/sales/`) | หน้าแรกใหม่ มีปุ่ม IMC Chat และ NeuronHub |
| หน้าแรกเดิมของ NeuronHub | `/hub` (`app/hub/page.tsx`) | ย้ายมาจาก `/` โดยไม่แก้เนื้อหา |
| สไลด์ AI Transformation | `docs/sales/IMC_AI_Transformation_Packages.pptx` | 29 สไลด์ สไตล์ IMC (ดูหมายเหตุด้านล่าง) |

## ปุ่มบนหน้าเว็บขาย

- **IMC Chat** — ไป `https://moc.imcinstitute.com` (เปิดแท็บใหม่) ชั่วคราว จนกว่าจะกำหนดที่อยู่จริงของ `imc-chat-aiagent`
  เปลี่ยนได้โดยตั้ง `NEXT_PUBLIC_CHAT_URL` ใน `.env` (ค่าถูกฝังตอน build ต้อง build ใหม่) หรือแก้บรรทัดเดียวใน `lib/sales/links.ts`
- **NeuronHub** — ไป `/hub` คือหน้าแรกเดิมของ NeuronHub (MCP Hub / Knowledge Hub) ภายในแอปนี้

## หมายเหตุเรื่องสไลด์

- สไลด์ 24 (ราคา) เป็นตัวเลขร่างจากเอกสารแนวคิดบริการ ยังไม่ได้รับการยืนยัน ลบหรือยืนยันก่อนส่งลูกค้า
- วัน AI Expo ในสไลด์ Roadmap เขียนเพียง "พ.ย. 2026" เพราะเอกสารในโปรเจกต์ระบุไม่ตรงกัน (5 พ.ย. / ปลายเดือน พ.ย.)
- หน้าเว็บสาธารณะ**ไม่แสดงราคา** และไม่ได้เปิดให้ดาวน์โหลดสไลด์ (ไฟล์เก็บใน repository เท่านั้น)
- ไฟล์ `.pptx` ฝังฟอนต์ League Spartan / Poppins ไว้จากสไลด์ workshop ต้นแบบ
