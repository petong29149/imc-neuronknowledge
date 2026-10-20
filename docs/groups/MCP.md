# MCP — MCP Integration

เชื่อมต่อ MCP server, sync และทดสอบ tool ให้ agent ใช้ รวมถึง MCP ข้อมูลการค้าของ IMC (customs_trade_data, gta_trade_data, moc_news) และการดึงข้อมูลลูกค้าจากไฟล์จำนวนมากหรือ database

| | |
|---|---|
| Branch ของกลุ่ม | `group/mcp` |
| Branch ของการ์ด | `feat/mcp/<ID>-<slug>` หรือ `fix/mcp/<ID>-<slug>` |
| ทีม | Team 5 |
| ช่วงเลข migration | 500-599 |
| สถานะการ์ด | Miro Feature Tracker แถว "MCP MCP Integration" — https://miro.com/app/board/uXjVEXm3whU=/ |

## ไฟล์ที่กลุ่มนี้ดูแล (ตรงกับ `.github/CODEOWNERS`)
- `lib/mcp.ts`
- `app/admin/mcp/`
- `components/admin/AdminMCPSection.tsx`
- `app/api/admin/mcp-servers/`
- `app/api/admin/mcp-tools/`
- `app/api/admin/builtin-tools/`

## ตารางใน DB
- mcp_servers
- mcp_tools
- (DB จริงมี mcp_oauth_sessions แต่ยังไม่มีในโค้ด)

## API Route
- `GET, POST /api/admin/mcp-servers`
- `GET, PUT, DELETE /api/admin/mcp-servers/[id]`
- `POST /api/admin/mcp-servers/[id]/sync`
- `GET, PUT /api/admin/mcp-tools`
- `PUT, DELETE /api/admin/mcp-tools/[id]`
- `POST /api/admin/mcp-tools/test-execute`
- `GET /api/admin/builtin-tools`

## หน้าจอ
- `/admin/mcp`

## ฟีเจอร์ที่มีแล้ว (จากการตรวจโค้ด 2026-10-20)
- MCP-01 MCP server CRUD + presets — AdminMCPSection.tsx, preset 6 แบบ
- MCP-02 SSE / Streamable HTTP / stdio — SSE fallback เป็น HTTP อัตโนมัติ (lib/mcp.ts)
- MCP-03 Test and sync tools — POST /api/admin/mcp-servers/[id]/sync
- MCP-04 Tool catalog with JSON schema — ค้นหา กรองตาม server และสถานะ
- MCP-05 Enable / disable tools (single + bulk) — PUT /api/admin/mcp-tools
- MCP-06 Test-execute tool — POST /api/admin/mcp-tools/test-execute
- MCP-07 Run MCP tools from chat — lib/tool-executor.ts timeout 10 นาที
- MCP-08 Built-in tools listing — GET /api/admin/builtin-tools

## การ์ดที่ยังเปิดอยู่ (ภาพ ณ 2026-10-20 — สถานะล่าสุดดูใน Miro)
| ID | งาน | สถานะ | Priority | Phase |
|---|---|---|---|---|
| MCP-09 | Header / env auth for servers | Partial | P1 | Phase 0 |
| MCP-10 | Tool lookup by name only | Partial | P1 | Phase 1 |
| MCP-11 | Remove risky DB preset + limit stdio env | Not Started | P0 | Phase 0 |
| MCP-12 | MCP OAuth | Not Started | P1 | Phase 2 |
| MCP-13 | Remove stale tools on sync | Not Started | P2 | Phase 2 |
| MCP-14 | Connection pooling + cancel on stop | Not Started | P2 | Phase 3 |
| MCP-15 | Connect IMC trade MCP to Import-Export Agent | Not Started | P0 | Phase 1 |
| MCP-16 | File-store sync via MCP | Not Started | P1 | Phase 2 |
| MCP-17 | Database live query via MCP | Not Started | P1 | Phase 2 |
