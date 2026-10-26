"use client";

import React, { createContext, useContext } from "react";
import { X, FileText, ExternalLink, Table2, Wrench, Info } from "lucide-react";
import Modal from "@/components/common/Modal";
import { safeHttpUrl, type CitationSource, type CitationKind } from "@/lib/citations";

// ────────────── Context: the [cite:N] markers in an answer resolve through this ──────────────

interface CitationContextValue {
  /** Every source in the open chat, by its [cite:N] number */
  sources: Map<number, CitationSource>;
  open: (id: number) => void;
}

const CitationContext = createContext<CitationContextValue | null>(null);

export const CitationProvider = CitationContext.Provider;

/** The buttons for one [cite:N] marker (or several: [cite:1, cite:2]). */
export function CitationMarks({ ids }: { ids: number[] }) {
  const ctx = useContext(CitationContext);
  return (
    <>
      {ids.map((id, index) => {
        const source = ctx?.sources.get(id);
        if (!ctx || !source) {
          // The model cited a number that no tool result has: show it, but do not pretend it is a source
          return (
            <span
              key={`${id}-${index}`}
              title="ไม่พบแหล่งข้อมูลของหมายเลขนี้"
              className="inline-flex items-center mx-0.5 px-1.5 text-[10px] font-mono font-semibold rounded-md border border-dashed border-slate-300 dark:border-white/20 text-slate-400 align-baseline"
            >
              [{id}]
            </span>
          );
        }
        return (
          <button
            key={`${id}-${index}`}
            type="button"
            onClick={() => ctx.open(id)}
            title={`[${id}] ${source.title}`}
            // A long title is cut with "…" (truncate) at max-w; the full title is in the tooltip
            className="inline-block max-w-[14rem] align-middle truncate mx-0.5 px-1.5 py-0.5 text-[11px] leading-snug font-medium rounded-md bg-[#0055fa]/10 dark:bg-[#0055fa]/20 text-[#0055fa] dark:text-[#60a5fa] border border-[#0055fa]/30 hover:bg-[#0055fa] hover:text-white dark:hover:bg-[#0055fa] dark:hover:text-white transition-colors cursor-pointer"
          >
            {source.title}
          </button>
        );
      })}
    </>
  );
}

// ────────────── Modal ──────────────

const KIND_LABEL: Record<CitationKind, string> = {
  document: "เอกสาร",
  file: "ไฟล์",
  table: "ตารางข้อมูล",
  tool: "ผลลัพธ์จากเครื่องมือ",
};

const KIND_ICON: Record<CitationKind, React.ElementType> = {
  document: FileText,
  file: FileText,
  table: Table2,
  tool: Wrench,
};

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
}

// Columns that hold amounts; a whole number in any other column may be an id, a code or a phone number
const MEASURE_COLUMN = /value|amount|total|sum|price|cost|qty|quantity|revenue|sales|usd|thb/i;

/**
 * Large amounts (trade values) are hard to read raw, so they get thousands separators. Only
 * numbers with decimals, or in a column that looks like an amount, are changed: a whole number
 * elsewhere is left exactly as the database returned it.
 */
function formatCell(column: string, value: string | number | null): string {
  if (value === null) return "—";
  const text = String(value).trim();
  const isNumber = text !== "" && !Number.isNaN(Number(text));
  const isFormattable = /^-?\d+\.\d+$/.test(text) || (isNumber && MEASURE_COLUMN.test(column));
  if (!isNumber || !isFormattable || Math.abs(Number(text)) < 10000) return String(value);
  // Keep up to 2 decimals as the database gave them ("12500.50" -> "12,500.50"); ".00" is dropped
  const fraction = text.split(".")[1] ?? "";
  const digits = /^0*$/.test(fraction) ? 0 : Math.min(2, fraction.length);
  return Number(text).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

const SCORE_HINT =
  "ความคล้ายเชิงความหมายระหว่างคำถามกับข้อความนี้ (cosine similarity ของ embedding จากการค้นแบบเวกเตอร์) × 100 ไม่ได้บอกว่าคำตอบถูกต้องกี่เปอร์เซ็นต์";

/** Scores from 0 to 1 are shown as a percentage; a score on any other scale stays as it is. */
function formatScore(score: number): string {
  return score >= 0 && score <= 1 ? `${(score * 100).toFixed(1)}%` : score.toFixed(3);
}

function Chip({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div
      title={hint}
      className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#131d33] border border-slate-200/80 dark:border-white/5 min-w-0"
    >
      <div className="text-[10px] text-slate-400 font-mono uppercase">{label}</div>
      <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 mt-0.5 break-words">{value}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 mb-1.5">{children}</div>
  );
}

export default function CitationModal({
  source,
  onClose,
}: {
  source: CitationSource;
  onClose: () => void;
}) {
  const Icon = KIND_ICON[source.kind];
  const url = safeHttpUrl(source.url);
  const bestScore = Math.max(...(source.chunks ?? []).map((c) => c.score ?? -Infinity));
  const hasArgs = source.args && Object.keys(source.args).length > 0;

  return (
    <Modal
      onClose={onClose}
      label={`แหล่งอ้างอิง ${source.id}`}
      panelClassName="w-full max-w-2xl bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden"
    >
      <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 pb-4 border-b border-slate-100 dark:border-white/5">
        <div className="flex items-start gap-3 min-w-0">
          <div className="shrink-0 w-9 h-9 rounded-xl bg-blue-50 dark:bg-[#0055fa]/10 text-[#0055fa] dark:text-blue-400 flex items-center justify-center">
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-mono font-semibold text-[#0055fa] dark:text-blue-400">
              แหล่งอ้างอิง [{source.id}] • {KIND_LABEL[source.kind]}
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white break-words">{source.title}</h2>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิด"
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="max-h-[70vh] overflow-y-auto px-5 sm:px-6 py-5 space-y-4">
        {(source.publishedDate || source.category || Number.isFinite(bestScore)) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {source.publishedDate && <Chip label="เผยแพร่" value={formatDate(source.publishedDate)} />}
            {source.category && <Chip label="หมวดหมู่" value={source.category} />}
            {Number.isFinite(bestScore) && (
              <Chip label="ความคล้าย (สูงสุด)" value={formatScore(bestScore)} hint={SCORE_HINT} />
            )}
          </div>
        )}

        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#0055fa] hover:bg-[#0046d1] transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>{source.kind === "file" ? "เปิดไฟล์ต้นฉบับ" : "เปิดเอกสารต้นฉบับ"}</span>
          </a>
        )}
        {source.kind === "file" && url && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            ลิงก์ไฟล์อาจมีวันหมดอายุ หากเปิดไม่ได้ ให้ค้นหาด้วยชื่อไฟล์ด้านบน
          </p>
        )}

        {source.summary && (
          <div>
            <SectionLabel>สรุปเนื้อหา</SectionLabel>
            <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">{source.summary}</p>
          </div>
        )}

        {source.description && (
          <div>
            <SectionLabel>คำอธิบายข้อมูล</SectionLabel>
            <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">{source.description}</p>
          </div>
        )}

        {source.chunks && source.chunks.length > 0 && (
          <div>
            <SectionLabel>
              {source.kind === "tool" ? "ผลลัพธ์ที่ได้รับ" : `ข้อความที่ดึงมา (${source.chunks.length} ส่วน)`}
            </SectionLabel>
            <div className="space-y-2">
              {source.chunks.map((chunk, index) => (
                <div
                  key={index}
                  className="rounded-xl bg-slate-100 dark:bg-[#070b14] border border-slate-200 dark:border-white/10"
                >
                  {(chunk.chunkId || chunk.score !== undefined) && (
                    <div className="flex items-center justify-between gap-2 px-3 pt-2 text-[10px] font-mono text-slate-400">
                      <span className="truncate">{chunk.chunkId ?? ""}</span>
                      {chunk.score !== undefined && (
                        <span title={SCORE_HINT}>ความคล้าย {formatScore(chunk.score)}</span>
                      )}
                    </div>
                  )}
                  <div className="px-3 py-2 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words max-h-[180px] overflow-y-auto">
                    {chunk.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {source.table && (
          <div>
            <SectionLabel>
              ข้อมูลในตาราง
              {source.table.totalRows > source.table.rows.length
                ? ` (แสดง ${source.table.rows.length} จาก ${source.table.totalRows} แถว)`
                : ` (${source.table.totalRows} แถว)`}
            </SectionLabel>
            <div className="overflow-auto max-h-[300px] rounded-xl border border-slate-200 dark:border-white/10">
              <table className="w-full text-[11px] text-left border-collapse">
                <thead className="sticky top-0 bg-slate-100 dark:bg-[#131d33] text-slate-600 dark:text-slate-300">
                  <tr>
                    {source.table.columns.map((column) => (
                      <th key={column} className="px-3 py-2 font-semibold whitespace-nowrap">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5 text-slate-700 dark:text-slate-300">
                  {source.table.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((value, cellIndex) => {
                        const text = formatCell(source.table!.columns[cellIndex], value);
                        return (
                          <td
                            key={cellIndex}
                            title={text.length > 40 ? text : undefined}
                            className="px-3 py-1.5 whitespace-nowrap font-mono max-w-[18rem] truncate"
                          >
                            {text}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {hasArgs && (
          <details className="group">
            <summary className="cursor-pointer text-[11px] font-semibold text-slate-500 dark:text-slate-400 select-none">
              เงื่อนไขที่ใช้ค้น (Arguments)
            </summary>
            <pre className="mt-2 p-3 rounded-xl bg-slate-900 text-slate-200 text-[11px] overflow-x-auto whitespace-pre-wrap break-words">
              {JSON.stringify(source.args, null, 2)}
            </pre>
          </details>
        )}
      </div>

      <div className="flex items-start gap-2 px-5 sm:px-6 py-3 border-t border-slate-100 dark:border-white/5 text-[11px] text-slate-500 dark:text-slate-400">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#0055fa]" />
        <span>
          ข้อมูลจากเครื่องมือ <span className="font-mono">{source.toolName}</span> • AI เป็นผู้ระบุว่าข้อความส่วนใดอ้างอิงแหล่งนี้
          ควรตรวจสอบกับต้นฉบับเมื่อใช้ข้อมูลสำคัญ
        </span>
      </div>
    </Modal>
  );
}
