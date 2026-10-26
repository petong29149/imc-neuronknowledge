/**
 * Where each kind of "chat" lives.
 *
 * NeuronKnowledge is the Knowledge & MCP hub. End-user chat is served by the
 * separate imc-chat-aiagent system; the /chat route in this app is only a test
 * console for trying MCP tools and agents.
 *
 * NEXT_PUBLIC_ so the value is inlined into the client bundle at build time.
 */
export const CHAT_PRODUCTION_URL = (
  process.env.NEXT_PUBLIC_CHAT_URL || "https://moc.imcinstitute.com"
).replace(/\/+$/, "");

/** Host shown on buttons, e.g. "moc.imcinstitute.com". */
export const CHAT_PRODUCTION_HOST = CHAT_PRODUCTION_URL.replace(/^https?:\/\//, "");

/** In-app test console (login required). */
export const CHAT_TEST_PATH = "/chat";
