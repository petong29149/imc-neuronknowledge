# WEB — Landing Site

หน้า landing และส่วนประกอบหน้าเว็บสาธารณะ

| | |
|---|---|
| Branch ของกลุ่ม | `group/landing` |
| Branch ของการ์ด | `feat/landing/<ID>-<slug>` หรือ `fix/landing/<ID>-<slug>` |
| ทีม | Team 9 |
| ช่วงเลข migration | ไม่มี (ไม่แตะ DB) |
| สถานะการ์ด | Miro Feature Tracker แถว "WEB Landing" — https://miro.com/app/board/uXjVEXm3whU=/ |

## ไฟล์ที่กลุ่มนี้ดูแล (ตรงกับ `.github/CODEOWNERS`)
- `app/page.tsx`
- `components/landing/`
- `components/common/Navbar.tsx`
- `components/common/Footer.tsx`
- `components/common/ScrollReveal.tsx`
- `public/`

## ตารางใน DB
- ไม่มี (contact form ยังไม่ได้ส่งข้อมูลไปไหน — WEB-04)

## API Route
- ไม่มี

## หน้าจอ
- `/`

## ฟีเจอร์ที่มีแล้ว (จากการตรวจโค้ด 2026-10-20)
- WEB-01 Landing sections — Hero, Pillars, Knowledge Flow, Library, Comparison (ข้อมูล static)
- WEB-02 Navbar + Footer — Navbar เปลี่ยนตามสถานะ login
- WEB-03 Harness simulator demo — จำลองคำตอบและ citation ทั้งหมด ไม่ได้เรียก backend

## การ์ดที่ยังเปิดอยู่ (ภาพ ณ 2026-10-20 — สถานะล่าสุดดูใน Miro)
| ID | งาน | สถานะ | Priority | Phase |
|---|---|---|---|---|
| WEB-04 | Contact form | Partial | P1 | Phase 0 |
| WEB-05 | Align marketing claims with real features | Not Started | P1 | Phase 0 |
| WEB-06 | Remove dead TechStack section + broken links | Not Started | P2 | Phase 3 |
| WEB-07 | Optimize large images | Not Started | P2 | Phase 3 |
