import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { ensureDatabaseSchema } from '@/lib/db';
import { listOrgsForUser, MAX_FILE_MB } from '@/lib/knowledge';

/**
 * GET /api/knowledge/orgs
 * The organizations the signed-in user may upload to (the page's org picker), plus the upload limit.
 */
export async function GET() {
  try {
    await ensureDatabaseSchema();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' }, { status: 401 });
    }
    return NextResponse.json({ orgs: await listOrgsForUser(session), max_file_mb: MAX_FILE_MB });
  } catch (error) {
    console.error('List knowledge orgs error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการโหลดรายชื่อองค์กร' }, { status: 500 });
  }
}
