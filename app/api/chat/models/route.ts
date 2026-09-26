import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query, ensureDatabaseSchema } from '@/lib/db';

/**
 * GET /api/chat/models
 * List all active models available for chatting (any authenticated user)
 */
export async function GET() {
  try {
    await ensureDatabaseSchema();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await query(`
      SELECT 
        m.id,
        m.model_id,
        m.display_name,
        m.description,
        m.context_length,
        m.max_tokens,
        m.is_default,
        m.capabilities,
        m.supports_tools,
        c.name as connection_name,
        c.provider as connection_provider
      FROM models m
      JOIN llm_connections c ON c.id = m.connection_id
      WHERE m.is_active = true AND c.is_active = true
      ORDER BY m.is_default DESC, m.display_name ASC
    `);

    return NextResponse.json({ models: result.rows });
  } catch (error: any) {
    console.error('Fetch chat models error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
