# Spec: Foundation (CORE-01)

- ผู้ใช้: ทุกบทบาท (งานกลาง) • Branch: `core/foundation` → PR เข้า `staging` • เจ้าของ: Maintainers
- ต้องเสร็จก่อน: ทุกหน้า (merge เข้า staging เป็นอันดับแรก สัปดาห์ 1)
- สถานะโครง: role `creator` ใน `lib/auth.ts`, `requireRole()`, guard `/studio` และ `/agents` ใน `middleware.ts`, `StudioShell`, `PagePlaceholder`, `lib/studio/types.ts` ทำไว้แล้วใน commit scaffold

## 1. เป้าหมาย
วางของกลางที่ทุกหน้าต้องใช้ ให้ทีมทำงานคู่ขนานได้โดยไม่ชนกัน: บทบาท creator ครบวงจร, ตาราง Studio, ตัวเขียน activity log, การเข้ารหัสรหัสผ่าน และปิดช่องโหว่ที่ห้ามขึ้น production

## 2. ขอบเขต
- ทำ:
  1. **Role creator ครบวงจร:** API `POST /api/admin/users`, `PUT /api/admin/users/[id]` รับค่า `creator` (ตอนนี้บังคับเป็น admin/user) • dropdown role และตัวกรองในหน้า `/admin/users` • สถิติจำนวน creator • `context/AuthContext.tsx` รองรับ creator • ลิงก์ "Creator Studio" ใน header ของ admin และ creator
  2. **Migration framework** (เดิม OPS-07): โฟลเดอร์ `db/migrations/`, ตาราง `schema_migrations`, คำสั่ง `npm run migrate` ที่รันเฉพาะไฟล์ใหม่ แล้วย้าย DDL ใน `lib/db.ts` (`ensureDatabaseSchema`) มาเป็น migration แรก และเลิกรันทุก request
  3. **Migration ของ Studio:** ตามร่าง `docs/specs/00-data-model.md` เป็นไฟล์ `db/migrations/0xx_*.sql`
  4. **`lib/activity.ts`:** `logActivity({ actor, action, targetType, targetId, detail, request })` ห้ามโยน error ใส่ผู้เรียก (log พังต้องไม่ทำให้งานหลักพัง) และ export รายชื่อ action กลาง
  5. **`lib/crypto.ts`:** `encryptSecret()` / `decryptSecret()` ด้วย AES-256-GCM จาก `STUDIO_SECRET_KEY` ใช้กับรหัสผ่าน data connection (และต่อไปกับ API key ของ LLM)
  6. **API helper:** `jsonError(message, status)` และ `parseJsonBody()` พร้อม validate ขนาด เพื่อให้ทุกหน้าตอบ error รูปแบบเดียวกัน
  7. **ปิดช่องโหว่ก่อนขึ้น production:** ไม่ใช้ JWT secret สำรองในโค้ด (เดิม PLAT-09), ตรวจ `redirect` ใน login ให้เป็น path ภายใน (PLAT-11), ตรวจ `is_active` ของผู้ใช้ใน `getSession()` (PLAT-10)
  8. **Environment:** อัปเดต `example.env`, เอกสารตั้งค่า staging และ production
- ไม่ทำ: UI ของหน้า Studio ใดๆ, engine ค้นหา (CORE-02)

## 3. หน้าจอ
- `/admin/users`: dropdown role มี Admin / Creator / User ป้ายสี creator แยกจาก user
- Header: admin และ creator เห็นปุ่มไป `/studio`

## 4. API
| Method | Path | สิทธิ์ | เปลี่ยนอะไร |
|---|---|---|---|
| POST | `/api/admin/users` | admin | รับ `role: 'admin' \| 'creator' \| 'user'` |
| PUT | `/api/admin/users/[id]` | admin | รับ creator, เขียน activity `user.role_change` |
| GET | `/api/admin/users?role=creator` | admin | กรอง creator ได้ |

## 5. ข้อมูล
- migration ทั้งชุดจาก `00-data-model.md` • `users.role` เป็น VARCHAR อยู่แล้ว ไม่ต้องแก้คอลัมน์ เพิ่ม CHECK ได้

## 6. สิทธิ์และความปลอดภัย
- `requireRole(['admin','creator'])` สำหรับ `/api/studio/**`, `requireAdmin()` สำหรับ `/api/admin/**`
- `STUDIO_SECRET_KEY` ห้าม commit; ถ้าไม่ได้ตั้ง ระบบต้อง error ตอนเริ่ม ไม่ใช่ใช้ค่าสำรอง
- migration ห้ามรันกับ DB ใน `.env` ของทีม ใช้ DB staging แยก

## 7. Acceptance criteria และกรณีทดสอบ
| # | เกณฑ์ | วิธีทดสอบ | ผลที่คาด |
|---|---|---|---|
| 1 | admin ตั้งผู้ใช้เป็น creator ได้ | แก้ role ในหน้า users | user login ใหม่แล้วเข้า `/studio` ได้ |
| 2 | user เข้า `/studio` ไม่ได้ | login เป็น user แล้วเปิด `/studio` | ไปหน้า `/forbidden` |
| 3 | creator เข้า `/admin` ไม่ได้ | login เป็น creator แล้วเปิด `/admin/dashboard` | `/forbidden` |
| 4 | `npm run migrate` รันซ้ำได้ | รัน 2 ครั้งบน DB ว่าง | ครั้งที่ 2 ไม่มีอะไรเปลี่ยน |
| 5 | logActivity ไม่ทำให้งานพัง | ปิดตาราง activity_logs ชั่วคราว | API หลักยังตอบปกติ, มี error ใน server log |
| 6 | รหัสผ่านถูกเข้ารหัส | ดูค่าใน `data_connections.password_encrypted` | ไม่ใช่ข้อความเดิม และถอดกลับได้ |
| 7 | redirect ปลอดภัย | `/login?redirect=https://evil.example` | login แล้วไปหน้า default ไม่ออกนอกเว็บ |

## 8. ไฟล์ที่เป็นเจ้าของ
`lib/auth.ts`, `middleware.ts`, `lib/db.ts`, `lib/activity.ts`, `lib/crypto.ts`, `lib/api.ts`, `lib/studio/types.ts`, `db/migrations/**`, `scripts/**`, `components/studio/StudioShell.tsx`, `components/common/**`, `context/AuthContext.tsx`, `app/api/admin/users/**`, `components/admin/AdminUser*.tsx`, `example.env`

## 9. Activity log ที่ต้องเขียน
`auth.login`, `auth.login_failed`, `auth.logout`, `user.create`, `user.update`, `user.role_change`, `user.delete`

## 10. คำถามที่ยังเปิด
- staging และ production deploy ที่ไหน (VM, Docker, cloud) และใครถือ secret
- เปิด pgvector บน DB staging ได้ไหม หรือจะใช้ Qdrant (ดู Open Decisions)
