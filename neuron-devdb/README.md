# ฐานข้อมูลสำหรับพัฒนา NeuronKnowledge (neuron-devdb)

ชุดนี้สร้าง PostgreSQL ใน Docker ด้วยคำสั่งเดียว ภายในมี **2 database แยกกัน** สำหรับแอป NeuronKnowledge (Next.js) และ Knowledge Engine โดยแต่ละ database มีผู้ใช้ของตัวเอง และ**ผู้ใช้ของฝั่งหนึ่งเข้า database ของอีกฝั่งไม่ได้** ทุกคนในทีมใช้ชื่อผู้ใช้และรหัสผ่านชุดเดียวกันตามไฟล์ `.env`

> ⚠️ **ใช้สำหรับพัฒนาในเครื่องเท่านั้น** รหัสผ่านทั้งหมดอยู่ในไฟล์ `.env` ของชุดนี้ และพอร์ตเปิดเฉพาะ `127.0.0.1` ห้ามนำไปใช้บนเซิร์ฟเวอร์ที่เข้าถึงจากภายนอกได้ และ**ห้ามนำรหัสผ่านชุดนี้ไปใช้กับ staging หรือ production**

| Database | ใช้โดย | ผู้ใช้ | รหัสผ่าน (ใน `.env`) |
|---|---|---|---|
| `imc_neuronknowledge` | แอป Next.js | `nk_app` | `APP_DB_PASSWORD` |
| `knowledge_engine` | Knowledge Engine | `nk_engine` | `ENGINE_DB_PASSWORD` |
| (ทั้งเครื่อง) | ผู้ดูแล | `postgres` | `PG_SUPER_PASSWORD` |

ชุดนี้**สร้างแค่ database และผู้ใช้** ตารางต่าง ๆ แอปจะสร้างเองด้วย `npm run init-db` และ engine สร้างเองด้วย service `migrate`

## ต้องมี
- Docker Desktop (Windows/Mac) หรือ Docker Engine + Compose v2 (Linux)
- พอร์ต `5434` ว่าง (ถ้าไม่ว่าง แก้ `PG_PORT` ใน `.env` ก่อนสั่ง `up`)

## 1. เปิดฐานข้อมูล
```bash
cd neuron-devdb
docker compose up -d
docker compose logs postgres | grep "neuron-devdb"
```
ต้องเห็นข้อความ `[neuron-devdb] databases ready: imc_neuronknowledge (user nk_app), knowledge_engine (user nk_engine)`

| คำสั่ง | ผล |
|---|---|
| `docker compose stop` | หยุดชั่วคราว ข้อมูลยังอยู่ |
| `docker compose start` | เปิดต่อ |
| `docker compose down` | ลบ container แต่เก็บข้อมูลไว้ |
| `docker compose down -v` | **ลบทุกอย่างรวมข้อมูล** ครั้งถัดไปจะสร้าง database ใหม่ |

## 2. ตั้งค่าแอป Next.js (`imc-neuronknowledge/.env`)
แอปรันบนเครื่องโดยตรง จึงใช้ host `127.0.0.1` แทน `<APP_DB_PASSWORD>` ด้วยค่าจาก `.env` ของชุดนี้
```
POSTGRES_URL=postgres://nk_app:<APP_DB_PASSWORD>@127.0.0.1:5434/imc_neuronknowledge
```
> ถ้า `.env` เดิมของคุณชี้ไปที่เซิร์ฟเวอร์ร่วมของทีม ให้เปลี่ยนชื่อไฟล์เดิมเป็น `.env.remote` เก็บไว้ก่อน แล้วสร้าง `.env` ใหม่จาก `example.env` ถ้าจะกลับไปใช้เซิร์ฟเวอร์ร่วมก็สลับไฟล์กลับ

จากนั้นสร้างตารางและข้อมูลเริ่มต้น แล้วเปิดแอป
```bash
npm run init-db
npm run dev
```
ผลจาก `init-db` ที่ถูกต้อง: `current_user: 'nk_app'`, `Skills: 3`, `Agents: 1` · ผู้ที่สมัครสมาชิกคนแรกที่ `/register` จะได้สิทธิ์ admin

## 3. ตั้งค่า Knowledge Engine (`imc-neuronknowledge/knowledge-engine/.env`)
engine รันใน Docker จึงต้องใช้ host `host.docker.internal` (ไม่ใช่ `127.0.0.1`)
```
POSTGRES_URL=postgresql://nk_engine:<ENGINE_DB_PASSWORD>@host.docker.internal:5434/knowledge_engine
POSTGRES_SCHEMA=knowledge
```
จากนั้นเปิด engine (service `migrate` จะสร้างตารางให้เอง)
```bash
cd knowledge-engine
docker compose up -d --build
docker compose logs migrate
```
ต้องเห็น `schema knowledge: applied 001_init.sql, 002_document_metadata.sql` (ครั้งถัดไปจะเป็น `up to date`)

## ต่อด้วยโปรแกรมจัดการฐานข้อมูล (DBeaver / pgAdmin / TablePlus)
Host `127.0.0.1` · Port `5434` · SSL `disable` · ใช้ผู้ใช้และรหัสผ่านตามตารางด้านบน (ใช้ `127.0.0.1` ไม่ใช้ `localhost` เพราะบางเครื่องจะต่อเป็น IPv6)

## โครงสร้างไฟล์
```
docker-compose.yml               PostgreSQL 16 (container nk-neuron-devdb)
.env                             พอร์ต ชื่อ database ผู้ใช้ และรหัสผ่าน
init/postgres/01-databases.sh    สร้าง database + ผู้ใช้ (รันครั้งแรกเท่านั้น เมื่อ volume ยังว่าง)
```
ไฟล์ `.sh` ต้องใช้ line ending แบบ LF ซึ่ง `.gitattributes` บังคับไว้ให้แล้ว ถ้าคัดลอกด้วยวิธีอื่นแล้ว init ไม่ทำงาน ให้แปลงไฟล์เป็น LF ก่อน

## แก้ปัญหา
- **พอร์ต 5434 ถูกใช้อยู่:** แก้ `PG_PORT` ใน `.env` แล้วแก้พอร์ตใน `POSTGRES_URL` ของแอปและ engine ให้ตรงกัน (ชุดทดสอบ `s02-testdb` ใช้ 5433 จึงเปิดพร้อมกันได้)
- **เปลี่ยนรหัสผ่านใน `.env` แล้วไม่มีผล:** สคริปต์ init รันเฉพาะครั้งแรก ให้สั่ง `docker compose down -v` แล้ว `up -d` ใหม่ (ข้อมูลเดิมจะหาย)
- **`permission denied for database`:** ใช้ผู้ใช้ผิดตัว เช่น `nk_engine` ต่อ `imc_neuronknowledge` ตั้งใจให้เป็นแบบนี้ ตรวจ `POSTGRES_URL` อีกครั้ง
- **engine ต่อฐานข้อมูลไม่ได้บน Linux:** ตรวจว่า `knowledge-engine/docker-compose.yml` มี `extra_hosts: ["host.docker.internal:host-gateway"]` (มีอยู่แล้ว)
- **ต่อ `localhost` แล้ว timeout:** เปลี่ยนเป็น `127.0.0.1`
