# Spec: Activity Log (A01)

- ผู้ใช้: Admin • Route: `/admin/activity` (แท็บ "ประวัติการใช้งาน" ใน admin console) • Branch: `page/admin-activity` → PR เข้า `staging`
- ขึ้นกับ: CORE-01 (ตาราง `activity_logs` และ `logActivity()`) • ข้อมูลมาจากทุกหน้าที่เขียน log

## 1. เป้าหมาย
admin ตรวจย้อนได้ว่าใคร (user, creator, admin) ทำอะไร กับอะไร เมื่อไร เพื่อดูแลความปลอดภัยและตอบคำถามเมื่อเกิดปัญหา

## 2. ขอบเขต
- ทำ:
  1. ตารางประวัติ: เวลา, ผู้กระทำ (ชื่อ + บทบาท), การกระทำ (ข้อความภาษาไทยจากชื่อ action), เป้าหมาย (ลิงก์ไปหน้าของสิ่งนั้นถ้ายังอยู่), IP
  2. ตัวกรอง: ช่วงเวลา, บทบาท, ผู้ใช้, กลุ่มการกระทำ (เข้าสู่ระบบ, ผู้ใช้, แหล่งข้อมูล, Knowledge Set, use case, agent, การทดสอบ, ระบบ), ค้นหา
  3. ดูรายละเอียด (`detail`) ของแต่ละรายการแบบอ่านง่าย
  4. Export CSV ตามตัวกรอง (สูงสุด 10,000 แถว)
  5. การ์ดสรุป: login ล้มเหลวใน 24 ชม., การเปลี่ยนบทบาทล่าสุด, การเผยแพร่ agent ล่าสุด
- ไม่ทำ: แก้หรือลบ log (append-only), เนื้อหาคำถามของผู้ใช้ (ดูได้ที่ usage/แชท ตามนโยบาย PDPA)

## 3. หน้าจอ
แบ่งหน้าแบบ cursor (โหลดเพิ่ม) เรียงใหม่สุดก่อน

## 4. API
| Method | Path | สิทธิ์ | หมายเหตุ |
|---|---|---|---|
| GET | `/api/admin/activity?from=&to=&role=&actorId=&group=&q=&cursor=&limit=` | admin | `{ items: ActivityLog[], nextCursor }` limit สูงสุด 100 |
| GET | `/api/admin/activity/export?...` | admin | CSV (BOM สำหรับ Excel ภาษาไทย) |
| GET | `/api/admin/activity/summary` | admin | การ์ดสรุป |

## 5. ข้อมูล
อ่าน: `activity_logs`, `users` • type: `ActivityLog`

## รายการ action กลาง (ทุกหน้าต้องใช้ชื่อเหล่านี้)
| กลุ่ม | action |
|---|---|
| เข้าสู่ระบบ | `auth.login`, `auth.login_failed`, `auth.logout` |
| ผู้ใช้ | `user.create`, `user.update`, `user.role_change`, `user.delete` |
| แหล่งข้อมูล | `connection.create`, `connection.update`, `connection.delete`, `connection.test` |
| Knowledge Set | `knowledge_set.create`, `knowledge_set.update`, `knowledge_set.delete`, `knowledge_set.build`, `source.add`, `source.remove`, `job.index`, `job.reindex`, `job.failed` |
| Use case | `use_case.create`, `use_case.update`, `use_case.delete`, `example.import` |
| Agent | `agent.create`, `agent.update`, `agent.archive`, `agent.publish`, `agent.unpublish`, `prompt.version_create`, `prompt.version_activate` |
| การทดสอบ | `eval.run`, `eval.cancel` |
| ระบบ | `settings.update`, `llm.update`, `mcp.update`, `api_key.create`, `api_key.revoke`, `chat.feedback` |

## 6. สิทธิ์และความปลอดภัย
- `requireAdmin()` • log ของการเปิดหน้านี้เองก็ต้องถูกบันทึก (`activity.export` เมื่อ export)
- นโยบายเก็บข้อมูล: ค่าเริ่มต้น 1 ปี (ยืนยันกับฝ่ายกฎหมาย)

## 7. Acceptance criteria และกรณีทดสอบ
| # | เกณฑ์ | วิธีทดสอบ | ผลที่คาด |
|---|---|---|---|
| 1 | เห็นการกระทำของ creator | creator สร้าง Knowledge Set | ขึ้นในรายการพร้อมลิงก์ |
| 2 | กรองตามบทบาท | เลือกบทบาท creator | เห็นเฉพาะ creator |
| 3 | login ล้มเหลวถูกบันทึก | ใส่รหัสผิด 3 ครั้ง | การ์ดสรุปแสดง 3 |
| 4 | export ภาษาไทยไม่เพี้ยน | เปิด CSV ใน Excel | อ่านภาษาไทยได้ |
| 5 | ไม่มีข้อมูลลับใน log | ดู detail ของ connection.create | ไม่มีรหัสผ่าน |

## 8. ไฟล์ที่เป็นเจ้าของ
`app/admin/activity/**`, `components/admin/activity/**`, `app/api/admin/activity/**`

## 9. Activity log ที่ต้องเขียน
`activity.export`

## 10. คำถามที่ยังเปิด
- ระยะเวลาเก็บ log และใครเข้าถึงได้ตามนโยบาย PDPA ขององค์กร
