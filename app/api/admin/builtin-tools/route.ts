import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { ensureDatabaseSchema } from '@/lib/db';
import { listActiveSkills } from '@/lib/skills';
import { BUILTIN_TOOLS } from '@/lib/builtin-tools';

/**
 * GET /api/admin/builtin-tools
 * Built-in tools straight from the code registry (they are not stored in the DB).
 * Definitions are rendered with every active skill, as an admin test run sees them.
 */
export async function GET() {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const ctx = { skills: await listActiveSkills() };
    const tools = Object.values(BUILTIN_TOOLS).map((tool) => {
      const definition = tool.definition(ctx);
      return {
        name: tool.name,
        label: tool.label,
        description: definition?.function.description ?? '',
        input_schema: definition?.function.parameters ?? { type: 'object', properties: {} },
        // load_skill is left out of chats while there are no skills to load
        available: definition !== null,
      };
    });

    return NextResponse.json({ tools });
  } catch (error: any) {
    console.error('Fetch built-in tools error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการโหลด Built-in Tools' }, { status: 500 });
  }
}
