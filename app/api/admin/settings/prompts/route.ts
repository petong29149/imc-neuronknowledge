import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { ensureDatabaseSchema } from '@/lib/db';
import {
  getPromptSettings,
  savePromptSetting,
  isPromptSettingKey,
  PROMPT_SETTING_DEFAULTS,
  PROMPT_SETTING_MAX,
} from '@/lib/settings';
import { getCoreUnlockExpiry, isCorePasswordConfigured } from '@/lib/core-prompt-lock';

/**
 * GET /api/admin/settings/prompts
 * Persona and core prompts, plus the core prompt's lock state for this admin.
 * Every admin can read the core prompt; editing it needs the unlock password.
 */
export async function GET() {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAdmin();
    if (auth.error || !auth.session) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    return NextResponse.json({
      settings: await getPromptSettings(),
      defaults: PROMPT_SETTING_DEFAULTS,
      core_password_configured: isCorePasswordConfigured(),
      core_unlocked_until: await getCoreUnlockExpiry(auth.session.id),
    });
  } catch (error: any) {
    console.error('Fetch prompt settings error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการโหลด System Prompt' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/settings/prompts
 * Body: { key: 'persona_prompt' | 'core_prompt', value }. Saving the core prompt
 * requires this admin to have unlocked it with the password.
 */
export async function PUT(request: Request) {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAdmin();
    if (auth.error || !auth.session) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { key, value } = await request.json();
    if (!isPromptSettingKey(key)) {
      return NextResponse.json({ error: 'ไม่รู้จักการตั้งค่านี้' }, { status: 400 });
    }
    if (typeof value !== 'string') {
      return NextResponse.json({ error: 'ข้อความไม่ถูกต้อง' }, { status: 400 });
    }
    const trimmed = value.trim();
    if (trimmed.length > PROMPT_SETTING_MAX) {
      return NextResponse.json(
        { error: `ข้อความต้องยาวไม่เกิน ${PROMPT_SETTING_MAX.toLocaleString()} ตัวอักษร` },
        { status: 400 }
      );
    }
    if (key === 'persona_prompt' && !trimmed) {
      return NextResponse.json({ error: 'กรุณากรอก Persona' }, { status: 400 });
    }

    if (key === 'core_prompt' && !(await getCoreUnlockExpiry(auth.session.id))) {
      return NextResponse.json(
        { error: 'หลักการทำงานถูกล็อกอยู่ กรุณาปลดล็อกด้วยรหัสผ่านก่อนแก้ไข' },
        { status: 403 }
      );
    }

    await savePromptSetting(key, trimmed, auth.session.id);
    return NextResponse.json({
      message: key === 'core_prompt' ? 'บันทึกหลักการทำงานเรียบร้อยแล้ว' : 'บันทึก Persona เรียบร้อยแล้ว',
      settings: await getPromptSettings(),
    });
  } catch (error: any) {
    console.error('Save prompt setting error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการบันทึก System Prompt' }, { status: 500 });
  }
}
