# Spec: Channels (CORE-03)

- ผู้ใช้: ระบบภายนอกของลูกค้า • Branch: `core/channels` → PR เข้า `staging` • เจ้าของ: Channels team
- ขึ้นกับ: CORE-01, CORE-02 • หน้าที่ใช้ผล: P02 (แสดงวิธีเรียกใช้)
- กำหนดเวลา: LINE ให้ทันเดโม AI Expo ถ้าทำได้ ที่เหลือหลัง Expo

## 1. เป้าหมาย
ให้ลูกค้าเรียก agent ที่เผยแพร่แล้วจากระบบของตัวเองได้ 3 ทาง โดยใช้ agent runtime เดียวกับหน้าแชท

## 2. ขอบเขต
- ทำ:
  1. **API key:** ตาราง `api_keys` (เก็บ hash เท่านั้น แสดงตัวเต็มครั้งเดียวตอนสร้าง), ผูกกับผู้ใช้และรายชื่อ agent ที่อนุญาต, หน้าออก key อยู่ใน P02
  2. **OpenAI-compatible API:** `POST /api/v1/chat/completions` (`model` = slug ของ agent, รองรับ `stream: true`), `GET /api/v1/models` คืน agent ที่ key ใช้ได้
  3. **MCP server ของเรา:** เปิด tool `search_knowledge` และ `ask_agent` ผ่าน Streamable HTTP ที่ `/api/mcp`
  4. **LINE OA:** webhook `/api/channels/line/[agentSlug]` ตรวจ signature, ตอบด้วย agent ตัวนั้น, จำบทสนทนาต่อผู้ใช้ LINE
- ไม่ทำ: Teams / Slack, คิดเงิน, rate limit แยกตามแพ็กเกจ (หลัง Expo)

## 3. หน้าจอ
ไม่มีหน้าของตัวเอง ข้อมูลช่องทางแสดงใน P02

## 4. API
| Method | Path | สิทธิ์ | หมายเหตุ |
|---|---|---|---|
| POST | `/api/v1/chat/completions` | API key | รูปแบบ request/response เหมือน OpenAI |
| GET | `/api/v1/models` | API key | agent ที่ key ใช้ได้ |
| POST | `/api/mcp` | API key | MCP Streamable HTTP |
| POST | `/api/channels/line/[agentSlug]` | LINE signature | webhook |
| GET/POST/DELETE | `/api/agents/keys` | login | ผู้ใช้จัดการ key ของตัวเอง (UI ใน P02) |

## 5. ข้อมูล
เสนอเพิ่มใน data model: `api_keys (id, user_id, name, key_hash, key_prefix, agent_ids INT[], last_used_at, revoked_at, created_at)`, `channel_sessions (id, channel, external_user_id, agent_id, chat_id)`

## 6. สิทธิ์และความปลอดภัย
- key เก็บเป็น hash, ส่งใน header `Authorization: Bearer` เท่านั้น ห้ามใน URL
- จำกัดอัตราเรียกต่อ key, error ไม่เปิดเผยรายละเอียด provider
- LINE channel secret เก็บเข้ารหัสด้วย `lib/crypto.ts`

## 7. Acceptance criteria และกรณีทดสอบ
| # | เกณฑ์ | วิธีทดสอบ | ผลที่คาด |
|---|---|---|---|
| 1 | เรียกด้วย OpenAI SDK ได้ | ตั้ง base_url มาที่ระบบ เรียก chat.completions | ได้คำตอบของ agent |
| 2 | key ใช้ได้เฉพาะ agent ที่อนุญาต | เรียก model อื่น | 403 |
| 3 | MCP client เชื่อมได้ | เพิ่มใน Claude Desktop / MCP Inspector | เห็น tool และเรียกได้ |
| 4 | LINE ตอบได้ | ส่งข้อความใน LINE OA ทดสอบ | ได้คำตอบภายในเวลาที่ LINE กำหนด |

## 8. ไฟล์ที่เป็นเจ้าของ
`app/api/v1/**`, `app/api/mcp/**`, `app/api/channels/**`, `app/api/agents/keys/**`, `lib/channels/**`, `lib/api-keys.ts`

## 9. Activity log ที่ต้องเขียน
`api_key.create`, `api_key.revoke`, `channel.line_connect` (ไม่ log ทุกคำถาม เพื่อไม่ให้ตารางโตเกินไป ใช้สถิติ usage แทน)

## 10. คำถามที่ยังเปิด
- LINE OA สำหรับเดโมใช้บัญชีไหน • ลูกค้าแต่ละรายใช้ LINE OA ของตัวเองหรือของ IMC
