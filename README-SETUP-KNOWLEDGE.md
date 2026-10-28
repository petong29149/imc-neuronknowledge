# เริ่มต้นใช้งาน NeuronKnowledge + Knowledge Engine (สำหรับ dev)

คู่มือนี้พาตั้งระบบในเครื่องตั้งแต่ศูนย์ จนอัปโหลดเอกสารเข้าคลังความรู้และถามในแชทได้ ใช้เวลาประมาณ 30–45 นาที (ครั้งแรก build Docker image นานสุด)

**Knowledge Engine** = ระบบหลังบ้าน (Python) ที่อ่านไฟล์ PDF / DOCX / PPTX / TXT / MD และ PDF สแกน / JPG / PNG (ด้วย OCR) ตัดคำไทย แบ่งเป็นชิ้น ทำ embedding แล้วเก็บใน Qdrant จากนั้นให้ agent ในแอปค้นผ่าน MCP พร้อมอ้างอิงแหล่งที่มา `[ชื่อไฟล์, หน้า X]` แยกข้อมูลตามองค์กร (`org_id`) — ผู้ใช้เห็นเฉพาะเอกสารขององค์กรตัวเอง

---

## ⚠️ อ่านก่อนเริ่ม

1. **ห้ามชี้แอปไปที่ฐานข้อมูลร่วมของทีม (114.119.173.23)** — แอปเวอร์ชันนี้เพิ่มคอลัมน์ `groups.org_id` **อัตโนมัติทุกครั้งที่มีคน login** ถ้า `.env` ชี้ DB ร่วม โครงสร้าง DB ของทีมจะถูกแก้ทันที ใช้ฐานข้อมูลในเครื่อง (`neuron-devdb/`) เท่านั้น ถ้า `.env` เดิมของคุณชี้ DB ร่วม ให้เปลี่ยนชื่อเป็น `.env.remote` เก็บไว้ก่อน
2. **ห้าม commit ไฟล์ `.env` ทุกตัว** (มี OpenAI key และรหัสผ่าน) — `.gitignore` กันไว้แล้ว อย่าใช้ `git add -f`
3. **รหัสผ่านใน `neuron-devdb/.env` ใช้ในเครื่องเท่านั้น** ห้ามนำไปใช้กับ staging / production และอย่าส่งต่อในกลุ่มแชทสาธารณะ
4. **OpenAI API key ใช้ของตัวเอง** — ค่า embedding ถูกมาก (~$0.02 ต่อ 1 ล้าน token ≈ 1.5 บาทต่อเอกสารไทย 1,000 หน้า) ส่วน **OCR ของหน้าสแกนแพงกว่า ~$0.002–0.004 ต่อหน้า** (≈ 7–14 บาทต่อ 100 หน้า) แนะนำตั้ง Usage limit ในหน้า Billing ของ OpenAI

---

## สิ่งที่ต้องมี

| สิ่งที่ต้องมี | หมายเหตุ |
|---|---|
| Docker Desktop (Windows/macOS) หรือ Docker Engine + Compose v2.20+ | บน Windows บางครั้งต้องเปิด Docker Desktop 2 รอบกว่าจะพร้อม |
| Node.js 20.9 ขึ้นไป (ทดสอบกับ 22) | สำหรับแอป Next.js |
| OpenAI API key | https://platform.openai.com/api-keys (บัญชีต้องมีเครดิต) |
| พอร์ตว่าง | `3000` แอป · `5434` Postgres · `8000` API ภายใน · `8765` MCP · `6333` Qdrant |
| พื้นที่ดิสก์ ~5 GB | image ของ engine ~1.1 GB (rerank ~2.8 GB — ไม่จำเป็น ปิดไว้เป็นค่าเริ่มต้น) |

---

## ขั้นที่ 1 — เปิดฐานข้อมูลในเครื่อง (neuron-devdb)

```bash
cd neuron-devdb
docker compose up -d
docker compose logs postgres | grep "neuron-devdb"
```

ต้องเห็น `[neuron-devdb] databases ready: imc_neuronknowledge (user nk_app), knowledge_engine (user nk_engine)`

ได้ Postgres 1 ตัวที่ `127.0.0.1:5434` มี 2 database แยกกัน:

| Database | ใช้โดย | ผู้ใช้ | รหัสผ่าน (ดูใน `neuron-devdb/.env`) |
|---|---|---|---|
| `imc_neuronknowledge` | แอป Next.js | `nk_app` | `APP_DB_PASSWORD` |
| `knowledge_engine` | Knowledge Engine | `nk_engine` | `ENGINE_DB_PASSWORD` |

> ไม่มีไฟล์ `neuron-devdb/.env`? ขอจากคนที่ส่งงานให้ (ไม่อยู่ใน git) — รายละเอียดเพิ่มเติม: [neuron-devdb/README.md](neuron-devdb/README.md)

---

## ขั้นที่ 2 — ตั้งค่าและเปิด Knowledge Engine

```bash
cd knowledge-engine
cp example.env .env
```

แก้ `knowledge-engine/.env` 3 ค่า:

```env
# engine รันใน Docker จึงใช้ host.docker.internal (ไม่ใช่ localhost)
POSTGRES_URL=postgresql://nk_engine:<ENGINE_DB_PASSWORD>@host.docker.internal:5434/knowledge_engine

# สตริงสุ่ม ≥ 32 ตัวอักษร — จดไว้ ต้องใส่ค่าเดียวกันในแอปขั้นที่ 3
INTERNAL_API_TOKEN=<สร้างด้วยคำสั่งด้านล่าง>

OPENAI_API_KEY=sk-...
```

สร้าง token: `python -c "import secrets; print(secrets.token_urlsafe(48))"` (หรือ `node -e "console.log(require('crypto').randomBytes(36).toString('base64url'))"`)

ค่าอื่นใช้ค่าเริ่มต้นได้ (`QDRANT_URL=http://qdrant:6333`, `STORAGE_BACKEND=local`, `RERANK_ENABLED=false`)

เปิดระบบ (ครั้งแรก build image ~5–10 นาที):

```bash
docker compose up -d --build
docker compose ps
```

ต้องเห็น `api`, `mcp`, `qdrant` เป็น `healthy` และ `worker` เป็น `Up` (`migrate` จะ `Exited (0)` — สร้างตารางเสร็จแล้วจบ ถือว่าปกติ)

---

## ขั้นที่ 3 — ตั้งค่าและเปิดแอป Next.js

ที่โฟลเดอร์หลักของโปรเจกต์:

```bash
cp example.env .env
```

แก้ `.env` ของแอป:

```env
# แอปรันบนเครื่องโดยตรง จึงใช้ 127.0.0.1
POSTGRES_URL=postgres://nk_app:<APP_DB_PASSWORD>@127.0.0.1:5434/imc_neuronknowledge

# สตริงสุ่ม ≥ 32 ตัวอักษร
JWT_SECRET=<สตริงสุ่ม>

KNOWLEDGE_API_URL=http://127.0.0.1:8000
# ต้องเป็นค่าเดียวกับ INTERNAL_API_TOKEN ใน knowledge-engine/.env ทุกตัวอักษร
KNOWLEDGE_API_TOKEN=<ค่าเดียวกับ INTERNAL_API_TOKEN>
KNOWLEDGE_MAX_FILE_MB=50
```

ติดตั้งและเปิด:

```bash
npm install
npm run init-db
npm run dev
```

เปิด http://localhost:3000

---

## ขั้นที่ 4 — สร้างผู้ใช้และองค์กร (ในเว็บ)

ฐานข้อมูลใหม่ว่างเปล่า ต้องสร้างข้อมูลเอง:

1. **สมัครผู้ใช้คนแรก** (หน้า "ลงทะเบียนผู้ใช้ใหม่") → **คนแรกจะเป็น admin อัตโนมัติ**
2. สมัครผู้ใช้ทดสอบเพิ่ม เช่น `alice@neuron.test` (องค์กร acme) และ `bob@neuron.test` (องค์กร beta) — logout ก่อนสมัคร หรือใช้หน้าต่าง incognito
3. login เป็น admin → **Admin Console → จัดการผู้ใช้งาน → กลุ่มผู้ใช้งาน (Groups)** → สร้างกลุ่ม
   - ชื่อ `ACME Corp` · ช่อง **รหัสองค์กรสำหรับคลังความรู้ (org_id)** = `acme` · เพิ่ม alice เป็นสมาชิก
   - ชื่อ `Beta Ltd` · org_id = `beta` · เพิ่ม bob
   - org_id ใช้ได้เฉพาะ a–z, 0–9, `-`, `_` (ตัวเล็ก) และซ้ำกันไม่ได้

> ผู้ใช้ที่ไม่อยู่ในกลุ่มที่มี org_id จะเปิดหน้าคลังความรู้ได้ แต่จะขึ้น "บัญชีนี้ยังไม่ได้อยู่ในองค์กรใด" และอัปโหลดไม่ได้

---

## ขั้นที่ 5 — ทดสอบอัปโหลดเอกสาร

1. login เป็น alice → หน้าแชท → คลิก**ชื่อผู้ใช้มุมล่างซ้าย** → **คลังความรู้** (หรือเปิด http://localhost:3000/knowledge)
2. เลือกไฟล์ (PDF / DOCX / PPTX / TXT / MD / JPG / PNG ไม่เกิน 50 MB) ใส่คำอธิบาย (อย่างน้อย 10 ตัวอักษร) และแท็ก → **อัปโหลด**
3. สถานะจะเปลี่ยนเอง: รอประมวลผล → กำลังอ่านไฟล์ → กำลังแบ่งเนื้อหา → กำลังสร้างดัชนี → **พร้อมใช้งาน** (มีจำนวนชิ้นเนื้อหา)
   - PDF 25 หน้าที่มีตารางเยอะใช้ ~35 วินาที
   - **PDF สแกน, หน้าสแกนที่ปนอยู่ และรูป JPG/PNG อ่านด้วย OCR อัตโนมัติ** — คอลัมน์คุณภาพขึ้น "อ่านด้วย OCR" (PDF สแกน 2 หน้าใช้ ~30 วินาที) ควรสุ่มเทียบกับต้นฉบับ
   - เอกสารที่มีหน้าต้อง OCR เกิน 200 หน้าจะถูกปฏิเสธ (ปรับได้ที่ `OCR_MAX_PAGES`)
4. **ทดสอบการแยกองค์กร:** login เป็น bob → ต้องไม่เห็นเอกสารของ acme

---

## ขั้นที่ 6 — ให้ agent ค้นคลังความรู้ในแชท

### 6.1 สร้าง API key ของ MCP (1 key ต่อ 1 องค์กร)

```bash
cd knowledge-engine
docker compose run --rm --no-deps mcp python -m knowledge.mcp_server create-key --org acme --label "NeuronKnowledge app"
```

key (ขึ้นต้นด้วย `kn_`) **แสดงครั้งเดียว** — คัดลอกไว้ (ระบบเก็บแค่ hash) · ดูรายการ: `list-keys` · ยกเลิก: `revoke-key <key>`

### 6.2 ลงทะเบียน MCP server ในแอป

**Admin Console → MCP Servers → เพิ่ม server**

- ชื่อ: `Knowledge acme`
- Transport: **Streamable HTTP**
- URL: `http://localhost:8765/mcp`
- Headers (JSON): `{"Authorization": "Bearer kn_..."}`
- บันทึก → **Sync tools** → ต้องได้ 3 tool: `search_knowledge`, `list_documents`, `get_document_chunk`

> 1 องค์กร = 1 MCP server (URL เดียวกัน แต่ key ต่างกัน) — ห้ามใช้ key ขององค์กรหนึ่งกับ agent ของอีกองค์กร

### 6.3 ตั้ง LLM สำหรับตอบแชท

**Admin Console → LLM & Models** → เพิ่ม connection (เช่น OpenAI ใช้ key เดียวกับ engine ได้) → เพิ่ม/sync โมเดล (ช่วงทดสอบใช้รุ่นเล็กเพื่อประหยัด)

### 6.4 สร้าง agent ขององค์กร

**Admin Console → AI Agents** → สร้าง agent เช่น `คลังความรู้ ACME`
- เลือกโมเดลจากข้อ 6.3
- ผูก tool ของ server **Knowledge acme** เท่านั้น
- จำกัดสิทธิ์ใช้งานเป็นกลุ่ม **ACME Corp**

### 6.5 ทดสอบ

login เป็น alice → เลือก agent `คลังความรู้ ACME` → ถามเรื่องที่อยู่ในเอกสาร

- คำตอบต้องมีอ้างอิง `[ชื่อไฟล์, หน้า X]`
- ถามด้วยรหัส/ชื่อเฉพาะในเอกสาร (เช่น เลขแบบฟอร์ม) ต้องหาเจอ (hybrid search)
- ถามเรื่องที่ไม่มีในเอกสาร ต้องตอบว่าไม่พบ ไม่แต่งเอง
- bob ต้องใช้ agent นี้ไม่ได้

---

## คำสั่งที่ใช้บ่อย (ใน `knowledge-engine/`)

```bash
docker compose ps                                   # สถานะ service
docker compose logs -f worker                       # ดูการประมวลผลไฟล์
docker compose logs -f mcp                          # ดูการค้นจากแชท (บรรทัด search org=... hits=N)
docker compose exec api python -m pytest -q         # รัน test ทั้งหมด (~4 นาที, ควรผ่าน 315 ข้อ)
docker compose stop                                 # หยุด (ข้อมูลยังอยู่)
docker compose up -d                                # เปิดต่อ
```

> ⚠️ `docker compose down -v` จะ**ลบข้อมูลทั้งหมด** (เอกสาร, vector, ไฟล์) — ใช้เมื่อต้องการล้างเครื่องจริง ๆ เท่านั้น

---

## แก้ปัญหา

| อาการ | สาเหตุ / วิธีแก้ |
|---|---|
| อัปโหลด/โหลดรายการเอกสารไม่ผ่าน (HTTP 401 จาก engine) | `KNOWLEDGE_API_TOKEN` ของแอป ≠ `INTERNAL_API_TOKEN` ของ engine → แก้ให้ตรง แล้วรีสตาร์ท `npm run dev` และ `docker compose up -d` |
| ขึ้น "ระบบคลังความรู้ไม่พร้อมใช้งานชั่วคราว" | engine ไม่ได้รัน หรือ `KNOWLEDGE_API_URL` ผิด → `docker compose ps` ใน `knowledge-engine/` |
| ขึ้น "บัญชีนี้ยังไม่ได้อยู่ในองค์กรใด" | ผู้ใช้ยังไม่อยู่ในกลุ่มที่มี org_id (ขั้นที่ 4) |
| ไฟล์ค้าง "กำลังสร้างดัชนี" แล้วกลายเป็นล้มเหลว | ไม่ได้ใส่ `OPENAI_API_KEY` หรือ key ไม่มีเครดิต → ใส่แล้ว `docker compose up -d` (ต้อง `up` ไม่ใช่ `restart` จึงจะอ่าน `.env` ใหม่) แล้วกดปุ่ม reindex ที่ไฟล์ |
| ไฟล์ค้าง "กำลังอ่านไฟล์" นานเกิน 15 นาที | ระบบจะตัดเป็นล้มเหลวเอง · ดู `docker compose logs worker` |
| ไฟล์สแกน/รูปภาพขึ้น "ต้องใช้ OCR" | `OCR_ENABLED=false` ใน `knowledge-engine/.env` → ตั้งเป็น `true` แล้ว `docker compose up -d` และกด reindex |
| ไฟล์สแกนค้าง "กำลังอ่านไฟล์" แล้วล้มเหลวว่า OCR | OpenAI ล่มหรือ key ไม่มีเครดิต → ระบบลองใหม่เอง ดู `docker compose logs worker` |
| ไฟล์ขึ้น "ตัวอ่านไฟล์หยุดทำงานกะทันหัน" | ไฟล์อาจเสีย → เปิดแล้ว Save As / Export เป็นไฟล์ใหม่ แล้วอัปโหลดอีกครั้ง |
| แชทค้นไม่เจออะไรเลย | ตรวจว่าไฟล์ "พร้อมใช้งาน" แล้ว · agent ผูก server ถูกองค์กร · header ของ MCP server เป็น JSON ถูกรูปแบบ · ดู `docker compose logs mcp` |
| `docker compose` ต่อ Postgres ไม่ได้ | ตรวจว่า neuron-devdb รันอยู่ และ `POSTGRES_URL` ของ engine ใช้ `host.docker.internal:5434` |
| พอร์ตชน | แก้ `PG_PORT` ใน `neuron-devdb/.env` (และ URL ทั้ง 2 ฝั่ง) หรือปิดโปรแกรมที่ใช้พอร์ตนั้น |

---

## สถานะงานและข้อจำกัด (ณ 28 ต.ค. 2026)

**เสร็จและทดสอบแล้ว**
- อัปโหลด / index / ลบ / reindex เอกสาร PDF, DOCX, PPTX, TXT, MD, ตัดคำไทย, ตาราง PDF, metadata, citation ระดับหน้า
- **OCR** ของ PDF สแกน / หน้าสแกนปน / JPG / PNG ด้วย OpenAI vision (ทดสอบกับ PDF สแกนภาษาไทยแล้วถูกต้องครบ)
- hybrid search (ความหมาย + คำตรงกัน) ผ่าน MCP, แยกข้อมูลตามองค์กรทุกชั้น
- test 315 ข้อผ่าน, ทดสอบอัปโหลด PDF จริงผ่าน, worker ไม่ตายเมื่อเจอไฟล์ที่ทำ crash
- เวอร์ชัน dependency ล็อกไว้ใน `knowledge-engine/docker/constraints.txt`

**ยังไม่ได้ทำ / ข้อจำกัด**
- **ยังไม่ได้ทดสอบถาม-ตอบในแชทแบบครบวงจร** (ขั้นที่ 6) — ถ้าเจอปัญหาแจ้งกลับด้วย
- ยังไม่ได้วัดความแม่นการค้นกับคำถามจริง (ต้องมีคำถามจริง 30–50 ข้อ → `knowledge-engine/eval/`)
- rerank ปิดไว้ (ต้องใช้ image ที่มี torch ~2.8 GB และโหลดโมเดล ~2.3 GB)
- อ่าน PDF ที่มีตารางเยอะยังช้า · PDF ที่ฟอนต์ไทยเสีย (ข้อความเพี้ยน) ยังไม่ส่ง OCR · OCR ยังไม่ได้ทดสอบกับไฟล์สแกนจริงจากเครื่องสแกน (ทดสอบกับ PDF ที่ทำให้เป็นภาพ)
- ใครอยู่ในกลุ่มขององค์กรก็อัปโหลด/ลบเอกสารได้ (ยังไม่แยกสิทธิ์)
- **โค้ดชุดนี้สร้างบน `main` commit `2b4e877`** — ยังไม่ได้รวมกับงานล่าสุดบน GitHub (`main` ใหม่กว่า 3 commit, `staging`) และแนวทางยังต่างจาก spec CORE-02 ของทีม (TypeScript + pgvector) — ใช้สำหรับทดลองและคุยกันก่อน ยังไม่ merge

---

## เอกสารเพิ่มเติม

| ไฟล์ | เนื้อหา |
|---|---|
| [knowledge-engine/README.md](knowledge-engine/README.md) | service ทั้งหมด, Internal API, MCP, hybrid/rerank, evaluation, test |
| [neuron-devdb/README.md](neuron-devdb/README.md) | ฐานข้อมูล dev, ต่อ DBeaver/pgAdmin, แก้ปัญหา |
| [Plan/KNOWLEDGE_ENGINE_PLAN.md](Plan/KNOWLEDGE_ENGINE_PLAN.md) | สถาปัตยกรรม, การตัดสินใจ, Progress Log ว่าทำอะไรไปแล้ว |
| [README.md](README.md) | แอป NeuronKnowledge ทั้งหมด |
