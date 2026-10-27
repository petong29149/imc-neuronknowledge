import { NextResponse } from 'next/server';
import { updateCatalogTable } from '@/lib/studio/connections/catalog';
import { parseId, readJson, withStudio } from '@/lib/studio/connections/http';

/** PUT /api/studio/connections/[id]/catalog/tables/[tableId] — { enabled?, description?, synonyms?, sampleQuestions?, status? } */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string; tableId: string }> }) {
  return withStudio(async (session) => {
    const { id, tableId } = await params;
    const table = await updateCatalogTable(session, parseId(id), parseId(tableId), await readJson(request), request);
    return NextResponse.json({ table });
  });
}
