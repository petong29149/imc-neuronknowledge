import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { ensureDatabaseSchema } from '@/lib/db';
import { resolveEndpointUrl, getLLMHeaders } from '@/lib/llm-utils';

async function requireAdmin() {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized', status: 401 };
  if (session.role !== 'admin') return { error: 'Forbidden', status: 403 };
  return { error: null, status: 200 };
}

/**
 * POST /api/admin/llm-connections/test
 * Test connectivity to an LLM endpoint
 */
export async function POST(request: Request) {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { base_url, api_key, provider = 'openai' } = await request.json();

    if (!base_url) {
      return NextResponse.json({ error: 'กรุณาระบุ Base URL' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const testUrl = resolveEndpointUrl(base_url, provider, 'models');
      const headers = getLLMHeaders(api_key, provider);

      const res = await fetch(testUrl, {
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        return NextResponse.json(
          {
            success: false,
            error: `HTTP ${res.status}: ${errorText.substring(0, 300) || res.statusText}`,
            requestedUrl: testUrl,
          },
          { status: 200 }
        );
      }

      const data = await res.json();

      // Extract model list gracefully from various response formats
      let models: { id: string; name: string }[] = [];

      if (provider === 'ollama' && Array.isArray(data.models)) {
        models = data.models.map((m: any) => ({
          id: m.name || m.model || String(m),
          name: m.name || m.model || String(m),
        }));
      } else {
        const rawList = Array.isArray(data.data)
          ? data.data
          : Array.isArray(data.models)
          ? data.models
          : Array.isArray(data)
          ? data
          : [];

        models = rawList.map((m: any) => ({
          id: m.id || m.name || String(m),
          name: m.name || m.id || String(m),
        }));
      }

      return NextResponse.json({
        success: true,
        models,
        modelCount: models.length,
      });
    } catch (fetchError: any) {
      clearTimeout(timeout);
      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          { success: false, error: 'Connection timed out (10s)' },
          { status: 200 }
        );
      }
      return NextResponse.json(
        { success: false, error: `Connection failed: ${fetchError.message}` },
        { status: 200 }
      );
    }
  } catch (error: any) {
    console.error('Test connection error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
