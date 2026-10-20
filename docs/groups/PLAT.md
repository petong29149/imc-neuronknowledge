# PLAT — Platform Core & Auth

สมัครสมาชิก, login/logout, session, การป้องกันหน้า และโปรไฟล์ผู้ใช้

| | |
|---|---|
| Branch ของกลุ่ม | `group/platform` |
| Branch ของการ์ด | `feat/platform/<ID>-<slug>` หรือ `fix/platform/<ID>-<slug>` |
| ทีม | Team 1 |
| ช่วงเลข migration | 100-199 |
| สถานะการ์ด | Miro Feature Tracker แถว "PLAT Platform" — https://miro.com/app/board/uXjVEXm3whU=/ |

## ไฟล์ที่กลุ่มนี้ดูแล (ตรงกับ `.github/CODEOWNERS`)
- `app/login/`
- `app/register/`
- `app/forbidden/`
- `app/api/auth/`
- `lib/auth.ts`
- `middleware.ts`
- `context/AuthContext.tsx`
- `app/theme-provider.tsx`

## ตารางใน DB
- users

## API Route
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PATCH /api/auth/profile`
- `POST /api/auth/password`

## หน้าจอ
- `/login`
- `/register`
- `/forbidden`

## ฟีเจอร์ที่มีแล้ว (จากการตรวจโค้ด 2026-10-20)
- PLAT-01 Register account (first user = admin) — สมัครสมาชิก ชื่อ/อีเมล/รหัสผ่าน ผู้ใช้คนแรกได้ Admin อัตโนมัติ (app/api/auth/register)
- PLAT-02 Login / Logout with JWT cookie — JWT HS256 อายุ 7 วัน cookie httpOnly (lib/auth.ts, app/api/auth/login, logout)
- PLAT-03 Current user session (/me) + AuthContext — อ่าน role / is_active จาก DB ฝั่ง client (app/api/auth/me, context/AuthContext.tsx)
- PLAT-04 Route guard for /admin and /chat — middleware.ts ตรวจ JWT และ role ส่งไป /login หรือ /forbidden
- PLAT-05 Edit profile name — PATCH /api/auth/profile แล้วออก JWT ใหม่
- PLAT-06 Change password — POST /api/auth/password ตรวจรหัสเดิม ขั้นต่ำ 6 ตัว
- PLAT-07 Theme dark/light + font size — app/theme-provider.tsx เก็บใน localStorage (ยังไม่ผูกกับบัญชี)
- PLAT-08 Forbidden page — app/forbidden แสดงอีเมลและ role

## การ์ดที่ยังเปิดอยู่ (ภาพ ณ 2026-10-20 — สถานะล่าสุดดูใน Miro)
| ID | งาน | สถานะ | Priority | Phase |
|---|---|---|---|---|
| PLAT-09 | Remove hardcoded JWT secret fallback | Not Started | P0 | Phase 0 |
| PLAT-10 | Revoke tokens + check is_active on every API | Not Started | P0 | Phase 0 |
| PLAT-11 | Fix open redirect on /login?redirect= | Not Started | P0 | Phase 0 |
| PLAT-12 | Login / register rate limit and lockout | Not Started | P1 | Phase 0 |
| PLAT-13 | Fix redirect loop for deactivated users | Not Started | P1 | Phase 0 |
| PLAT-14 | Safe first-admin bootstrap | Not Started | P1 | Phase 0 |
| PLAT-15 | Forgot password via email | Not Started | P2 | Phase 2 |
| PLAT-16 | Email verification / domain allowlist | Not Started | P2 | Phase 2 |
| PLAT-17 | Rename middleware.ts to proxy.ts (Next 16) | Not Started | P2 | Phase 0 |
