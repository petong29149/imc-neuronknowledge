# Conventions (ข้อตกลงที่ทุกหน้าใช้ร่วมกัน)

## API (Route Handler)
- ไฟล์อยู่ที่ `app/api/<พื้นที่>/<resource>/route.ts` ใช้ชื่อพหูพจน์ตัวพิมพ์เล็กแบบ kebab-case เช่น `/api/studio/knowledge-sets/[id]`
- พื้นที่ของ API: `/api/agents/**` (User, `getSession()`), `/api/studio/**` (Creator, `requireRole(['admin','creator'])`), `/api/admin/**` (Admin, `requireAdmin()`), `/api/v1/**` (ระบบภายนอก ผ่าน API key ของ CORE-03)
- Error: `NextResponse.json({ error: 'ข้อความภาษาไทย' }, { status })` — 400 input ผิด, 401 ไม่ได้ login, 403 ไม่มีสิทธิ์, 404 ไม่พบ, 409 ข้อมูลซ้ำหรือสถานะชน, 500 ข้อผิดพลาดภายใน (log รายละเอียดฝั่ง server เท่านั้น) — ใช้ `jsonError()` จาก `lib/api.ts` เมื่อ CORE-01 เสร็จ
- แบ่งหน้า: `?limit=&cursor=` (keyset) limit ค่าเริ่มต้น 30 สูงสุด 200 ตอบ `{ items, nextCursor }`
- Request/response ใช้ type จาก `lib/studio/types.ts` ชื่อ field เป็น camelCase (แปลงจาก snake_case ของ DB ใน `lib/`)

## โค้ด
- import ผ่าน alias `@/` เช่น `import { query } from '@/lib/db'`
- Route Handler บาง: รับ input, ตรวจสิทธิ์, validate แล้วเรียกฟังก์ชันใน `lib/studio/<หน้า>.ts` — SQL อยู่ใน `lib/` ไม่กระจายใน component
- SQL ใช้ `query()` จาก `lib/db.ts` และ `$1, $2` เสมอ งานหลายคำสั่งที่ต้องสำเร็จพร้อมกันให้ใช้ transaction
- วันเวลาเก็บเป็น `TIMESTAMPTZ` และส่งออกเป็น ISO 8601 สถิติใช้ timezone จาก `USAGE_TIMEZONE` (ค่าเริ่มต้น Asia/Bangkok)
- ค่าตัวเลขที่อาจเป็น 0 ใช้ `??` ไม่ใช้ `||`
- Next.js 16: `params` และ `searchParams` ของ page เป็น Promise ต้อง `await` ก่อนใช้
- Component ฝั่ง client ใส่ `'use client'` และอยู่ใน `components/<พื้นที่>/<หน้า>/` หน้าใน `/studio` อยู่ใต้ `StudioShell`, หน้าใน `/admin` อยู่ใต้ `AdminShell`
- ทุกการสร้าง/แก้/ลบ/เผยแพร่ เรียก `logActivity()` ด้วยชื่อ action จาก `docs/specs/A01-admin-activity.md`

## UI
- ข้อความบนหน้าจอเป็นภาษาไทย รองรับทั้ง light และ dark (`dark:` class ของ Tailwind) และหน้าจอมือถือ
- ไอคอนใช้ `lucide-react` และใช้ `components/common/Modal.tsx` สำหรับ dialog
- ทุกหน้ามี 4 สถานะ: กำลังโหลด, ว่าง (พร้อมคำแนะนำว่าต้องทำอะไร), error (ข้อความภาษาคน), มีข้อมูล

## Git และ environment
- `main` = production, `staging` = เว็บทดสอบรวม ทั้งสอง branch ป้องกันไว้ ห้าม push ตรง
- งานของแต่ละหน้าอยู่บน `page/<slug>` งานกลางอยู่บน `core/<ชื่อ>` (รายชื่อเต็มใน `docs/specs/README.md`) แตกจาก `staging`
- งานย่อยภายในหน้าเดียวกัน แตก `page/<slug>-<เรื่อง>` จาก branch ของหน้า แล้ว PR กลับเข้า branch ของหน้า (ไม่บังคับ)
- ก่อนเปิด PR: merge `staging` ล่าสุดเข้า branch ตัวเอง แก้ conflict ใน branch ตัวเอง แล้วเปิด PR เข้า `staging`
- เปิด PR เร็ว ไม่ต้องรอหน้าเสร็จทั้งหมด: ส่งเป็นชิ้นที่ใช้งานได้และไม่ทำให้ staging พัง (ซ่อนส่วนที่ยังไม่เสร็จ) อย่างน้อยสัปดาห์ละครั้ง
- Commit: Conventional Commits ใส่ scope เป็น ID ของหน้าตัวพิมพ์เล็ก เช่น `feat(s03): add file sources to knowledge set`, `fix(p01): hide draft agents`
- PR เข้า staging แนบ Spec + Handoff ของหน้านั้น ใส่ลิงก์การ์ด Miro และวิธีทดสอบบน staging
- Release: Maintainer เปิด PR `staging` → `main` หลังทดสอบบน staging ผ่าน ติด tag `v0.x.y` ทุกครั้งที่ขึ้น production
- Hotfix: แตก `hotfix/<ชื่อ>` จาก `main`, PR เข้า `main`, แล้ว merge `main` กลับเข้า `staging` ทันที
