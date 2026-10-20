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
