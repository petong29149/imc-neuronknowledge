import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { query, ensureDatabaseSchema } from '@/lib/db';
import { parseIdList, replaceAgentBindings } from '@/lib/agents';
import { validateAgentInput } from '@/lib/agent-validation';

/**
 * GET /api/admin/agents
 * Every agent with its bound skill / MCP tool / group ids and chat count.
 */
export async function GET() {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const result = await query(`
      SELECT a.*,
        m.display_name AS default_model_name,
        COALESCE((SELECT ARRAY_AGG(skill_id ORDER BY skill_id) FROM agent_skills WHERE agent_id = a.id), '{}') AS skill_ids,
        COALESCE((SELECT ARRAY_AGG(mcp_tool_id ORDER BY mcp_tool_id) FROM agent_tools WHERE agent_id = a.id), '{}') AS tool_ids,
        COALESCE((SELECT ARRAY_AGG(group_id ORDER BY group_id) FROM agent_groups WHERE agent_id = a.id), '{}') AS group_ids,
        (SELECT COUNT(*) FROM chats c WHERE c.agent_id = a.id)::int AS chat_count
      FROM agents a
      LEFT JOIN models m ON m.id = a.default_model_id
      ORDER BY a.is_default DESC, a.name ASC
    `);

    return NextResponse.json({ agents: result.rows });
  } catch (error: any) {
    console.error('Fetch agents error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการโหลดข้อมูล Agents' }, { status: 500 });
  }
}

/**
 * POST /api/admin/agents
 * Create an agent together with its skill / tool / group bindings.
 */
export async function POST(request: Request) {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const validationError = validateAgentInput(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const slug = body.slug.trim();
    const existing = await query('SELECT id FROM agents WHERE slug = $1 LIMIT 1', [slug]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: `slug "${slug}" ถูกใช้งานแล้ว` }, { status: 409 });
    }

    // Only one default: clear the old one before inserting (partial unique index)
    const isDefault = Boolean(body.is_default);
    if (isDefault) {
      await query('UPDATE agents SET is_default = false, updated_at = NOW() WHERE is_default');
    }

    const result = await query(
      `INSERT INTO agents (slug, name, description, icon, system_prompt, default_model_id,
                           is_active, is_default, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING *`,
      [
        slug,
        body.name.trim(),
        String(body.description || '').trim(),
        String(body.icon || '').trim() || '🤖',
        String(body.system_prompt || '').trim(),
        body.default_model_id ? parseInt(body.default_model_id, 10) : null,
        body.is_active === undefined ? true : Boolean(body.is_active),
        isDefault,
        auth.session?.id ?? null,
      ]
    );
    const agent = result.rows[0];

    await replaceAgentBindings(agent.id, {
      skill_ids: parseIdList(body.skill_ids) ?? [],
      tool_ids: parseIdList(body.tool_ids) ?? [],
      group_ids: parseIdList(body.group_ids) ?? [],
    });

    return NextResponse.json(
      { message: `สร้าง agent "${agent.name}" เรียบร้อยแล้ว`, agent },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create agent error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการสร้าง agent' }, { status: 500 });
  }
}
