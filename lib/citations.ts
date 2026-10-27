/**
 * Source citations: which tool results an answer was built from.
 *
 * When an MCP tool returns, `prepareCitations` pulls the sources out of its result and numbers
 * them. The numbers are shown to the model in a "Citation index" at the top of the tool result,
 * so it can write `[cite:N]` markers in its answer. The chat UI turns those markers into buttons
 * that open the source. Numbers are unique within a chat (they continue from the highest number
 * already in the history), so a marker can never point at the wrong turn.
 *
 * No server imports: this file is also used by the chat UI.
 */

export type CitationKind = 'document' | 'file' | 'table' | 'tool';

export interface CitationChunk {
  chunkId?: string;
  text: string;
  /** Raw retrieval score from the tool (its scale depends on the tool; not a percentage) */
  score?: number;
}

export interface CitationTable {
  columns: string[];
  rows: (string | number | null)[][];
  /** Rows in the tool result; `rows` may hold fewer */
  totalRows: number;
}

export interface CitationSource {
  /** The N in [cite:N] */
  id: number;
  kind: CitationKind;
  title: string;
  toolName: string;
  toolCallId: string;
  /** Arguments the model called the tool with (the search conditions) */
  args?: Record<string, unknown>;
  url?: string;
  publishedDate?: string;
  category?: string;
  summary?: string;
  description?: string;
  chunks?: CitationChunk[];
  table?: CitationTable;
}

type DraftSource = Omit<CitationSource, 'id'>;

const MAX_SOURCES_PER_RESULT = 30;
const MAX_CHUNKS_PER_SOURCE = 12;
const MAX_CHUNK_CHARS = 2000;
const MAX_TABLE_ROWS = 200;
const MAX_TABLE_COLUMNS = 40;
/** Rows read to collect the column names (rows of a query result normally share them) */
const COLUMN_SCAN_ROWS = 50;
const MAX_FALLBACK_CHARS = 4000;

type Json = unknown;
type JsonObject = Record<string, Json>;

const isObject = (value: Json): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asText = (value: Json): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

const truncate = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}…` : text);

/** Only http(s) links are ever rendered as links. */
export function safeHttpUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

/** Failed tool runs are not sources (n8n reports failures as plain "There was an error" text). */
function looksLikeError(content: string, isError: boolean): boolean {
  return isError || /^\s*(error\b|there was an error)/i.test(content);
}

interface Base {
  toolName: string;
  toolCallId: string;
  args: Record<string, unknown>;
}

/**
 * A source found in a tool result, plus the edits that stamp its citation number into the parsed
 * result once the number is known (see `prepareCitations`).
 */
interface Found {
  draft: DraftSource;
  stamps: ((id: number) => void)[];
}

/**
 * The object with `source_id` set to the citation number, as its first key. Tool results often
 * carry their own `source_id` (a per-result chunk counter); left alone it collides with the
 * citation numbers, and models cite it instead.
 */
function withSourceId(obj: JsonObject, id: number): JsonObject {
  const rest = { ...obj };
  delete rest.source_id;
  return { source_id: id, ...rest };
}

/**
 * Retrieval results: `{ data: [{ score?, payload: { title | fileName, web_url | web_view_link,
 * published_date, category, chunk_id, content, ... } }] }`. Chunks of the same document are
 * grouped into one source.
 */
function documentsFromItems(items: Json[], base: Base): Found[] {
  const groups = new Map<string, Found>();

  items.forEach((item, index) => {
    if (!isObject(item) || !isObject(item.payload)) return;
    const payload = item.payload;

    const fileName = asText(payload.fileName);
    const title = asText(payload.title) ?? fileName ?? asText(payload.name);
    const url = asText(payload.web_url) ?? asText(payload.web_view_link) ?? asText(payload.url);
    const key = asText(payload.web_url) ?? fileName ?? title ?? `item-${index}`;

    let found = groups.get(key);
    if (!found) {
      found = {
        draft: {
          kind: payload.web_view_link || (fileName && !payload.web_url) ? 'file' : 'document',
          title: title ?? base.toolName,
          toolName: base.toolName,
          toolCallId: base.toolCallId,
          args: base.args,
          url: safeHttpUrl(url) ?? undefined,
          publishedDate: asText(payload.published_date),
          category:
            [asText(payload.category), asText(payload.subcategory)].filter(Boolean).join(' › ') ||
            undefined,
          summary: asText(payload.summary_en) ?? asText(payload.summary),
          chunks: [],
        },
        stamps: [],
      };
      groups.set(key, found);
    }
    found.stamps.push((id) => {
      items[index] = withSourceId(item, id);
    });

    const text = asText(payload.content);
    if (text && found.draft.chunks!.length < MAX_CHUNKS_PER_SOURCE) {
      found.draft.chunks!.push({
        chunkId: asText(payload.chunk_id),
        text: truncate(text, MAX_CHUNK_CHARS),
        score: typeof item.score === 'number' ? item.score : undefined,
      });
    }
  });

  return [...groups.values()];
}

const cell = (value: Json): string | number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number') return value;
  return JSON.stringify(value);
};

/** The rows as a table. Columns are the keys seen in the first rows; null when there are none. */
function tableOf(rows: JsonObject[]): CitationTable | null {
  const columns: string[] = [];
  for (const row of rows.slice(0, COLUMN_SCAN_ROWS)) {
    for (const key of Object.keys(row)) {
      if (columns.length < MAX_TABLE_COLUMNS && !columns.includes(key)) columns.push(key);
    }
  }
  if (columns.length === 0) return null;
  return {
    columns,
    rows: rows.slice(0, MAX_TABLE_ROWS).map((row) => columns.map((column) => cell(row[column]))),
    totalRows: rows.length,
  };
}

/** Statistics results: `{ source_data: "label", Table: [{ data: [row, ...] }], ... }`. */
function tablesFromElement(element: JsonObject, base: Base): Found[] {
  const tables = element.Table;
  if (!Array.isArray(tables)) return [];
  const label = asText(element.source_data);
  const description = asText(element['คำอธิบาย Table']) ?? asText(element.description);

  const found: Found[] = [];
  tables.forEach((entry, index) => {
    if (!isObject(entry) || !Array.isArray(entry.data)) return;
    const table = tableOf(entry.data.filter(isObject));
    if (!table) return;
    found.push({
      draft: {
        kind: 'table',
        title: label ?? base.toolName,
        toolName: base.toolName,
        toolCallId: base.toolCallId,
        args: base.args,
        description,
        table,
      },
      stamps: [
        (id) => {
          tables[index] = withSourceId(entry, id);
        },
      ],
    });
  });
  return found;
}

/** A non-empty array whose items are all objects: the rows of a query result. */
const isRowArray = (value: Json): value is JsonObject[] =>
  Array.isArray(value) && value.length > 0 && value.every(isObject);

/** Keys that usually hold the rows of a database result, best first. */
const ROW_KEYS = ['rows', 'data', 'result', 'results', 'records', 'items', 'recordset'];

/**
 * A row, as opposed to a wrapper around rows (`{ rows: [...] }`). `items` is left out of the
 * check: as a column it is common (an order's line items stored as JSON).
 */
const isFlatRow = (row: JsonObject) =>
  !ROW_KEYS.some((key) => key !== 'items' && isRowArray(row[key]));

/**
 * Database results, no matter which tool made them: an array of row objects, either bare
 * (`[{ id: 1, ... }, ...]`) or under a key (`{ rows: [...], rowCount: 2, query: "SELECT ..." }`,
 * `[{ data: [...] }]`). Rows are not stamped with a number (that would add a column to the data);
 * the citation index names the source instead.
 */
function rowsFromJson(parsed: Json, base: Base): Found[] {
  const tableSource = (
    rows: JsonObject[],
    title: string,
    description: string | undefined
  ): Found[] => {
    const table = tableOf(rows);
    if (!table) return [];
    return [
      {
        draft: {
          kind: 'table',
          title,
          toolName: base.toolName,
          toolCallId: base.toolCallId,
          args: base.args,
          description,
          table,
        },
        stamps: [],
      },
    ];
  };

  if (Array.isArray(parsed) && isRowArray(parsed) && parsed.every(isFlatRow)) {
    return tableSource(parsed, base.toolName, undefined);
  }

  const found: Found[] = [];
  for (const element of Array.isArray(parsed) ? parsed : [parsed]) {
    if (!isObject(element)) continue;
    const description = asText(element.description) ?? asText(element.query) ?? asText(element.sql);
    const keys = Object.keys(element).filter((key) => key !== 'Table' && isRowArray(element[key]));
    // `{ rows, fields }`: take the rows, not the column metadata next to them
    const preferred = ROW_KEYS.find((key) => keys.includes(key));
    if (preferred) {
      found.push(
        ...tableSource(
          element[preferred] as JsonObject[],
          asText(element.source_data) ?? base.toolName,
          description
        )
      );
      continue;
    }
    for (const key of keys) {
      found.push(...tableSource(element[key] as JsonObject[], `${base.toolName} › ${key}`, description));
    }
  }
  return found;
}

function fromJson(parsed: Json, base: Base): Found[] {
  const elements = Array.isArray(parsed) ? parsed : [parsed];
  const found: Found[] = [];
  for (const element of elements) {
    if (!isObject(element)) continue;
    if (Array.isArray(element.data)) found.push(...documentsFromItems(element.data, base));
    found.push(...tablesFromElement(element, base));
  }
  // A result that is neither documents nor a statistics table may still be database rows
  return found.length > 0 ? found : rowsFromJson(parsed, base);
}

/**
 * The sources in one tool result, with the parsed JSON they were read from (so their numbers can
 * be stamped into it). A successful result of any other shape becomes a single "tool" source.
 */
function analyze(
  toolName: string,
  toolCallId: string,
  args: Record<string, unknown>,
  content: string,
  isError: boolean
): { found: Found[]; parsed: Json } {
  if (looksLikeError(content, isError)) return { found: [], parsed: undefined };

  const base: Base = { toolName, toolCallId, args };
  let parsed: Json;
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = undefined;
  }

  const found = parsed === undefined ? [] : fromJson(parsed, base);
  if (found.length > 0) return { found: found.slice(0, MAX_SOURCES_PER_RESULT), parsed };

  const text = content.trim();
  if (!text) return { found: [], parsed: undefined };
  return {
    found: [
      {
        draft: {
          kind: 'tool',
          title: toolName,
          toolName,
          toolCallId,
          args,
          chunks: [{ text: truncate(text, MAX_FALLBACK_CHARS) }],
        },
        stamps: [],
      },
    ],
    parsed: undefined,
  };
}

/** One line of the model-facing index: enough to match a source to the blocks of the raw result. */
function indexLine(source: CitationSource): string {
  const details: string[] = [];
  if (source.publishedDate) details.push(source.publishedDate);
  if (source.category) details.push(source.category);
  const chunkIds = (source.chunks ?? []).map((c) => c.chunkId).filter(Boolean);
  if (chunkIds.length > 0) details.push(`chunks ${chunkIds.join(', ')}`);
  if (source.table) details.push(`table of ${source.table.totalRows} rows`);
  return `[cite:${source.id}] ${source.title}${details.length > 0 ? ` (${details.join('; ')})` : ''}`;
}

/**
 * Numbers the sources of a tool result starting at `startId`. The result the model sees gets the
 * citation index on top, and each item in it has its `source_id` set to its citation number, so
 * the number the model reads next to a passage is the one to cite. Results with no sources are
 * returned unchanged.
 */
export function prepareCitations(input: {
  toolName: string;
  toolCallId: string;
  args: Record<string, unknown>;
  content: string;
  isError: boolean;
  startId: number;
}): { content: string; sources: CitationSource[] } {
  const { found, parsed } = analyze(
    input.toolName,
    input.toolCallId,
    input.args,
    input.content,
    input.isError
  );
  if (found.length === 0) return { content: input.content, sources: [] };

  const sources = found.map(({ draft }, i) => ({ ...draft, id: input.startId + i }));
  found.forEach(({ stamps }, i) => stamps.forEach((stamp) => stamp(input.startId + i)));

  const stamped = found.some(({ stamps }) => stamps.length > 0);
  const body = stamped ? JSON.stringify(parsed, null, 2) : input.content;
  const index = [
    stamped
      ? 'Citation index. Each item in the result below carries its number as "source_id". In your answer, mark information taken from an item with [cite:N], where N is that item\'s source_id:'
      : 'Citation index. In your answer, mark information taken from a source with [cite:N]:',
    ...sources.map(indexLine),
  ].join('\n');
  return { content: `${index}\n---\n${body}`, sources };
}

/** The number the next source of this chat should get. */
export function nextCitationId(messages: { sources?: CitationSource[] | null }[]): number {
  let max = 0;
  for (const message of messages) {
    for (const source of message.sources ?? []) max = Math.max(max, source.id);
  }
  return max + 1;
}

// ────────────── Markers in the answer text ──────────────

export type CitationSegment = { type: 'text'; text: string } | { type: 'cite'; ids: number[] };

// [cite:3]  [cite:3, cite:5]  [cite: 3, 5]
const CITE_TAG_SOURCE = String.raw`\[cite:\s*\d+(?:\s*,\s*(?:cite:\s*)?\d+)*\s*\]`;

/** The text without [cite:N] markers (and the spaces before them), for copying an answer out of the chat. */
export function stripCitationTags(text: string): string {
  return text.replace(new RegExp(String.raw`[ \t]*${CITE_TAG_SOURCE}`, 'g'), '');
}

export function hasCitationTags(text: string): boolean {
  return new RegExp(CITE_TAG_SOURCE).test(text);
}

/** Splits answer text into plain text and citation markers. */
export function splitCitationTags(text: string): CitationSegment[] {
  const segments: CitationSegment[] = [];
  const pattern = new RegExp(CITE_TAG_SOURCE, 'g');
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > last) segments.push({ type: 'text', text: text.slice(last, start) });
    segments.push({ type: 'cite', ids: (match[0].match(/\d+/g) ?? []).map(Number) });
    last = start + match[0].length;
  }
  if (last < text.length) segments.push({ type: 'text', text: text.slice(last) });
  return segments;
}
