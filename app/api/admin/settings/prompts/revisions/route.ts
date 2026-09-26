import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { ensureDatabaseSchema } from '@/lib/db';
import { getPromptRevisions, isPromptSettingKey } from '@/lib/settings';

/**
 * GET /api/admin/settings/prompts/revisions?key=persona_prompt|core_prompt
 * Recent saved versions, newest first. Restoring one is a normal PUT of its value.
 */
export async function GET(request: Request) {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const key = new URL(request.url).searchParams.get('key');
    if (!isPromptSettingKey(key)) {
      return NextResponse.json({ error: 'ไม่รู้จักการตั้งค่านี้' }, { status: 400 });
    }
    return NextResponse.json({ revisions: await getPromptRevisions(key) });
  } catch (error: any) {
    console.error('Fetch prompt revisions error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการโหลดประวัติ' }, { status: 500 });
  }
}
