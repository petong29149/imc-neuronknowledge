import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { query, ensureDatabaseSchema } from '@/lib/db';
import { parseIdList, replaceAgentBindings } from '@/lib/agents';
import { validateAgentInput } from '@/lib/agent-validation';

/**
 * PUT /api/admin/agents/[id]
 * Partial update. Each of skill_ids / tool_ids / group_ids that is sent replaces
 * that whole binding list.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const agentId = parseInt(id, 10);
    if (isNaN(agentId)) {
      return NextResponse.json({ error: 'รหัส agent ไม่ถูกต้อง' }, { status: 400 });
    }

    const existing = await query('SELECT id, is_default FROM agents WHERE id = $1', [agentId]);
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบ agent นี้ในระบบ' }, { status: 404 });
    }

    const body = await request.json();
    const validationError = validateAgentInput(body, true);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    if (body.slug !== undefined) {
      const dupe = await query('SELECT id FROM agents WHERE slug = $1 AND id != $2 LIMIT 1', [
        body.slug.trim(),
        agentId,
      ]);
      if (dupe.rows.length > 0) {
        return NextResponse.json(
          { error: `slug "${body.slug.trim()}" ถูกใช้งานโดย agent อื่นแล้ว` },
          { status: 409 }
        );
      }
    }

    // There is always exactly one default agent: it moves, it is never just unset
    if (body.is_default === false && existing.rows[0].is_default) {
      return NextResponse.json(
        { error: 'ต้องมี agent เริ่มต้นเสมอ กรุณาตั้ง agent อื่นเป็นค่าเริ่มต้นแทน' },
        { status: 400 }
      );
    }
    if (body.is_default === true) {
      await query(
        'UPDATE agents SET is_default = false, updated_at = NOW() WHERE is_default AND id != $1',
        [agentId]
      );
    }

    const updates: string[] = [];
    const values: any[] = [];
    const set = (column: string, value: unknown) => {
      values.push(value);
      updates.push(`${column} = $${values.length}`);
    };
    if (body.slug !== undefined) set('slug', body.slug.trim());
    if (body.name !== undefined) set('name', body.name.trim());
    if (body.description !== undefined) set('description', String(body.description || '').trim());
    if (body.icon !== undefined) set('icon', String(body.icon || '').trim() || '🤖');
    if (body.system_prompt !== undefined) set('system_prompt', String(body.system_prompt).trim());
    if (body.default_model_id !== undefined) {
      set('default_model_id', body.default_model_id ? parseInt(body.default_model_id, 10) : null);
    }
    if (body.is_active !== undefined) set('is_active', Boolean(body.is_active));
    if (body.is_default !== undefined) set('is_default', Boolean(body.is_default));
    updates.push('updated_at = NOW()');
    values.push(agentId);

    const result = await query(
      `UPDATE agents SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );

    await replaceAgentBindings(agentId, {
      skill_ids: parseIdList(body.skill_ids),
      tool_ids: parseIdList(body.tool_ids),
      group_ids: parseIdList(body.group_ids),
    });

    return NextResponse.json({ message: 'อัปเดต agent เรียบร้อยแล้ว', agent: result.rows[0] });
  } catch (error: any) {
    console.error('Update agent error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการอัปเดต agent' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/agents/[id]
 * Chats started with the agent keep their history and fall back to the default agent.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const agentId = parseInt(id, 10);
    if (isNaN(agentId)) {
      return NextResponse.json({ error: 'รหัส agent ไม่ถูกต้อง' }, { status: 400 });
    }

    const agentRes = await query('SELECT name, is_default FROM agents WHERE id = $1', [agentId]);
    if (agentRes.rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบ agent นี้ในระบบ' }, { status: 404 });
    }
    if (agentRes.rows[0].is_default) {
      return NextResponse.json(
        { error: 'ไม่สามารถลบ agent เริ่มต้นได้ กรุณาตั้ง agent อื่นเป็นค่าเริ่มต้นก่อน' },
        { status: 400 }
      );
    }

    await query('DELETE FROM agents WHERE id = $1', [agentId]);

    return NextResponse.json({
      message: `ลบ agent "${agentRes.rows[0].name}" เรียบร้อยแล้ว`,
      deletedId: agentId,
    });
  } catch (error: any) {
    console.error('Delete agent error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการลบ agent' }, { status: 500 });
  }
}
