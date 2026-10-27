// Tool names of a connection's MCP server; shared by the server (mcpserver.ts) and the UI.

/** ASCII tool-name suffix from the connection name; Thai-only names fall back to db_<id>. */
export function toolSlug(connection: { id: number; name: string }): string {
  const slug = connection.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return slug || `db_${connection.id}`;
}

export function mcpToolNames(connection: { id: number; name: string }) {
  const slug = toolSlug(connection);
  return { describe: `describe_${slug}`, query: `query_${slug}` };
}
