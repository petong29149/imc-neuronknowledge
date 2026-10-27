import { NextResponse } from 'next/server';
import { updateCatalogColumn } from '@/lib/studio/connections/catalog';
import { parseId, readJson, withStudio } from '@/lib/studio/connections/http';

/** PUT /api/studio/connections/[id]/catalog/columns/[columnId] — { enabled?, isPii?, description?, exampleValues?, status? } */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string; columnId: string }> }) {
  return withStudio(async (session) => {
    const { id, columnId } = await params;
    const table = await updateCatalogColumn(session, parseId(id), parseId(columnId), await readJson(request), request);
    return NextResponse.json({ table });
  });
}
