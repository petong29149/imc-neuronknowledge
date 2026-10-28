"use client";

import React, { useRef, useState } from "react";
import { FileUp, RefreshCw, Upload } from "lucide-react";
import {
  ACCEPTED_TYPES,
  MAX_DESCRIPTION,
  MIN_DESCRIPTION,
  formatBytes,
  parseTags,
} from "@/components/knowledge/knowledge-format";

const INPUT =
  "w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0055fa]";
const LABEL = "block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1";

interface Props {
  orgId: string;
  maxFileMb: number;
  onUploaded: (message: string) => void;
  onError: (message: string) => void;
}

export default function KnowledgeUploadForm({ orgId, maxFileMb, onUploaded, onError }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const descriptionLength = description.trim().length;
  const tooBig = file !== null && file.size > maxFileMb * 1024 * 1024;
  const canSubmit = file !== null && !tooBig && descriptionLength >= MIN_DESCRIPTION && !uploading;

  const reset = () => {
    setFile(null);
    setDescription("");
    setTags("");
    if (fileInput.current) fileInput.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !canSubmit) return;

    const body = new FormData();
    body.set("org_id", orgId);
    body.set("file", file, file.name);
    body.set("description", description.trim());
    for (const tag of parseTags(tags)) body.append("tags", tag);

    setUploading(true);
    try {
      const res = await fetch("/api/knowledge/documents", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        onUploaded(`อัปโหลด "${file.name}" แล้ว ระบบกำลังประมวลผล`);
        reset();
      } else {
        onError(data.error || "อัปโหลดไม่สำเร็จ");
      }
    } catch {
      onError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-5 sm:p-6 space-y-4 bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-white/10 rounded-3xl shadow-xs"
    >
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-[#0055fa] dark:text-blue-400">
          <FileUp className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">อัปโหลดเอกสาร</h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            รองรับ PDF, DOCX, PPTX, TXT, MD, JPG, PNG ไม่เกิน {maxFileMb} MB (ไฟล์สแกนและรูปภาพอ่านด้วย OCR)
          </p>
        </div>
      </div>

      <div>
        <label className={LABEL}>ไฟล์ *</label>
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:px-3 file:py-2 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 dark:file:bg-blue-500/10 file:text-[#0055fa] dark:file:text-blue-300 file:cursor-pointer cursor-pointer"
        />
        {file && (
          <p className={`mt-1 text-[11px] ${tooBig ? "text-rose-600 dark:text-rose-400" : "text-slate-400"}`}>
            {file.name} · {formatBytes(file.size)}
            {tooBig && ` — เกิน ${maxFileMb} MB`}
          </p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className={LABEL}>คำอธิบายเอกสาร *</label>
          <span
            className={`text-[11px] ${
              descriptionLength > 0 && descriptionLength < MIN_DESCRIPTION ? "text-rose-500" : "text-slate-400"
            }`}
          >
            {descriptionLength}/{MAX_DESCRIPTION} (อย่างน้อย {MIN_DESCRIPTION})
          </span>
        </div>
        <textarea
          rows={3}
          maxLength={MAX_DESCRIPTION}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="เช่น คู่มือนโยบายการลาของพนักงาน ปี 2567 ฉบับฝ่ายบุคคล"
          className={`${INPUT} resize-none`}
        />
        <p className="mt-1 text-[11px] text-slate-400">AI ใช้คำอธิบายนี้ช่วยตัดสินว่าเอกสารเกี่ยวกับคำถามหรือไม่</p>
      </div>

      <div>
        <label className={LABEL}>แท็ก (คั่นด้วยจุลภาค)</label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="HR, นโยบาย"
          className={INPUT}
        />
      </div>

      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#0055fa] hover:bg-[#0046d1] rounded-xl shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          <span>{uploading ? "กำลังอัปโหลด..." : "อัปโหลด"}</span>
        </button>
      </div>
    </form>
  );
}
