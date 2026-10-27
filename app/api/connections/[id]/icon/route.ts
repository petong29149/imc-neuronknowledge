import { getSession } from '@/lib/auth';
import { jsonError } from '@/lib/studio/connections/core-shim';
import { decodeIconDataUrl } from '@/lib/studio/connections/image';
import { findIconData } from '@/lib/studio/connections/repo';

/** GET /api/connections/[id]/icon — uploaded picture (published connections, or the owner / admin) */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return jsonError('กรุณาเข้าสู่ระบบก่อนทำรายการ', 401);
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return jsonError('ไม่พบรูป', 404);

  const dataUrl = await findIconData(session, id);
  const image = dataUrl ? decodeIconDataUrl(dataUrl) : null;
  if (!image) return jsonError('ไม่พบรูป', 404);

  return new Response(new Uint8Array(image.bytes), {
    headers: {
      'Content-Type': image.mime,
      'Cache-Control': 'private, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
      // Even if an SVG slipped past sanitising, it cannot run script or load anything.
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
