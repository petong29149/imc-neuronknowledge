# OPS — DevOps, Quality & Shared

ไฟล์ส่วนกลาง, schema, เครื่องมือ CI / test / lint, workflow ของทีม (Maintainers)

| | |
|---|---|
| Branch ของกลุ่ม | `group/devops` |
| Branch ของการ์ด | `feat/devops/<ID>-<slug>` หรือ `fix/devops/<ID>-<slug>` |
| ทีม | Maintainers |
| ช่วงเลข migration | 000-099 |
| สถานะการ์ด | Miro Feature Tracker แถว "OPS DevOps" — https://miro.com/app/board/uXjVEXm3whU=/ |

## ไฟล์ที่กลุ่มนี้ดูแล (ตรงกับ `.github/CODEOWNERS`)
- `package.json, package-lock.json`
- `next.config.ts, tsconfig.json, eslint.config.mjs`
- `lib/db.ts, lib/seed-data.ts`
- `scripts/`
- `db/migrations/0*` (หลัง OPS-07)
- `app/layout.tsx, app/globals.css, app/admin/layout.tsx`
- `components/admin/AdminShell.tsx, AdminTabs.tsx, AdminHeader.tsx, AdminPageHeading.tsx`
- `components/common/Modal.tsx`
- `AGENTS.md, CLAUDE.md, .github/, docs/memory/, .kilo/, .clinerules/`

## ตารางใน DB
- ทุกตาราง (schema) — scripts/schema.sql และ DDL ใน lib/db.ts

## API Route
- ไม่มี

## หน้าจอ
- ไม่มี

## ฟีเจอร์ที่มีแล้ว (จากการตรวจโค้ด 2026-10-20)
- OPS-01 README + example.env — ขั้นตอนติดตั้งภาษาไทย

## การ์ดที่ยังเปิดอยู่ (ภาพ ณ 2026-10-20 — สถานะล่าสุดดูใน Miro)
| ID | งาน | สถานะ | Priority | Phase |
|---|---|---|---|---|
| OPS-02 | ESLint | Partial | P1 | Phase 0 |
| OPS-03 | Install multi-agent kit | Not Started | P0 | Phase 0 |
| OPS-04 | CODEOWNERS + branch protection | Not Started | P0 | Phase 0 |
| OPS-05 | Test framework + first tests | Not Started | P0 | Phase 0 |
| OPS-06 | GitHub Actions CI | Not Started | P0 | Phase 0 |
| OPS-07 | Migration framework + number ranges | Not Started | P0 | Phase 0 |
| OPS-08 | AI Review bot on PR | Not Started | P1 | Phase 0 |
| OPS-09 | Stop schema DDL on every request | Not Started | P1 | Phase 0 |
| OPS-10 | Stop logging DB password in init-db | Not Started | P1 | Phase 0 |
| OPS-11 | Dockerfile + docker-compose | Not Started | P1 | Phase 2 |
| OPS-12 | Release management (SemVer) | Not Started | P1 | Phase 0 |
| OPS-13 | Security headers | Not Started | P2 | Phase 2 |
