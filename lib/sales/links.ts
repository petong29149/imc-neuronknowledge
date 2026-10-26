// Link targets for the sales front page (/).
// The site is a brochure for now: both product buttons stay inside this app and
// open a showcase page, not the working product.

/** NeuronHub = the AI chat product. Its brochure page lives here. */
export const NEURONHUB_PATH = "/neuronhub";

/** NeuronKnowledge = knowledge & MCP hub. The original home page of this app lives here. */
export const NEURONKNOWLEDGE_PATH = "/neuronknowledge";

// Showcase built for a customer. The default uses the punycode form of
// plus.คิดค้า.com so the link works everywhere; set NEXT_PUBLIC_SHOWCASE_URL
// to change it without touching code.
const DEFAULT_SHOWCASE_URL = "https://plus.xn--42ca1c5gh2k.com";
const showcaseFromEnv = process.env.NEXT_PUBLIC_SHOWCASE_URL?.trim();

export const SHOWCASE_URL = showcaseFromEnv ? showcaseFromEnv : DEFAULT_SHOWCASE_URL;
export const SHOWCASE_LABEL = "plus.คิดค้า.com";

// Service description document (Google Doc) shown as a button on the sales page.
// Set NEXT_PUBLIC_SERVICE_DOC_URL to point somewhere else.
const DEFAULT_SERVICE_DOC_URL =
  "https://docs.google.com/document/d/1bhRlgDfRusUEHe-xwgmcYo45X1NGr2zeBctaEHLSacA/edit?usp=sharing";
const serviceDocFromEnv = process.env.NEXT_PUBLIC_SERVICE_DOC_URL?.trim();

export const SERVICE_DOC_URL = serviceDocFromEnv ? serviceDocFromEnv : DEFAULT_SERVICE_DOC_URL;

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
