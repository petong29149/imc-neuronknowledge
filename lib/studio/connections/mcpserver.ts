import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { catalogContext } from './ai';
import { verifyApiKey } from './apikeys';
import { loadCatalog } from './catalog';
import { jsonError } from './core-shim';
import { runCatalogQuery } from './external';
import { HttpError } from './http';
import { mcpToolNames, toolSlug } from './mcpnames';
import { findConnectionById } from './repo';
import { QUERY_MAX_ROWS, TYPE_LABELS, type ConnectionView } from './types';

// A tiny MCP server per connection (Streamable HTTP, stateless) so the MCP Hub can add a
// database like any other MCP server: URL /api/connections/[id]/mcp + "Authorization: Bearer nkc_...".
// It exposes two tools backed by the same catalog and allow-list as the REST API.

const text = (value: string) => ({ content: [{ type: 'text' as const, text: value }] });
const failure = (message: string) => ({ ...text(message), isError: true });

export async function handleMcpRequest(request: Request, rawId: string): Promise<Response> {
  let connectionId: number;
  let keyId: number;
  let connection: ConnectionView;
  try {
    connectionId = Number(rawId);
    if (!Number.isInteger(connectionId) || connectionId <= 0) throw new HttpError(404, 'ไม่พบการเชื่อมต่อนี้');
    ({ keyId } = await verifyApiKey(request, connectionId));
    const stored = await findConnectionById(connectionId);
    if (!stored) throw new HttpError(404, 'ไม่พบการเชื่อมต่อนี้');
    if (!stored.view.enabled) throw new HttpError(403, 'ฐานข้อมูลนี้ถูกปิดใช้งานอยู่ ติดต่อผู้ดูแลเพื่อเปิดใช้');
    connection = stored.view;
  } catch (error) {
    if (error instanceof HttpError) return jsonError(error.message, error.status);
    console.error('[connections mcp] unexpected error', (error as Error).name);
    return jsonError('เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง', 500);
  }

  const names = mcpToolNames(connection);
  const label = `"${connection.name}" (${TYPE_LABELS[connection.type]})`;
  const about = connection.description ? ` — ${connection.description}` : '';

  const server = new Server(
    { name: `neuronknowledge-${toolSlug(connection)}`, version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tables = (await loadCatalog(connectionId)).filter((t) => t.enabled && !t.missing);
    const tableNames = tables.map((t) => t.table).slice(0, 20).join(', ');
    return {
      tools: [
        {
          name: names.describe,
          description:
            `ดูตาราง คอลัมน์ และคำอธิบายของฐานข้อมูล ${label}${about}. ` +
            `ตารางที่มี: ${tableNames || '(ยังไม่มี)'}. ต้องเรียก tool นี้ก่อนเขียน SQL ให้ ${names.query} ทุกครั้ง`,
          inputSchema: { type: 'object', properties: {} },
          annotations: { readOnlyHint: true },
        },
        {
          name: names.query,
          description:
            `รัน SQL แบบอ่านอย่างเดียว (SELECT/WITH คำสั่งเดียว) บนฐานข้อมูล ${label}. ` +
            `ใช้ได้เฉพาะตารางและคอลัมน์ที่ ${names.describe} คืนมา เขียนตาม SQL dialect ของ ${TYPE_LABELS[connection.type]} ` +
            `ผลลัพธ์ไม่เกิน ${QUERY_MAX_ROWS} แถว ถ้าต้องการสรุปตัวเลขให้ใช้ GROUP BY / SUM ใน SQL`,
          inputSchema: {
            type: 'object',
            properties: {
              sql: { type: 'string', description: 'คำสั่ง SELECT หรือ WITH เพียงคำสั่งเดียว' },
              maxRows: { type: 'integer', minimum: 1, maximum: QUERY_MAX_ROWS, description: `จำนวนแถวสูงสุด (ค่าเริ่มต้น ${QUERY_MAX_ROWS})` },
            },
            required: ['sql'],
          },
          annotations: { readOnlyHint: true },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (call) => {
    const args = (call.params.arguments ?? {}) as Record<string, unknown>;
    try {
      if (call.params.name === names.describe) {
        const context = catalogContext(await loadCatalog(connectionId));
        return text(
          [
            `Database: ${connection.name} (${TYPE_LABELS[connection.type]})${about}`,
            `SQL dialect: ${TYPE_LABELS[connection.type]}. Read-only, one statement, max ${QUERY_MAX_ROWS} rows.`,
            '',
            context || '(ยังไม่มีตารางที่เปิดใช้)',
          ].join('\n')
        );
      }
      if (call.params.name === names.query) {
        const result = await runCatalogQuery(connectionId, keyId, args.sql, args.maxRows, request);
        return text(JSON.stringify(result));
      }
      return failure(`ไม่รู้จัก tool ${call.params.name}`);
    } catch (error) {
      if (error instanceof HttpError) return failure(error.message);
      console.error('[connections mcp] tool error', (error as Error).name);
      return failure('เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง');
    }
  });

  // Stateless: a fresh server per request, plain JSON responses (no SSE session needed).
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  return transport.handleRequest(request);
}
