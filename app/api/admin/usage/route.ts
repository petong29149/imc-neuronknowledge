import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { ensureDatabaseSchema } from '@/lib/db';
import { getUsageStats } from '@/lib/usage';
import { USAGE_PERIODS, type UsagePeriod } from '@/lib/usage-types';

/**
 * GET /api/admin/usage?period=today|week|month|all
 * Usage dashboard statistics for the selected period
 */
export async function GET(request: Request) {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const periodParam = searchParams.get('period') || 'month';
    if (!USAGE_PERIODS.includes(periodParam as UsagePeriod)) {
      return NextResponse.json({ error: 'ช่วงเวลาไม่ถูกต้อง' }, { status: 400 });
    }

    const stats = await getUsageStats(periodParam as UsagePeriod);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Fetch usage stats error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการโหลดข้อมูลสถิติการใช้งาน' },
      { status: 500 }
    );
  }
}
