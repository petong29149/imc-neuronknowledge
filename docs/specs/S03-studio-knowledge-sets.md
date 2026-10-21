# Spec: Knowledge Sets (S03)

- ผู้ใช้: Creator, Admin • Route: `/studio/knowledge` (รายการ), `/studio/knowledge/new` (สร้าง), `/studio/knowledge/[id]` (รายละเอียด/แก้ไข)
- Branch: `page/studio-knowledge-sets` → PR เข้า `staging`
- ขึ้นกับ: CORE-01, CORE-02 (job + search), S02 (เลือกตาราง) • หน้าที่รอ: S04, S05

## 1. เป้าหมาย
creator รวมความรู้จากหลายแหล่งเป็น Knowledge Set ชุดเดียว (ไฟล์ + ตารางจาก DB + MCP tool) ตั้งค่า hybrid RAG ด้วย preset ที่เข้าใจง่าย แล้วสั่งสร้างและดูสถานะได้

## 2. ขอบเขต
- ทำ:
  1. **รายการ:** ชื่อ, โดเมน, จำนวนแหล่ง, จำนวน use case, สถานะ (ร่าง / กำลังสร้าง / พร้อมใช้ / ผิดพลาด), อัปเดตล่าสุด
  2. **สร้าง (หลายขั้น):** ข้อมูลทั่วไป (ชื่อ, slug, โดเมน, คำอธิบาย) → เพิ่มแหล่ง → ตั้งค่า RAG → ตรวจและกด **"สร้าง Knowledge Set"**
  3. **เพิ่มแหล่ง 3 แบบ:**
     - ไฟล์: ลากวางได้หลายไฟล์ PDF, DOCX, XLSX, CSV, TXT, MD (โหมด index เสมอ)
     - ตารางจาก DB: เลือก connection (S02) → เลือกตาราง → เลือกคอลัมน์ที่อนุญาต → **เลือกโหมด**: "ทำ index" (ข้อความ เช่น แคตตาล็อก, FAQ) หรือ "query สด" (ตัวเลข สถิติ) พร้อมคำอธิบายว่าควรเลือกเมื่อไร
     - MCP tool: เลือก tool ที่ sync แล้ว (โหมด query สดเสมอ) เช่น `customs_trade_data`
  4. **ตั้งค่า RAG:** preset `เอกสารยาว/กฎหมาย`, `FAQ/ข้อความสั้น`, `ตาราง` และแท็บ Advanced (chunk size, overlap, top-k, น้ำหนัก keyword กับ vector, rerank, คะแนนขั้นต่ำ) • embedding model ล็อกหลังสร้างครั้งแรก
  5. **แจ้งผลกระทบ:** เปลี่ยนค่า chunk หรือเพิ่มแหล่งต้อง re-index — แสดงจำนวนไฟล์/แถวและเวลาโดยประมาณก่อนกดยืนยัน
  6. **หน้ารายละเอียด:** รายการแหล่งพร้อมสถานะและ progress (poll จาก CORE-02), ลบ/เพิ่มแหล่ง, re-index ทีละแหล่ง, **ช่องทดลองค้นหา** (เรียก `/api/studio/search`) แสดง chunk ที่เจอ, คะแนน, locator, ลิงก์ไปหน้า use case (S04)
- ไม่ทำ: เขียนตัวแปลงไฟล์หรือ embedding เอง (เรียก CORE-02), use case (S04)

## 3. หน้าจอ
- อัปโหลดแสดง progress ต่อไฟล์, ไฟล์เกินขนาดหรือชนิดไม่รองรับแจ้งทันทีก่อนส่ง
- source ที่ error แสดงเหตุผลและปุ่มลองใหม่

## 4. API
| Method | Path | สิทธิ์ | หมายเหตุ |
|---|---|---|---|
| GET | `/api/studio/knowledge-sets` | creator, admin | รายการ |
| POST | `/api/studio/knowledge-sets` | creator, admin | สร้าง (สถานะ draft) |
| GET / PUT / DELETE | `/api/studio/knowledge-sets/[id]` | creator, admin | DELETE ห้ามถ้ามี agent ที่เผยแพร่ใช้อยู่ |
| POST | `/api/studio/knowledge-sets/[id]/sources` | creator, admin | multipart (ไฟล์) หรือ JSON (db_table, mcp_tool) |
| DELETE | `/api/studio/knowledge-sets/[id]/sources/[sourceId]` | creator, admin | สั่ง CORE-02 ลบ chunk |
| POST | `/api/studio/knowledge-sets/[id]/build` | creator, admin | สร้าง job index ทุกแหล่งที่ยังไม่ ready |

## 5. ข้อมูล
เขียน: `knowledge_sets`, `knowledge_sources` • อ่าน: `ingestion_jobs`, `data_connections`, `mcp_tools` • type: `KnowledgeSet`, `KnowledgeSource`, `RagSettings`

## 6. สิทธิ์และความปลอดภัย
- ขนาดไฟล์สูงสุดตาม CORE-02 (ค่าเริ่มต้น 50 MB), ตรวจ MIME จริงฝั่ง server
- คอลัมน์ที่ไม่ได้เลือกห้ามถูกอ่าน, แนะนำให้ซ่อนคอลัมน์ข้อมูลส่วนบุคคล (ชื่อ, เบอร์, เลขบัตร)

## 7. Acceptance criteria และกรณีทดสอบ
| # | เกณฑ์ | วิธีทดสอบ | ผลที่คาด |
|---|---|---|---|
| 1 | Knowledge Set มีหลายแหล่ง | เพิ่ม PDF 2 ไฟล์ + 1 ตาราง (query สด) + 1 MCP tool | ทั้ง 4 แหล่งอยู่ในชุดเดียว |
| 2 | เลือกโหมดได้ | ตารางเดียวกันเลือก index | สร้าง job index; เลือก live ไม่สร้าง job |
| 3 | เห็นความคืบหน้า | อัปโหลดไฟล์ใหญ่ | progress เพิ่มจนพร้อมใช้ |
| 4 | ทดลองค้นหาได้ | ถามคำถามจากเอกสาร | เห็น chunk และเลขหน้า |
| 5 | เตือนก่อน re-index | เปลี่ยน chunk size | มีหน้ายืนยันบอกจำนวนและเวลา |
| 6 | ไฟล์ผิดชนิดถูกปฏิเสธ | อัปโหลด .exe ที่เปลี่ยนนามสกุล | 400 |

## 8. ไฟล์ที่เป็นเจ้าของ
`app/studio/knowledge/page.tsx`, `app/studio/knowledge/new/**`, `app/studio/knowledge/[id]/page.tsx`, `components/studio/knowledge/**`, `app/api/studio/knowledge-sets/**` (ยกเว้น `use-cases`), `lib/studio/knowledge-sets.ts`

## 9. Activity log ที่ต้องเขียน
`knowledge_set.create`, `knowledge_set.update`, `knowledge_set.delete`, `knowledge_set.build`, `source.add`, `source.remove`

## 10. คำถามที่ยังเปิด
- ค่า preset เริ่มต้นแต่ละแบบ (ให้ Engine team เสนอตัวเลขหลังทดลอง)
