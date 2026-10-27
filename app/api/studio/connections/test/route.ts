import { NextResponse } from 'next/server';
import { readJson, withStudio } from '@/lib/studio/connections/http';
import { testFormValues } from '@/lib/studio/connections/service';

/** POST /api/studio/connections/test — tests form values without saving → { ok, readOnly, error? } */
export async function POST(request: Request) {
  return withStudio(async (session) => {
    return NextResponse.json(await testFormValues(session, await readJson(request), request));
  });
}
