# Decisions log (เพิ่มต่อท้ายเท่านั้น)

รูปแบบ: `## D-<เลข> <หัวข้อ>` • วันที่ • ผู้ตัดสินใจ • อ้างอิง • การตัดสินใจ • เหตุผล • ผลกระทบ

เรื่องที่ยังรอตัดสินใจอยู่ใน Miro frame "10 Open Decisions" — ตัดสินแล้วค่อยย้ายมาบันทึกที่นี่

## D-001 ใช้ Miro เป็นศูนย์กลางการ์ดงาน
- วันที่: 2026-10-20 • ผู้ตัดสินใจ: Maintainers • อ้างอิง: Miro "NeuronKnowledge Project Hub" → Feature Tracker
- การตัดสินใจ: การ์ดงานและสถานะทั้งหมดอยู่ใน Miro ใช้ ID การ์ด (`<กลุ่ม>-<เลข>`) แทนเลข GitHub Issue ใน branch, Spec, Handoff, Commit และ PR
- เหตุผล: เห็นภาพทั้งโปรเจกต์ (ภาพรวมระบบ, roadmap, ความเสี่ยง) และสถานะการ์ดในที่เดียว ใช้สอนต่อได้
- ผลกระทบ: ทุก PR ต้องอ้าง ID การ์ด ผู้ทำต้องย้ายสถานะการ์ดใน Miro เอง

## D-002 แบ่งทีมและ branch ตามกลุ่มฟีเจอร์
- วันที่: 2026-10-20 • ผู้ตัดสินใจ: Maintainers • อ้างอิง: `.github/CODEOWNERS`, `docs/groups/`
- การตัดสินใจ: 10 กลุ่ม (PLAT, CHAT, AGENT, LLM, MCP, KNOW, GOV, API, WEB, OPS) ทีมละกลุ่ม แต่ละกลุ่มมี branch ยาว `group/<กลุ่ม>` การ์ดแตก `feat/<กลุ่ม>/<ID>-<slug>` จาก branch นั้น แล้ว merge กลุ่มเข้า `main` ปลาย sprint
- เหตุผล: ทีมทำงานคู่ขนานได้โดยไม่ชนกัน ความเป็นเจ้าของไฟล์ชัดเจนผ่าน CODEOWNERS
- ผลกระทบ: group branch ต้อง merge `main` กลับเข้ามาหลังทุก release งานข้ามกลุ่มต้องเปิดการ์ดในกลุ่มเจ้าของไฟล์

## D-003 Multi-agent workflow ผ่าน GitHub และ memory ใน repository
- วันที่: 2026-10-20 • ผู้ตัดสินใจ: Maintainers • อ้างอิง: `AGENTS.md` หัวข้อ "บทบาท", คู่มือ Multi-agent Workflow และ Memory Hub
- การตัดสินใจ: แต่ละการ์ดผ่าน Designer → (คนอนุมัติ Spec) → Builder → Reviewer → PR + AI Review bot → (คน Approve) โดยใช้ `docs/memory/` เป็นความจำร่วม
- เหตุผล: ตรวจย้อนหลังได้ทุกบรรทัด ความรับผิดชอบชัด คุมค่า token ได้
- ผลกระทบ: AI ไม่แก้ memory เอง การอนุมัติเป็นของมนุษย์เท่านั้น

## D-004 DB ใน `.env` เป็น DB รีโมตที่ใช้ร่วมกัน
- วันที่: 2026-10-20 • ผู้ตัดสินใจ: Maintainers
- การตัดสินใจ: ห้ามรัน `npm run init-db`, migration หรือ SQL ที่แก้ข้อมูลกับ DB นี้ การเปลี่ยน schema ผ่านกลุ่ม OPS เท่านั้นจนกว่าจะมี migration framework (OPS-07)
- เหตุผล: ทุกคนใช้ DB เดียวกัน การแก้ schema หรือ seed ซ้ำกระทบทุกทีม
- ผลกระทบ: การแยก DB dev / staging ยังเป็นคำถามเปิดใน Miro

## D-005 โมเดลธุรกิจ: ศูนย์กลางขาย Ready Agent
- วันที่: 2026-10-20 • ผู้ตัดสินใจ: เจ้าของโปรเจกต์ • อ้างอิง: Miro frame "11 Business Model"
- การตัดสินใจ: IMC ขาย Agent พร้อมใช้ที่มีคลังความรู้ (vector DB) ของ IMC ลูกค้าเลือกได้ 3 แบบ: (1) Ready Agent ใช้ได้ทันทีแม้ไม่มีข้อมูล (2) Ready Agent + ข้อมูลของบริษัทใน vector DB ส่วนตัว (3) ให้ IMC สร้าง vector DB และ agent ให้ตั้งแต่ต้น
- ช่องทางเรียกใช้: MCP server, OpenAI-compatible API, แชทบอท (เว็บ / widget) และ LINE OA ของบริษัทลูกค้า
- ผลกระทบ: ระบบต้องเป็นฝั่ง "ผู้ให้บริการ" ด้วย (กลุ่ม API: API-01, API-02, API-08) และแยกข้อมูลต่อบริษัท (GOV-11, GOV-17)

## D-006 ลูกค้ากลุ่มแรก: นำเข้าส่งออก เพื่อเดโมที่งาน AI Expo
- วันที่: 2026-10-20 • ผู้ตัดสินใจ: เจ้าของโปรเจกต์
- การตัดสินใจ: Ready Agent ตัวแรกคือ Import-Export Agent (AGENT-20) เดโมที่งาน AI Expo ปลายเดือนพฤศจิกายน 2569 — Phase 1 ใน Miro คือ "AI Expo MVP" และ code freeze 1 สัปดาห์ก่อนงาน
- ผลกระทบ: งาน Phase 0 + Phase 1 ต้องเสร็จก่อนงาน งานขายหลายบริษัท (tenant, API key, billing) อยู่ Phase 2 หลังงาน

## D-007 ข้อมูลเข้าระบบ 2 ทาง
- วันที่: 2026-10-20 • ผู้ตัดสินใจ: เจ้าของโปรเจกต์
- การตัดสินใจ: (1) ทีมงานหรือลูกค้าโยนไฟล์ผ่านหน้า Dataset Studio แล้วเขียน use case + ตัวอย่างคำถาม AI ทำสรุป tag และ hybrid RAG ให้หลังบ้านด้วย API key (2) ข้อมูลที่เป็นไฟล์จำนวนมากหรืออยู่ใน database ให้ MCP ไปดึง (MCP-16, MCP-17)
- ผลกระทบ: เพิ่มกลุ่ม STUDIO (D-009) ทีมงานรับบทบาท Knowledge Curator

## D-008 ใช้ MCP ข้อมูลการค้าของ IMC ใน Import-Export Agent
- วันที่: 2026-10-20 • ผู้ตัดสินใจ: เจ้าของโปรเจกต์ • อ้างอิง: MCP-15
- การตัดสินใจ: MCP ของ IMC มี 3 tool: `customs_trade_data` (สถิติการค้าไทย กรมศุลกากร), `gta_trade_data` (Global Trade Atlas), `moc_news` (ข่าวและประกาศกระทรวงพาณิชย์ ค้นแบบ hybrid)
- กติกาของ tool ที่ prompt ของ agent ต้องบังคับ: `moc_news` ต้องส่งคำถามเป็นภาษาอังกฤษ และห้าม AI เดาพิกัด HS / COMEX / COMIM เอง (ส่งชื่อสินค้าให้ tool ค้นพิกัด)

## D-009 เพิ่มกลุ่ม STUDIO (รวม 11 กลุ่ม)
- วันที่: 2026-10-20 • ผู้ตัดสินใจ: Maintainers • อ้างอิง: `docs/groups/STUDIO.md`, `.github/CODEOWNERS`
- การตัดสินใจ: แยก Dataset Studio (หน้าหลังบ้านจัดการชุดข้อมูล use case ตัวอย่างคำถาม playground และ publish) ออกจาก KNOW ซึ่งดูแลเฉพาะ engine (ingest, index, retrieval, citation) branch `group/studio` migration 900–999
- เหตุผล: KNOW ใหญ่เกินทีมเดียว และทั้งสองส่วนต้องเสร็จก่อน AI Expo พร้อมกัน
