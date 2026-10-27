import { handleMcpRequest } from '@/lib/studio/connections/mcpserver';

// MCP server (Streamable HTTP, stateless) for one connection — add it in the MCP Hub with
// transport "Streamable HTTP" and header "Authorization: Bearer nkc_...".
type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  return handleMcpRequest(request, (await params).id);
}

export async function GET(request: Request, { params }: Context) {
  return handleMcpRequest(request, (await params).id);
}

export async function DELETE(request: Request, { params }: Context) {
  return handleMcpRequest(request, (await params).id);
}
