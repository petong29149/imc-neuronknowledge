import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { ensureDatabaseSchema } from '@/lib/db';
import { getMonthlyUsageReport } from '@/lib/usage';
import { buildUsageCsv, buildUsageXlsx, exportFileName } from '@/lib/usage-export';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const MAX_MONTHS = 36;

/**
 * GET /api/admin/usage/export?months=2026-08,2026-09&format=csv|xlsx
 * Per-user usage summary for the selected months as a downloadable file
 */
export async function GET(request: Request) {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'xlsx';
    if (format !== 'csv' && format !== 'xlsx') {
      return NextResponse.json({ error: 'รูปแบบไฟล์ไม่ถูกต้อง' }, { status: 400 });
    }

    const months = [
      ...new Set(
        (searchParams.get('months') || '')
          .split(',')
          .map((m) => m.trim())
          .filter(Boolean)
      ),
    ];
    if (months.length === 0 || months.length > MAX_MONTHS || !months.every((m) => MONTH_PATTERN.test(m))) {
      return NextResponse.json(
        { error: `กรุณาเลือกเดือนที่ต้องการ (1-${MAX_MONTHS} เดือน)` },
        { status: 400 }
      );
    }

    const report = { months, ...(await getMonthlyUsageReport(months)) };
    const fileName = exportFileName(months, format);

    if (format === 'csv') {
      return new Response(buildUsageCsv(report), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    const buffer = await buildUsageXlsx(report);
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Export usage report error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการสร้างไฟล์รายงาน' },
      { status: 500 }
    );
  }
}
