// Link targets for the sales front page (/).
// The chat link is temporary: it points to the production chat until the final
// address of the IMC chat app is decided. Set NEXT_PUBLIC_CHAT_URL to change it
// without touching code.

const DEFAULT_CHAT_URL = "https://moc.imcinstitute.com";

const chatFromEnv = process.env.NEXT_PUBLIC_CHAT_URL?.trim();

/** IMC Chat (imc-chat-aiagent). Opens in a new tab. */
export const CHAT_URL = chatFromEnv ? chatFromEnv : DEFAULT_CHAT_URL;

/** The original NeuronHub home (Knowledge & MCP Hub) lives here. */
export const HUB_PATH = "/hub";

export const CONTACT = {
  phones: [
    { label: "099-347-9694", href: "tel:0993479694" },
    { label: "088-192-7975", href: "tel:0881927975" },
  ],
  email: "contact@imcinstitute.com",
  facebook: "https://facebook.com/imcinstitute",
  lineId: "@imcinstitute",
  lineUrl: "https://line.me/R/ti/p/%40imcinstitute",
} as const;
