import { NextResponse, type NextRequest } from 'next/server';
import { parseId, withStudio } from '@/lib/studio/connections/http';
import { getPreview } from '@/lib/studio/connections/service';

/** GET /api/studio/connections/[id]/preview?table=&schema= → first 5 rows { columns, rows } */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withStudio(async (session) => {
    const search = request.nextUrl.searchParams;
    const preview = await getPreview(
      session,
      parseId((await params).id),
      search.get('schema') ?? 'public',
      search.get('table') ?? ''
    );
    return NextResponse.json(preview);
  });
}
