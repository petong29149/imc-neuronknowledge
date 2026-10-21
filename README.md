# 🧠 IMC NeuronKnowledge

ระบบแพลตฟอร์ม AI Chat & Knowledge Management ระดับองค์กร (Enterprise AI Assistant) พัฒนาด้วย Next.js (App Router), PostgreSQL และรองรับสถาปัตยกรรม Model Context Protocol (MCP) พร้อมระบบจัดการความปลอดภัยและคอนโซลแอดมินเต็มรูปแบบ

---

## ✨ ไฮไลท์และฟีเจอร์หลัก (Features)

- **💬 Advanced AI Chat Interface**:
  - รองรับ Streaming Response และตัวเลือก Reasoning Effort (Low, Medium, High)
  - Built-in Tools ในตัว (เครื่องคิดเลข `calculator`, ดึงทักษะ `load_skill`)
  - ค้นหาประวัติการแชท (Search Chat History) และแบ่งหน้าบทสนทนาอัตโนมัติ
- **🔌 Multi-LLM Provider Support**:
  - เชื่อมต่อได้หลากหลาย Provider ที่รองรับ OpenAI-compatible API (เช่น OpenAI, OpenRouter, Ollama, vLLM, DeepSeek)
  - กำหนดและสลับโมเดลได้อิสระในระดับ Session หรือ Agent
  - จัดการการเชื่อมต่อผ่านหน้า UI ได้ทันทีโดยไม่ต้อง Restart Server
- **🛠️ Model Context Protocol (MCP) Integration**:
  - รองรับการเชื่อมต่อกับภายนอกผ่าน MCP Protocol ทั้งแบบ `SSE`, `Streamable HTTP` และ `Stdio`
  - ตรวจจับ Tool อัตโนมัติ (Tool Discovery & Sync) พร้อมตั้งค่าเปิด/ปิด Tool แต่ละตัวได้
  - รองรับการทำงานแบบ Long-running Query (Timeout สูงสุด 10 นาที)
- **🧩 AI Agents & Skills System**:
  - **Custom AI Agents**: สร้าง Persona AI กำหนด Prompt เฉพาะงาน และกำหนดสิทธิ์การเข้าถึงตามกลุ่มผู้ใช้งาน (Group-based Access Control)
  - **Dynamic Skills**: Instruction packs ภาษาไทย/อังกฤษ ที่ AI จะโหลดเข้ามาเฉพาะเมื่อจำเป็นผ่านคำสั่ง `load_skill`
- **📊 Admin Console & Token Analytics**:
  - สรุปสถิติการใช้งาน Token และคำถาม (วันนี้, สัปดาห์นี้, เดือนนี้)
  - แสดง Top Users และแยกตามรายโมเดล พร้อมส่งออกรายงานเป็นไฟล์ Excel (`.xlsx`)
  - ระบบจัดการสิทธิ์ User และ Group
  - ระบบบันทึกประวัติการแก้ไข System Prompt (`prompt_revisions`) พร้อมรหัสผ่านป้องกันการแก้ไขระดับสูง (Core Prompt Password Lock)

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) 16 (App Router) + [React](https://react.dev/) 19
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) v4
- **Database**: [PostgreSQL](https://www.postgresql.org/) (ผ่าน `pg` Connection Pool)
- **Authentication**: JWT (`jose`), `bcryptjs`, HttpOnly Secure Cookies
- **AI & MCP Protocol**: [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol)
- **Utilities**: `exceljs` (Excel Export), `mathjs` (Calculator Tool), `lucide-react` (Icons)

---

## 📋 ความต้องการของระบบ (Prerequisites)

- **Node.js**: เวอร์ชัน `>= 20.x` (แนะนำ Node.js LTS หรือ Node.js 22/24)
- **PostgreSQL**: เวอร์ชัน `>= 13.x`
- **npm** (หรือ `pnpm` / `yarn`)

> 💡 **ยังไม่มี PostgreSQL ในเครื่อง?**  
> สามารถเปิดด้วย Docker อย่างรวดเร็วด้วยคำสั่ง:
> ```bash
> docker run -d --name imc-postgres -p 5432:5432 -e POSTGRES_PASSWORD=1234 -e POSTGRES_DB=imc-neuronknowledge postgres:16-alpine
> ```

---

## 🚀 เริ่มต้นพัฒนา (Getting Started)

### 1. Clone โปรเจกต์ และติดตั้ง Dependencies

```bash
git clone <repository-url>
cd imc-neuronknowledge
npm install
```

---

### 2. ตั้งค่า Environment Variables (`.env`)

คัดลอกไฟล์เทมเพลตจาก `example.env` มาสร้างเป็น `.env`:

```bash
# บน Linux/macOS หรือ Git Bash
cp example.env .env

# บน Windows PowerShell
copy example.env .env
```

เปิดไฟล์ `.env` และกำหนดค่าที่จำเป็น:

```env
# 1. ฐานข้อมูล PostgreSQL (แก้ไข user, password, port, db name ตามเครื่องคุณ)
POSTGRES_URL=postgres://postgres:1234@localhost:5432/imc-neuronknowledge

# 2. Secret Key สำหรับ JWT (ใน Production ควรเปลี่ยนเป็นสตริงสุ่มอย่างน้อย 32 ตัวอักษร)
JWT_SECRET=neuronknowledge_imc_secure_jwt_secret_key_2026_enterprise

# 3. Timezone สำหรับหน้าสถิติการใช้งาน (Default: Asia/Bangkok)
USAGE_TIMEZONE=Asia/Bangkok
```

#### การตั้งรหัสผ่านสำหรับปลดล็อก Core Prompt ในหน้า Admin (สำคัญ)
ระบบมีกลไกป้องกันการแก้ไข "Core Prompt (หลักการทำงาน)" เพื่อความปลอดภัย ให้สร้าง Hash ด้วยสคริปต์นี้:

```bash
npx tsx scripts/hash-core-password.ts
```

กรอกรหัสผ่านที่ต้องการ (อย่างน้อย 8 ตัวอักษร) แล้วนำบรรทัดที่สคริปต์สร้างให้ เช่น:
```env
CORE_PROMPT_PASSWORD_HASH=JDJiJDEyJH...
```
ไปวางต่อในไฟล์ `.env`

---

### 3. สร้าง Tables และเริ่มต้นฐานข้อมูล (Database Migration & Seeding)

รันคำสั่งเพื่อสร้างตารางทั้งหมดตาม [scripts/schema.sql](scripts/schema.sql) พร้อม Seed ข้อมูล Default Skills และ Agent เริ่มต้น:

```bash
npm run init-db
```

> **ผลลัพธ์ที่ควรได้:**
> ```text
> Target POSTGRES_URL: postgres://postgres:1234@localhost:5432/imc-neuronknowledge
> ✅ Connected successfully to: { current_database: 'imc-neuronknowledge', current_user: 'postgres' }
> 📄 Executing schema file: scripts/schema.sql...
> ✅ All tables, indexes, and initial data from schema.sql applied successfully!
> 
> 📊 Database Status:
>  - Users:  0
>  - Skills: 3
>  - Agents: 1
> ```

---

### 4. รัน Development Server

```bash
npm run dev
```

เปิดบราวเซอร์ไปที่ [http://localhost:3000](http://localhost:3000)

---

## 🎯 ขั้นตอนการตั้งค่าครั้งแรกหลังเปิดแอป (First-Time Setup)

1. **สร้างบัญชีผู้ดูแลระบบ (First User = Admin)**:
   - เข้าไปที่ `/register` หรือคลิกปุ่ม "สมัครสมาชิก"
   - **กฎของระบบ**: ผู้ใช้งานคนแรกสุดที่ลงทะเบียนจะได้รับบทบาท **Admin** โดยอัตโนมัติ!
   - เมื่อสมัครเสร็จแล้ว ระบบจะพาเข้าหน้า `/admin/dashboard` ทันที

2. **ตั้งค่าการเชื่อมต่อโมเดล LLM**:
   - ไปที่เมนู **Admin > LLM Connections**
   - คลิก "เพิ่มการเชื่อมต่อ" (เช่น เชื่อมต่อกับ OpenAI, OpenRouter หรือ Local Ollama)
     - ตัวอย่าง Ollama: Base URL = `http://localhost:11434/v1`, API Key = `ollama`
     - ตัวอย่าง OpenAI: Base URL = `https://api.openai.com/v1`, API Key = `sk-...`
   - ไปที่เมนู **Admin > Models** เพื่อเพิ่มและเปิดใช้งานโมเดล (เช่น `gpt-4o`, `llama3.2`, `qwen2.5`) และกำหนดโมเดลเริ่มต้น (Default)

3. **(ทางเลือก) เชื่อมต่อ MCP Servers**:
   - ไปที่เมนู **Admin > MCP Servers** เพื่อเชื่อมต่อ Tool Server ภายนอก และคลิก "Sync Tools"

4. **เริ่มใช้งาน Chat**:
   - เข้าไปที่ `/chat` เพื่อเริ่มสนทนา, เลือก Agent, ปรับ Effort Level หรือสั่งงานเครื่องมือ

---

## 📜 คำสั่ง Scripts ทั้งหมด (Available Scripts)

| คำสั่ง | คำอธิบาย |
| :--- | :--- |
| `npm run dev` | เปิด Local Development Server (Hot Reload) ที่พอร์ต 3000 |
| `npm run init-db` | รัน `scripts/init-db.mjs` สร้างตารางและตั้งค่าฐานข้อมูลจาก `scripts/schema.sql` |
| `npm run build` | ทำการ Build โปรเจกต์สำหรับ Production |
| `npm run start` | รันเซิร์ฟเวอร์โหมด Production หลัง build |
| `npm run lint` | ตรวจสอบ Code Style และข้อผิดพลาดด้วย ESLint |
| `npx tsx scripts/hash-core-password.ts` | เจเนอเรตรหัสผ่าน Base64-bcrypt hash สำหรับ `CORE_PROMPT_PASSWORD_HASH` |

---

## ⚙️ Environment Variables Reference

| ตัวแปร | ความจำเป็น | ค่าเริ่มต้น (Default) | คำอธิบาย |
| :--- | :---: | :--- | :--- |
| `POSTGRES_URL` | **จำเป็น** | `postgres://postgres:1234@localhost:5432/imc-neuronknowledge` | URL เชื่อมต่อฐานข้อมูล PostgreSQL |
| `JWT_SECRET` | แนะนำ | `neuronknowledge_imc_secure_jwt_secret_key_2026_enterprise` | คีย์สำหรับเข้ารหัส Token Session |
| `CORE_PROMPT_PASSWORD_HASH` | แนะนำ | *(ว่าง)* | Base64-encoded bcrypt hash สำหรับปลดล็อก Core Prompt ในหน้า Admin |
| `USAGE_TIMEZONE` | ทางเลือก | `Asia/Bangkok` | เขตเวลาในการคำนวณสถิติ Usage Report |
| `MCP_TOOL_TIMEOUT_MS` | ทางเลือก | `600000` (10 นาที) | Timeout สำหรับการเรียกใช้ Tool ของ MCP Server (มิลลิวินาที) |

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```text
imc-neuronknowledge/
├── app/
│   ├── admin/               # หน้าคอนโซลผู้ดูแลระบบ (Dashboard, Users, Models, MCP, ฯลฯ)
│   ├── api/                 # API Route Handlers (auth, chat/completions, admin/*)
│   ├── chat/                # หน้าแชทหลัก (Chat Interface)
│   ├── login/ & register/   # หน้าระบบสมาชิกและยืนยันตัวตน
│   ├── layout.tsx           # Root Layout
│   └── page.tsx             # Landing Page
├── components/
│   ├── admin/               # คอมโพเนนต์ของระบบ Admin
│   ├── chat/                # คอมโพเนนต์กล่องแชท, ข้อความ, Markdown Renderer
│   ├── landing/             # คอมโพเนนต์หน้า Landing Page
│   └── ui/                  # Reusable UI primitives
├── context/                 # React Contexts (เช่น AuthContext)
├── lib/
│   ├── db.ts                # PostgreSQL connection pool และ query helper
│   ├── auth.ts              # ฟังก์ชัน JWT, Bcrypt และ Cookie session
│   ├── llm-core.ts          # Core loop สำหรับการประมวลผล LLM และ Tool Calling
│   ├── mcp.ts               # ไคลเอนต์เชื่อมต่อและรันคำสั่ง Model Context Protocol
│   ├── usage.ts             # คำนวณสถิติการใช้งาน Token และปริมาณคำถาม
│   └── core-prompt-lock.ts  # ระบบรักษาความปลอดภัยของ Core Prompt
├── scripts/
│   ├── schema.sql           # โครงสร้างฐานข้อมูลและ Seed Data ทั้งหมด
│   ├── init-db.mjs          # สคริปต์ตรวจเช็กและ Setup ฐานข้อมูล
│   └── hash-core-password.ts# สคริปต์เข้ารหัสรหัสผ่าน Core Prompt
├── example.env              # เทมเพลตตัวแปรสภาพแวดล้อม
└── next.config.ts           # การตั้งค่า Next.js
```

---

## 🔒 สิทธิ์และบทบาทในระบบ (Roles & Permissions)

- **Admin**:
  - เข้าถึงหน้า `/admin/*` ทั้งหมด
  - จัดการผู้ใช้งาน, กลุ่ม, สิทธิ์การเข้าถึง Agent
  - จัดการการเชื่อมต่อ LLM Connections, Models และ MCP Servers
  - ดูสถิติ Usage Analytics และส่งออก Excel
  - ปลดล็อกแก้ไข System Prompt และ Core Working Rules
- **User**:
  - ใช้งานหน้า `/chat` สนทนากับ AI
  - เลือก Agent ที่ได้รับสิทธิ์ และสลับโมเดลที่เปิดใช้งาน
  - จัดการประวัติการสนทนาของตนเอง และแก้ไข Profile ส่วนตัว

---

## 👥 การพัฒนาเป็นทีม (Team Workflow)

- **3 บทบาท**: User (`/agents`, `/chat`), Creator (`/studio`), Admin (`/admin`)
- **งานและสถานะ**: Miro "NeuronKnowledge Studio" → Page Tracker (https://miro.com/app/board/uXjVEXL8TEM=/) งานมี ID ตามหน้า เช่น `S03`, `P01`, `CORE-01`
- **Spec ของแต่ละหน้า**: [docs/specs/README.md](docs/specs/README.md) (สารบัญ, branch, ลำดับการ merge) และ data model กลางที่ [docs/specs/00-data-model.md](docs/specs/00-data-model.md)
- **Branch**: `page/<slug>` หรือ `core/<ชื่อ>` → PR เข้า `staging` → ทดสอบบนเว็บ staging → Maintainer PR `staging` → `main` (production)
- **Workflow ต่อหน้า**: Designer → คนอนุมัติ Spec → Builder → Reviewer → PR + AI Review bot → คน Approve ตามกติกาใน [AGENTS.md](AGENTS.md)
- **Memory hub**: [docs/memory/](docs/memory/README.md) — AI ทุกตัวอ่านก่อนเริ่มงาน

---

## 📄 License

ลิขสิทธิ์และสิทธิ์การใช้งานเป็นไปตามข้อตกลงภายในของโครงการ IMC NeuronKnowledge.
