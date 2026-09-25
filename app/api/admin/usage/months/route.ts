import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { ensureDatabaseSchema } from '@/lib/db';
import { getUsageMonths } from '@/lib/usage';

/**
 * GET /api/admin/usage/months
 * Months that have usage data (for the report download picker)
 */
export async function GET() {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const months = await getUsageMonths();
    return NextResponse.json({ months });
  } catch (error) {
    console.error('Fetch usage months error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการโหลดรายการเดือน' },
      { status: 500 }
    );
  }
}
