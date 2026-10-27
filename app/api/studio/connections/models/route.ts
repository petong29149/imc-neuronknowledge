import { NextResponse } from 'next/server';
import { withStudio } from '@/lib/studio/connections/http';
import { listAiModels } from '@/lib/studio/connections/llm';

/** GET /api/studio/connections/models → { models } active LLM models for drafting and NL→SQL */
export async function GET() {
  return withStudio(async () => NextResponse.json({ models: await listAiModels() }));
}
