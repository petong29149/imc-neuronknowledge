# GOV — Access, Governance & Insights

ผู้ใช้, กลุ่ม, สิทธิ์ และสถิติการใช้งาน รวมถึงบริษัทลูกค้า (tenant), subscription, audit log และการนับการใช้งานเพื่อคิดเงิน

| | |
|---|---|
| Branch ของกลุ่ม | `group/governance` |
| Branch ของการ์ด | `feat/governance/<ID>-<slug>` หรือ `fix/governance/<ID>-<slug>` |
| ทีม | Team 7 |
| ช่วงเลข migration | 700-799 |
| สถานะการ์ด | Miro Feature Tracker แถว "GOV Governance" — https://miro.com/app/board/uXjVEXm3whU=/ |

## ไฟล์ที่กลุ่มนี้ดูแล (ตรงกับ `.github/CODEOWNERS`)
- `app/admin/dashboard/`
- `app/admin/users/`
- `components/admin/AdminUsersWorkspace.tsx`
- `components/admin/AdminUsersSection.tsx`
- `components/admin/AdminUserTable.tsx`
- `components/admin/AdminUserModals.tsx`
- `components/admin/AdminUserFilter.tsx`
- `components/admin/AdminGroupsSection.tsx`
- `components/admin/AdminGroupTable.tsx`
- `components/admin/AdminGroupModals.tsx`
- `components/admin/AdminMetricCards.tsx`
- `components/admin/usage/`
- `lib/usage.ts`
- `lib/usage-export.ts`
- `lib/usage-types.ts`
- `app/api/admin/users/`
- `app/api/admin/groups/`
- `app/api/admin/usage/`
- `lib/audit.ts` (ใหม่)

## ตารางใน DB
- users
- groups
- group_members
- อ่าน: chats (สำหรับ usage)

## API Route
- `GET, POST /api/admin/users`
- `PUT, DELETE /api/admin/users/[id]`
- `GET, POST /api/admin/groups`
- `GET, PUT, DELETE /api/admin/groups/[id]`
- `POST, PATCH, DELETE /api/admin/groups/[id]/members`
- `GET /api/admin/usage`
- `GET /api/admin/usage/months`
- `GET /api/admin/usage/export`

## หน้าจอ
- `/admin/dashboard`
- `/admin/users`

## ฟีเจอร์ที่มีแล้ว (จากการตรวจโค้ด 2026-10-20)
- GOV-01 User management — CRUD, role, status, reset password (app/api/admin/users)
- GOV-02 Group management + members — app/api/admin/groups, เพิ่มลบสมาชิก
- GOV-03 Group-based agent access — lib/agents.ts ACCESS_CONDITION
- GOV-04 Last-admin protection — ห้ามลบหรือลดสิทธิ์ admin คนสุดท้าย
- GOV-05 Usage dashboard today / week / month — คำถาม, แชท, token, ผู้ใช้ active (lib/usage.ts)
- GOV-06 Top users + per-model charts — UsageBarChart, UsageDonutChart
- GOV-07 Usage export Excel / CSV — GET /api/admin/usage/export สูงสุด 36 เดือน

## การ์ดที่ยังเปิดอยู่ (ภาพ ณ 2026-10-20 — สถานะล่าสุดดูใน Miro)
| ID | งาน | สถานะ | Priority | Phase |
|---|---|---|---|---|
| GOV-08 | Group owner role | Partial | P2 | Phase 2 |
| GOV-09 | Usage storage | Partial | P1 | Phase 2 |
| GOV-10 | Audit log | Not Started | P0 | Phase 2 |
| GOV-11 | Multi-tenant separation | Not Started | P0 | Phase 2 |
| GOV-12 | RBAC permission matrix | Not Started | P1 | Phase 2 |
| GOV-13 | Usage quotas and alerts | Not Started | P2 | Phase 3 |
| GOV-14 | PDPA: export / delete my data | Not Started | P2 | Phase 3 |
| GOV-15 | Usage trend, filters, per-agent usage | Not Started | P2 | Phase 3 |
| GOV-16 | Paginate user list | Not Started | P2 | Phase 3 |
| GOV-17 | Customer organizations + agent subscriptions | Not Started | P0 | Phase 2 |
| GOV-18 | Usage metering per customer and agent | Not Started | P1 | Phase 2 |
