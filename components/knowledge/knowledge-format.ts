/** Shapes and Thai labels for the Knowledge Engine documents shown on /knowledge. */

export interface KnowledgeOrg {
  org_id: string;
  name: string;
}

export type DocumentStatus =
  | "uploaded"
  | "extracting"
  | "chunking"
  | "embedding"
  | "indexed"
  | "failed"
  | "needs_ocr"
  | "deleted";

export interface KnowledgeDocument {
  doc_id: string;
  filename: string;
  file_type: "pdf" | "docx" | "pptx" | "txt" | "md" | "jpg" | "png";
  size_bytes: number | null;
  description: string;
  tags: string[];
  status: DocumentStatus;
  quality_flag: "ok" | "partial_garbled" | "garbled" | "needs_ocr" | "ocr" | null;
  error: string | null;
  page_count: number | null;
  chunk_count: number | null;
  metadata: { title?: string; author?: string; warnings?: string[] } & Record<string, unknown>;
  pending_job: "index" | "reindex" | "delete" | null;
  created_at: string;
  updated_at: string;
}

export const ACCEPTED_TYPES = ".pdf,.docx,.pptx,.txt,.md,.jpg,.jpeg,.png";
export const MIN_DESCRIPTION = 10;
export const MAX_DESCRIPTION = 1000;

type Tone = "neutral" | "busy" | "ok" | "warn" | "error";

/** What to show for a document: a pending delete or a queued job wins over the stored status. */
export function statusView(doc: KnowledgeDocument): { label: string; tone: Tone } {
  if (doc.pending_job === "delete") return { label: "กำลังลบ", tone: "busy" };
  switch (doc.status) {
    case "indexed":
      return doc.pending_job ? { label: "รอประมวลผลใหม่", tone: "busy" } : { label: "พร้อมใช้งาน", tone: "ok" };
    case "uploaded":
      return { label: "รอประมวลผล", tone: "busy" };
    case "extracting":
      return { label: "กำลังอ่านไฟล์", tone: "busy" };
    case "chunking":
      return { label: "กำลังแบ่งเนื้อหา", tone: "busy" };
    case "embedding":
      return { label: "กำลังสร้างดัชนี", tone: "busy" };
    case "needs_ocr":
      return { label: "ต้องใช้ OCR", tone: "warn" };
    case "failed":
      return { label: "ล้มเหลว", tone: "error" };
    default:
      return { label: doc.status, tone: "neutral" };
  }
}

/** True while the worker still has something to do, so the page keeps polling. */
export function isBusy(doc: KnowledgeDocument): boolean {
  return doc.pending_job !== null || ["uploaded", "extracting", "chunking", "embedding"].includes(doc.status);
}

export function qualityLabel(flag: KnowledgeDocument["quality_flag"]): { label: string; tone: Tone } | null {
  switch (flag) {
    case "ok":
      return { label: "อ่านได้ปกติ", tone: "ok" };
    case "partial_garbled":
      return { label: "บางหน้าอ่านไม่ได้", tone: "warn" };
    case "garbled":
      return { label: "ข้อความเพี้ยน", tone: "error" };
    case "needs_ocr":
      return { label: "เป็นภาพสแกน", tone: "warn" };
    case "ocr":
      // Read from scans by OCR: usually right, but worth a check against the original
      return { label: "อ่านด้วย OCR", tone: "warn" };
    default:
      return null;
  }
}

export const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10",
  busy: "bg-blue-50 dark:bg-blue-500/10 text-[#0055fa] dark:text-blue-300 border-blue-200/70 dark:border-blue-500/20",
  ok: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-500/20",
  warn: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200/70 dark:border-amber-500/20",
  error: "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200/70 dark:border-rose-500/20",
};

export function formatBytes(bytes: number | null): string {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

/** "HR, นโยบาย ,HR" → ["HR", "นโยบาย"] */
export function parseTags(input: string): string[] {
  return [...new Set(input.split(",").map((t) => t.trim()).filter(Boolean))];
}
