# Conventions (ข้อตกลงที่ทุกกลุ่มใช้ร่วมกัน)

## API (Route Handler)
- ไฟล์อยู่ที่ `app/api/<พื้นที่>/<resource>/route.ts` ใช้ชื่อพหูพจน์ตัวพิมพ์เล็กแบบ kebab-case เช่น `/api/admin/llm-connections/[id]`
- API สำหรับผู้ดูแลระบบอยู่ใต้ `/api/admin/**` และต้องเรียก `requireAdmin()` จาก `lib/auth.ts`
- API ของผู้ใช้ทั่วไปเรียก `getSession()` แล้วตอบ 401 ถ้าไม่มี session
- Error: `NextResponse.json({ error: 'ข้อความภาษาไทย' }, { status })` — 400 input ผิด, 401 ไม่ได้ login, 403 ไม่มีสิทธิ์, 404 ไม่พบ, 409 ข้อมูลซ้ำหรือสถานะชน, 500 ข้อผิดพลาดภายใน (log รายละเอียดฝั่ง server เท่านั้น)
- แบ่งหน้า: ใช้แบบเดียวกับ `GET /api/chat/conversations` คือ `?limit=&cursor=` (keyset) limit ค่าเริ่มต้น 30 สูงสุด 200
- Public API สำหรับระบบภายนอกจะอยู่ใต้ `/api/v1/**` (กลุ่ม API) และใช้ `docs/openapi.yaml` เป็น contract

## โค้ด
- import ผ่าน alias `@/` เช่น `import { query } from '@/lib/db'`
- Route Handler บาง: รับ input, ตรวจสิทธิ์, validate แล้วเรียกฟังก์ชันใน `lib/<โมดูล>.ts` — SQL อยู่ใน `lib/` ไม่กระจายใน component
- SQL ใช้ `query()` จาก `lib/db.ts` และ `$1, $2` เสมอ งานหลายคำสั่งที่ต้องสำเร็จพร้อมกันให้ใช้ transaction
- วันเวลาเก็บเป็น `TIMESTAMPTZ` และส่งออกเป็น ISO 8601 สถิติใช้ timezone จาก `USAGE_TIMEZONE` (ค่าเริ่มต้น Asia/Bangkok)
- ค่าตัวเลขที่อาจเป็น 0 ใช้ `??` ไม่ใช้ `||`
- Component ฝั่ง client ใส่ `'use client'` และอยู่ใน `components/<พื้นที่>/` หน้าใหม่ใน `/admin` ใช้ `AdminShell` เดิม

## UI
- ข้อความบนหน้าจอเป็นภาษาไทย รองรับทั้ง light และ dark (`dark:` class ของ Tailwind)
- ไอคอนใช้ `lucide-react` และใช้ `components/common/Modal.tsx` สำหรับ dialog

## Git
- Branch ยาวของแต่ละกลุ่ม: `group/<กลุ่ม>` เช่น `group/chat` (รายชื่อเต็มใน `.github/CODEOWNERS`)
- Branch ของการ์ด แตกจาก `group/<กลุ่ม>`: `feat/<กลุ่ม>/<ID>-<slug>` หรือ `fix/<กลุ่ม>/<ID>-<slug>` เช่น `feat/chat/CHAT-20-context-trim` ลบทิ้งหลัง merge
- Commit: Conventional Commits ใส่ scope เป็นกลุ่ม และ ID การ์ดท้ายข้อความ เช่น `feat(chat): trim history by context length (CHAT-20)`
- PR หนึ่งอัน = การ์ดหนึ่งใบ เปิดเข้า `group/<กลุ่ม>` แนบ Spec + Handoff ของการ์ดนั้นใน PR เดียวกัน และใส่ลิงก์การ์ด Miro ในคำอธิบาย
- ปลาย sprint: หัวหน้าทีมเปิด PR จาก `group/<กลุ่ม>` เข้า `main` หลังแต่ละ release ให้ merge `main` กลับเข้า `group/<กลุ่ม>`
