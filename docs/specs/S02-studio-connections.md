# Spec: Data Connections (S02)

- ผู้ใช้: Creator, Admin • Route: `/studio/connections` • Branch: `page/studio-connections` → PR เข้า `staging`
- ขึ้นกับ: CORE-01 (`lib/crypto.ts`, ตาราง `data_connections`) • หน้าที่รอ: S03 (เลือกตารางจาก connection)

## 1. เป้าหมาย
creator สร้างการเชื่อมต่อไปยัง database ภายนอกได้เอง ทดสอบว่าใช้ได้และปลอดภัย แล้วดู schema แบบง่ายเพื่อเลือกตารางไปใช้ใน Knowledge Set

## 2. ขอบเขต
- ทำ:
  1. รายการ connection: ชื่อ, ประเภท, host, สถานะ (ยังไม่ทดสอบ / ใช้ได้ / ผิดพลาด), ทดสอบล่าสุด, ใช้อยู่ใน Knowledge Set กี่ชุด
  2. ฟอร์มสร้าง/แก้ไข (modal): ประเภท (PostgreSQL, MySQL, SQL Server), host, port (เติมค่าเริ่มต้นตามประเภท), database, username, password, SSL
  3. ปุ่ม **ทดสอบการเชื่อมต่อ**: ต่อได้ไหม และ **ตรวจว่าเป็นสิทธิ์อ่านอย่างเดียว** (ลองสร้าง temp table หรือตรวจ privilege) ถ้าเขียนได้ให้เตือนสีแดงและไม่ให้บันทึกจนกว่าผู้ใช้ยืนยัน
  4. **ดู schema**: รายการตาราง → กดดูคอลัมน์ (ชื่อ, ชนิด) และตัวอย่าง 5 แถว
  5. ลบ connection (ห้ามลบถ้ามี Knowledge Set ใช้อยู่ ให้บอกว่าชุดไหน)
- ไม่ทำ: ดึงข้อมูลเข้า index (CORE-02 ผ่าน S03), connection แบบ SSH tunnel (หลัง Expo), ฐานข้อมูลแบบ NoSQL

## 3. หน้าจอ
- รหัสผ่านไม่ถูกส่งกลับมาที่ browser เลย ตอนแก้ไขให้เว้นว่าง = ใช้รหัสเดิม
- error ตอนทดสอบแสดงเป็นภาษาคน เช่น "เชื่อมต่อ host ไม่ได้ ตรวจ firewall" ไม่ใช่ stack trace

## 4. API
| Method | Path | สิทธิ์ | Request / Response |
|---|---|---|---|
| GET | `/api/studio/connections` | creator, admin | `{ connections: DataConnection[] }` |
| POST | `/api/studio/connections` | creator, admin | body ไม่มี id → `{ connection }` |
| PUT | `/api/studio/connections/[id]` | creator, admin | password ว่าง = ไม่เปลี่ยน |
| DELETE | `/api/studio/connections/[id]` | creator, admin | 409 ถ้ามี source ใช้อยู่ |
| POST | `/api/studio/connections/test` | creator, admin | ทดสอบจากค่าในฟอร์ม (ยังไม่บันทึก) → `{ ok, readOnly, error? }` |
| POST | `/api/studio/connections/[id]/test` | creator, admin | ทดสอบ connection ที่บันทึกแล้ว |
| GET | `/api/studio/connections/[id]/schema` | creator, admin | `{ tables: TableSchema[] }` |
| GET | `/api/studio/connections/[id]/preview?table=` | creator, admin | 5 แถวแรก |

## 5. ข้อมูล
`data_connections` (รหัสผ่านผ่าน `encryptSecret()`), อ่าน `knowledge_sources.connection_id` เพื่อนับการใช้งาน • ไลบรารีเชื่อมต่อ: `pg` มีแล้ว ส่วน MySQL / SQL Server ต้องขอ OPS เพิ่มแพ็กเกจ (`mysql2`, `mssql`)

## 6. สิทธิ์และความปลอดภัย
- ป้องกัน SSRF: ห้าม host ที่เป็น localhost, 127.0.0.0/8, 169.254.0.0/16 และ IP ภายในของเซิร์ฟเวอร์เอง (ยกเว้นตั้งค่า allowlist)
- timeout การเชื่อมต่อ 10 วินาที, query preview จำกัด 5 แถว
- ห้าม log connection string หรือรหัสผ่าน

## 7. Acceptance criteria และกรณีทดสอบ
| # | เกณฑ์ | วิธีทดสอบ | ผลที่คาด |
|---|---|---|---|
| 1 | สร้าง PostgreSQL ที่ใช้ได้ | ใส่ค่า DB ทดสอบแบบ read-only | สถานะ "ใช้ได้", readOnly = true |
| 2 | เตือนเมื่อเขียนได้ | ใช้ account ที่เขียนได้ | เตือนสีแดง |
| 3 | รหัสผ่านไม่หลุด | ดู response ของ GET | ไม่มี password, มีแค่ `hasPassword` |
| 4 | host ภายในถูกบล็อก | ใส่ `127.0.0.1` | 400 พร้อมข้อความภาษาไทย |
| 5 | ดู schema ได้ | กดดูตาราง | เห็นคอลัมน์และ 5 แถว |
| 6 | ลบตัวที่ใช้อยู่ไม่ได้ | ลบ connection ที่ผูก source | 409 บอกชื่อ Knowledge Set |

## 8. ไฟล์ที่เป็นเจ้าของ
`app/studio/connections/**`, `components/studio/connections/**`, `app/api/studio/connections/**`, `lib/studio/connections/**` (driver ของแต่ละ DB)

## 9. Activity log ที่ต้องเขียน
`connection.create`, `connection.update`, `connection.delete`, `connection.test`

## 10. คำถามที่ยังเปิด
- เดโม Expo ใช้ DB อะไร ถ้าข้อมูลตัวเลขการค้ามาจาก MCP ของ IMC อยู่แล้ว หน้านี้อาจใช้แค่ PostgreSQL ก่อน
