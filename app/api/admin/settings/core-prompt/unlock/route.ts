import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { unlockCorePrompt, lockCorePrompt } from '@/lib/core-prompt-lock';

/**
 * POST /api/admin/settings/core-prompt/unlock
 * Body: { password }. Unlocks editing the core prompt for this admin for a few minutes.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.error || !auth.session) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { password } = await request.json().catch(() => ({}));
    const result = await unlockCorePrompt(auth.session.id, typeof password === 'string' ? password : '');
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ message: 'ปลดล็อกเรียบร้อยแล้ว', unlocked_until: result.expiresAt });
  } catch (error: any) {
    console.error('Unlock core prompt error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการปลดล็อก' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/settings/core-prompt/unlock
 * Lock the core prompt again before the unlock expires.
 */
export async function DELETE() {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  await lockCorePrompt();
  return NextResponse.json({ message: 'ล็อกหลักการทำงานแล้ว' });
}
