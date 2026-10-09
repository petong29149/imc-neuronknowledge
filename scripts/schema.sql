-- Database schema for NeuronKnowledge Agent & Knowledge Base
-- Compatible with PostgreSQL 13+

-- Ensure pgcrypto extension for UUID generation if needed (gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-----------------------------------
----------- 1. users --------------
-----------------------------------
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-----------------------------------
----------- 2. groups -------------
-----------------------------------
CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Case-insensitive uniqueness: "Sales" and "sales" are the same group
CREATE UNIQUE INDEX IF NOT EXISTS idx_groups_name_lower ON groups(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_groups_active ON groups(is_active);

-----------------------------------
-------- 3. group_members ---------
-----------------------------------
CREATE TABLE IF NOT EXISTS group_members (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- 'owner' can be treated as the group lead; everyone else is 'member'
    member_role VARCHAR(50) NOT NULL DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_group_members_group_user ON group_members(group_id, user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);

-----------------------------------
------- 4. llm_connections --------
-----------------------------------
CREATE TABLE IF NOT EXISTS llm_connections (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'openai',
    base_url TEXT NOT NULL,
    api_key TEXT DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    priority INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-----------------------------------
----------- 5. models -------------
-----------------------------------
CREATE TABLE IF NOT EXISTS models (
    id SERIAL PRIMARY KEY,
    connection_id INTEGER REFERENCES llm_connections(id) ON DELETE CASCADE,
    model_id VARCHAR(512) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    context_length INTEGER DEFAULT 4096,
    max_tokens INTEGER DEFAULT 2048,
    temperature REAL DEFAULT 0.7,
    top_p REAL DEFAULT 1.0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_default BOOLEAN NOT NULL DEFAULT false,
    capabilities JSONB DEFAULT '[]',
    supports_tools BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_models_connection ON models(connection_id);
CREATE INDEX IF NOT EXISTS idx_models_active ON models(is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_models_conn_model_id ON models(connection_id, model_id);

-----------------------------------
--------- 6. mcp_servers ----------
-----------------------------------
CREATE TABLE IF NOT EXISTS mcp_servers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    transport_type VARCHAR(50) NOT NULL DEFAULT 'sse',
    url TEXT DEFAULT '',
    command TEXT DEFAULT '',
    args JSONB DEFAULT '[]',
    env JSONB DEFAULT '{}',
    headers JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'untested',
    error_message TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mcp_servers_active ON mcp_servers(is_active);

-----------------------------------
---------- 7. mcp_tools -----------
-----------------------------------
CREATE TABLE IF NOT EXISTS mcp_tools (
    id SERIAL PRIMARY KEY,
    server_id INTEGER REFERENCES mcp_servers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    input_schema JSONB DEFAULT '{}',
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mcp_tools_server ON mcp_tools(server_id);
CREATE INDEX IF NOT EXISTS idx_mcp_tools_enabled ON mcp_tools(is_enabled);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mcp_tools_server_name ON mcp_tools(server_id, name);

-----------------------------------
----------- 8. skills -------------
-----------------------------------
CREATE TABLE IF NOT EXISTS skills (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_skills_active ON skills(is_active);

-----------------------------------
----------- 9. agents -------------
-----------------------------------
CREATE TABLE IF NOT EXISTS agents (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    icon VARCHAR(16) NOT NULL DEFAULT '🤖',
    system_prompt TEXT NOT NULL DEFAULT '',
    default_model_id INTEGER REFERENCES models(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- At most one default agent (used for new chats with no agent picked)
CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_single_default ON agents(is_default) WHERE is_default;

-----------------------------------
-------- 10. agent_skills ---------
-----------------------------------
CREATE TABLE IF NOT EXISTS agent_skills (
    agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    PRIMARY KEY (agent_id, skill_id)
);

-----------------------------------
-------- 11. agent_tools ----------
-----------------------------------
CREATE TABLE IF NOT EXISTS agent_tools (
    agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    mcp_tool_id INTEGER NOT NULL REFERENCES mcp_tools(id) ON DELETE CASCADE,
    PRIMARY KEY (agent_id, mcp_tool_id)
);

-----------------------------------
-------- 12. agent_groups ---------
-----------------------------------
-- An agent with no rows here is open to everyone; otherwise only to members of these groups
CREATE TABLE IF NOT EXISTS agent_groups (
    agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    PRIMARY KEY (agent_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_groups_group ON agent_groups(group_id);

-----------------------------------
----------- 13. chats -------------
-----------------------------------
CREATE TABLE IF NOT EXISTS chats (
    id SERIAL PRIMARY KEY,
    session_id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL DEFAULT 'New Chat',
    model_id INTEGER REFERENCES models(id) ON DELETE SET NULL,
    agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
    system_prompt TEXT DEFAULT '',
    effort_level VARCHAR(50) DEFAULT 'medium',
    tools_enabled BOOLEAN DEFAULT true,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    chat_history JSONB NOT NULL DEFAULT '[]',
    user_message_count INTEGER NOT NULL DEFAULT 0,
    total_input_tokens BIGINT NOT NULL DEFAULT 0,
    total_output_tokens BIGINT NOT NULL DEFAULT 0,
    total_tokens BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chats_session_id ON chats(session_id);
CREATE INDEX IF NOT EXISTS idx_chats_user ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_updated ON chats(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_user_updated ON chats(user_id, updated_at DESC, id DESC);

-----------------------------------
-------- 14. app_settings ---------
-----------------------------------
-- Global key/value settings (persona_prompt, core_prompt)
CREATE TABLE IF NOT EXISTS app_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL DEFAULT '',
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-----------------------------------
------ 15. prompt_revisions -------
-----------------------------------
-- Every saved version of a prompt setting, for audit and rollback
CREATE TABLE IF NOT EXISTS prompt_revisions (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) NOT NULL,
    value TEXT NOT NULL,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prompt_revisions_key ON prompt_revisions(key, created_at DESC);

-----------------------------------
--------- 16. SEED DATA -----------
-----------------------------------
-- Sample skills for initial system setup
INSERT INTO skills (slug, name, description, content)
VALUES
(
    'thai-formal-email',
    'เขียนอีเมล/หนังสือทางการภาษาไทย',
    'ใช้เมื่อผู้ใช้ขอให้ร่างอีเมลทางการ หนังสือเชิญ หนังสือขอความอนุเคราะห์ หรือจดหมายติดต่อหน่วยงานเป็นภาษาไทย',
    '# เขียนอีเมล/หนังสือทางการภาษาไทย

## ขั้นตอน
1. ระบุให้ได้ก่อนว่า ผู้รับเป็นใคร (ตำแหน่ง/หน่วยงาน), วัตถุประสงค์, และสิ่งที่ต้องการให้ผู้รับทำ
   - ถ้าข้อมูลสำคัญขาด (เช่น ชื่อผู้รับ วันที่ สถานที่) ให้ใส่ตัวยึดตำแหน่งแบบ [ชื่อผู้รับ] แทนการเดา
2. เลือกระดับภาษาตามผู้รับ: ผู้บริหาร/หน่วยงานราชการ ใช้ภาษาทางการเต็มรูปแบบ, คู่ค้าทั่วไป ใช้ภาษาสุภาพกึ่งทางการ
3. ร่างตามโครงสร้างด้านล่างเสมอ

## โครงสร้าง
- **เรื่อง:** สั้น กระชับ บอกวัตถุประสงค์ในบรรทัดเดียว
- **เรียน:** ตำแหน่งหรือชื่อผู้รับ (เช่น "เรียน ผู้อำนวยการฝ่ายบุคคล")
- **ย่อหน้าที่ 1 (เหตุ):** ที่มาหรือบริบท ขึ้นต้นด้วย "ด้วย..." หรือ "ตามที่..."
- **ย่อหน้าที่ 2 (ความประสงค์):** สิ่งที่ต้องการ ขึ้นต้นด้วย "ในการนี้..." ระบุวัน เวลา สถานที่ให้ชัด
- **ย่อหน้าที่ 3 (สรุป):** "จึงเรียนมาเพื่อโปรดพิจารณา" / "จึงเรียนมาเพื่อโปรดทราบ" / "จึงเรียนมาเพื่อโปรดให้ความอนุเคราะห์"
- **คำลงท้าย:** "ขอแสดงความนับถือ"
- **ลงชื่อ:** [ชื่อ-นามสกุล] / [ตำแหน่ง] / [ช่องทางติดต่อ]

## ข้อห้าม
- ห้ามใช้ภาษาพูด คำย่อ หรืออีโมจิ
- ห้ามแต่งข้อเท็จจริง ตัวเลข หรือวันที่ที่ผู้ใช้ไม่ได้ให้มา

หลังร่างเสร็จ ให้แจ้งผู้ใช้สั้นๆ ว่ามีตัวยึดตำแหน่งใดบ้างที่ต้องเติม'
),
(
    'meeting-summary',
    'สรุปรายงานการประชุม',
    'ใช้เมื่อผู้ใช้ส่งบันทึก/ถอดเสียงการประชุมมาและต้องการสรุป มติ หรือรายการสิ่งที่ต้องทำ (action items)',
    '# สรุปรายงานการประชุม

## ขั้นตอน
1. อ่านเนื้อหาทั้งหมดก่อน แยก "สิ่งที่หารือ" ออกจาก "สิ่งที่ตกลงแล้ว"
2. action item ทุกข้อต้องมีผู้รับผิดชอบและกำหนดเสร็จ ถ้าต้นฉบับไม่ระบุ ให้เขียนว่า "ยังไม่ระบุ" ห้ามเดา
3. ตอบตาม template ด้านล่างเท่านั้น

## Template
### ข้อมูลการประชุม
- หัวข้อ / วันที่ / ผู้เข้าร่วม (ถ้ามีในต้นฉบับ)

### สรุปภาพรวม
2–3 ประโยค

### ประเด็นที่หารือ
- หัวข้อละ 1–2 บรรทัด

### มติที่ประชุม
1. ...

### Action Items
| # | งาน | ผู้รับผิดชอบ | กำหนดเสร็จ |
|---|-----|-------------|-----------|

### ประเด็นค้าง / ต้องติดตาม
- ...

ถ้าไม่มีข้อมูลในหัวข้อใด ให้เขียน "— ไม่มี —"'
),
(
    'financial-calculation',
    'คำนวณการเงิน (ดอกเบี้ย/ผ่อนชำระ)',
    'ใช้เมื่อผู้ใช้ถามเรื่องดอกเบี้ยทบต้น ค่างวดผ่อนบ้าน/รถ/สินเชื่อ ผลตอบแทนการลงทุน หรือการคำนวณทางการเงินอื่นๆ',
    '# คำนวณการเงิน

## กฎบังคับ
- **ต้องใช้ tool `calculator` สำหรับทุกการคำนวณตัวเลข** ห้ามคิดเลขในหัว แม้เป็นการคำนวณง่ายๆ
- แสดงสูตรและค่าที่แทนก่อนเรียก calculator เสมอ

## สูตรที่ใช้
- **ดอกเบี้ยทบต้น:** FV = P * (1 + r/n)^(n*t)
- **ค่างวดผ่อนชำระ (ลดต้นลดดอก):** PMT = P * (i * (1 + i)^N) / ((1 + i)^N - 1)
  - i = อัตราดอกเบี้ยต่อปี / 12, N = จำนวนงวด (เดือน)
- **ดอกเบี้ยรวมที่จ่าย:** PMT * N - P

## ขั้นตอน
1. สรุปตัวแปรที่ผู้ใช้ให้มา (เงินต้น, อัตราดอกเบี้ย, ระยะเวลา) ถ้าขาดตัวใดให้ถามก่อน
2. แปลงหน่วยให้ตรงกัน (เปอร์เซ็นต์ → ทศนิยม, ปี → เดือน)
3. เรียก calculator ทีละขั้น
4. ตอบเป็นตาราง: รายการ | ค่า — ปัดเศษ 2 ตำแหน่ง และใส่หน่วย "บาท"
5. ปิดท้ายด้วยหมายเหตุว่าเป็นการประมาณการ อัตราจริงขึ้นกับสถาบันการเงิน'
)
ON CONFLICT (slug) DO NOTHING;

-- Default general assistant agent
INSERT INTO agents (slug, name, description, icon, system_prompt, is_default)
VALUES (
    'general-assistant',
    'ผู้ช่วยทั่วไป',
    'ผู้ช่วย AI สำหรับงานทั่วไป ใช้ได้ทุกคน',
    '🤖',
    '',
    true
)
ON CONFLICT (slug) DO NOTHING;

-- Bind default agent to all seeded skills
INSERT INTO agent_skills (agent_id, skill_id)
SELECT a.id, s.id
FROM agents a
CROSS JOIN skills s
WHERE a.slug = 'general-assistant'
ON CONFLICT (agent_id, skill_id) DO NOTHING;

-- Bind default agent to all active MCP tools (if any exist)
INSERT INTO agent_tools (agent_id, mcp_tool_id)
SELECT a.id, t.id
FROM agents a
CROSS JOIN mcp_tools t
WHERE a.slug = 'general-assistant'
ON CONFLICT (agent_id, mcp_tool_id) DO NOTHING;
