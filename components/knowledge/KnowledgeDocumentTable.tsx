"use client";

import React from "react";
import { FileText, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import {
  KnowledgeDocument,
  TONE_CLASSES,
  formatBytes,
  formatDateTime,
  qualityLabel,
  statusView,
} from "@/components/knowledge/knowledge-format";

interface Props {
  documents: KnowledgeDocument[];
  isLoading: boolean;
  onReindex: (doc: KnowledgeDocument) => void;
  onDelete: (doc: KnowledgeDocument) => void;
}

function Badge({ label, tone }: { label: string; tone: keyof typeof TONE_CLASSES }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-md border ${TONE_CLASSES[tone]}`}>
      {label}
    </span>
  );
}

export default function KnowledgeDocumentTable({ documents, isLoading, onReindex, onDelete }: Props) {
  return (
    <div className="bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-white/10 rounded-3xl shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-white/[0.02]">
              <th className="py-2.5 px-4">เอกสาร</th>
              <th className="py-2.5 px-3">สถานะ</th>
              <th className="py-2.5 px-3 hidden md:table-cell">คุณภาพ</th>
              <th className="py-2.5 px-3 hidden sm:table-cell">ชิ้นเนื้อหา</th>
              <th className="py-2.5 px-3 hidden lg:table-cell">อัปเดตล่าสุด</th>
              <th className="py-2.5 px-4 text-right">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {isLoading && documents.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-500">
                  <RefreshCw className="w-4 h-4 inline animate-spin mr-2" />
                  กำลังโหลดเอกสาร...
                </td>
              </tr>
            ) : documents.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-500">
                  ยังไม่มีเอกสารในคลังความรู้ขององค์กรนี้
                </td>
              </tr>
            ) : (
              documents.map((doc) => {
                const status = statusView(doc);
                const quality = qualityLabel(doc.quality_flag);
                const warnings = doc.metadata?.warnings ?? [];
                const deleting = doc.pending_job === "delete";
                return (
                  <tr key={doc.doc_id} className="align-top hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 shrink-0">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-white break-all">{doc.filename}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 max-w-md">
                            {doc.description}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            <span className="text-[10px] font-mono uppercase text-slate-400">
                              {doc.file_type} · {formatBytes(doc.size_bytes)}
                            </span>
                            {doc.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-1.5 py-0.5 text-[10px] rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <Badge label={status.label} tone={status.tone} />
                      {doc.error && (
                        <p className="mt-1 max-w-[220px] text-[11px] text-rose-600 dark:text-rose-400">{doc.error}</p>
                      )}
                    </td>
                    <td className="py-3 px-3 hidden md:table-cell">
                      {quality ? <Badge label={quality.label} tone={quality.tone} /> : <span className="text-slate-400">-</span>}
                      {warnings.length > 0 && (
                        <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400" title={warnings.join("\n")}>
                          คำเตือน {warnings.length} รายการ
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-3 hidden sm:table-cell text-slate-600 dark:text-slate-300">
                      {doc.chunk_count ?? "-"}
                      {doc.page_count ? <span className="text-slate-400"> · {doc.page_count} หน้า</span> : null}
                    </td>
                    <td className="py-3 px-3 hidden lg:table-cell text-[11px] text-slate-400">
                      {formatDateTime(doc.updated_at)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onReindex(doc)}
                          disabled={deleting}
                          title="ประมวลผลใหม่"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-[#0055fa] hover:bg-blue-50 dark:hover:bg-blue-500/10 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(doc)}
                          disabled={deleting}
                          title="ลบเอกสาร"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
