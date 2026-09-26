import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query, ensureDatabaseSchema } from '@/lib/db';
import { resolveEndpointUrl, getLLMHeaders } from '@/lib/llm-utils';

async function requireAdmin() {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized', status: 401, session: null };
  if (session.role !== 'admin') return { error: 'Forbidden', status: 403, session: null };
  return { error: null, status: 200, session };
}

// In-memory cache for remote endpoint models to keep response times sub-50ms
interface RemoteCacheEntry {
  fetchedAt: number;
  models: { id: string; name: string; context_length?: number; description?: string }[];
}
const remoteCache: Map<number, RemoteCacheEntry> = new Map();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

async function getModelsForConnection(conn: any, forceRefresh: boolean) {
  const cached = remoteCache.get(conn.id);
  const now = Date.now();
  if (!forceRefresh && cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.models;
  }

  try {
    const testUrl = resolveEndpointUrl(conn.base_url, conn.provider, 'models');
    const headers = getLLMHeaders(conn.api_key, conn.provider);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(testUrl, { headers, signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      return cached ? cached.models : [];
    }

    const data = await res.json();
    let rawList: any[] = [];

    if (conn.provider === 'ollama' && Array.isArray(data.models)) {
      rawList = data.models.map((m: any) => ({
        id: m.name || m.model,
        name: m.name || m.model,
        context_length: 4096,
      }));
    } else {
      const list = Array.isArray(data.data)
        ? data.data
        : Array.isArray(data.models)
        ? data.models
        : Array.isArray(data)
        ? data
        : [];

      rawList = list.map((m: any) => ({
        id: m.id || m.name,
        name: m.name || m.id,
        context_length: m.context_length || 4096,
        description: m.description || '',
      }));
    }

    remoteCache.set(conn.id, { fetchedAt: now, models: rawList });
    return rawList;
  } catch (err) {
    console.error(`Error fetching models for connection ${conn.name}:`, err);
    return cached ? cached.models : [];
  }
}

/**
 * GET /api/admin/models
 * Dynamically fetches live models from connection endpoints and overlays
 * saved database records (active / customized models) without bloating the database.
 */
export async function GET(request: Request) {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';
    const connectionId = searchParams.get('connection_id');
    const activeOnly = searchParams.get('active_only') === 'true';

    // 1. Fetch saved models from database
    const dbModelsRes = await query(`
      SELECT 
        m.*,
        c.name as connection_name,
        c.provider as connection_provider,
        c.base_url as connection_base_url,
        c.is_active as connection_is_active
      FROM models m
      JOIN llm_connections c ON c.id = m.connection_id
      ORDER BY m.is_default DESC, m.display_name ASC
    `);
    const dbModels = dbModelsRes.rows;

    // Create lookup map of saved models: `${connection_id}::${model_id}` -> dbModel
    const dbModelMap = new Map<string, any>();
    for (const dbm of dbModels) {
      dbModelMap.set(`${dbm.connection_id}::${dbm.model_id}`, dbm);
    }

    // 2. Fetch active connections
    let connQuery = 'SELECT * FROM llm_connections WHERE is_active = true';
    const connParams: any[] = [];
    if (connectionId) {
      connQuery += ' AND id = $1';
      connParams.push(connectionId);
    }
    const connectionsRes = await query(connQuery, connParams);

    // 3. For each active connection, fetch live models from remote endpoint
    const unifiedModels: any[] = [];
    const seenKeySet = new Set<string>();

    for (const conn of connectionsRes.rows) {
      const remoteList = await getModelsForConnection(conn, forceRefresh);

      for (const rm of remoteList) {
        if (!rm.id) continue;
        const key = `${conn.id}::${rm.id}`;
        seenKeySet.add(key);
        const saved = dbModelMap.get(key);

        if (saved) {
          unifiedModels.push({
            ...saved,
            in_db: true,
          });
        } else {
          unifiedModels.push({
            id: null, // Not stored in database yet
            connection_id: conn.id,
            model_id: rm.id,
            display_name: rm.name || rm.id,
            description: rm.description || '',
            context_length: rm.context_length || 4096,
            max_tokens: 2048,
            temperature: 0.7,
            top_p: 1.0,
            is_active: false,
            is_default: false,
            capabilities: [],
            supports_tools: true,
            connection_name: conn.name,
            connection_provider: conn.provider,
            connection_base_url: conn.base_url,
            connection_is_active: conn.is_active,
            in_db: false,
          });
        }
      }
    }

    // 4. Also include any DB models that weren't in the remote list (custom models)
    for (const dbm of dbModels) {
      const key = `${dbm.connection_id}::${dbm.model_id}`;
      if (!seenKeySet.has(key)) {
        if (!connectionId || String(dbm.connection_id) === String(connectionId)) {
          unifiedModels.push({
            ...dbm,
            in_db: true,
          });
        }
      }
    }

    // If activeOnly filter requested from query param:
    let resultList = unifiedModels;
    if (activeOnly) {
      resultList = resultList.filter((m) => m.is_active);
    }

    // Sort: default first, active next, then alphabetically
    resultList.sort((a, b) => {
      if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
      return (a.display_name || '').localeCompare(b.display_name || '');
    });

    return NextResponse.json({
      models: resultList,
      savedCount: dbModels.length,
      totalAvailable: unifiedModels.length,
    });
  } catch (error: any) {
    console.error('Fetch models error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลโมเดล' }, { status: 500 });
  }
}

/**
 * POST /api/admin/models
 * Save/enable a model into the database
 */
export async function POST(request: Request) {
  try {
    await ensureDatabaseSchema();
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const {
      connection_id,
      model_id,
      display_name,
      description = '',
      context_length = 4096,
      max_tokens = 2048,
      temperature = 0.7,
      top_p = 1.0,
      is_active = true,
      is_default = false,
      capabilities = [],
      supports_tools = true,
    } = body;

    if (!connection_id) {
      return NextResponse.json({ error: 'กรุณาเลือก Connection' }, { status: 400 });
    }
    if (!model_id || !model_id.trim()) {
      return NextResponse.json({ error: 'กรุณากรอก Model ID' }, { status: 400 });
    }
    if (!display_name || !display_name.trim()) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อแสดงผล' }, { status: 400 });
    }

    // If marking as default, unset existing defaults
    if (is_default) {
      await query('UPDATE models SET is_default = false WHERE is_default = true');
    }

    // Upsert into models table
    const result = await query(
      `INSERT INTO models (
        connection_id, model_id, display_name, description, context_length,
        max_tokens, temperature, top_p, is_active, is_default, capabilities, supports_tools,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      ON CONFLICT (connection_id, model_id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        description = EXCLUDED.description,
        context_length = EXCLUDED.context_length,
        max_tokens = EXCLUDED.max_tokens,
        temperature = EXCLUDED.temperature,
        top_p = EXCLUDED.top_p,
        is_active = EXCLUDED.is_active,
        is_default = EXCLUDED.is_default,
        supports_tools = EXCLUDED.supports_tools,
        updated_at = NOW()
      RETURNING *`,
      [
        connection_id,
        model_id.trim(),
        display_name.trim(),
        description,
        Number(context_length) || 4096,
        Number(max_tokens) || 2048,
        Number(temperature) ?? 0.7,
        Number(top_p) ?? 1.0,
        Boolean(is_active),
        Boolean(is_default),
        JSON.stringify(capabilities),
        Boolean(supports_tools),
      ]
    );

    return NextResponse.json(
      { message: 'บันทึก Model เรียบร้อยแล้ว', model: result.rows[0] },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create model error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการบันทึก Model' }, { status: 500 });
  }
}
