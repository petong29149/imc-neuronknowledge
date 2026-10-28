"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Building2, Database, Moon, RefreshCw, Sun, Trash2, X } from "lucide-react";
import Modal from "@/components/common/Modal";
import KnowledgeDocumentTable from "@/components/knowledge/KnowledgeDocumentTable";
import KnowledgeUploadForm from "@/components/knowledge/KnowledgeUploadForm";
import { KnowledgeDocument, KnowledgeOrg, isBusy } from "@/components/knowledge/knowledge-format";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/app/theme-provider";

const POLL_MS = 5000;

type LoadResult = { documents: KnowledgeDocument[] } | { error: string };

async function loadDocuments(orgId: string): Promise<LoadResult> {
  try {
    const res = await fetch(`/api/knowledge/documents?org_id=${encodeURIComponent(orgId)}`);
    const data = await res.json();
    return res.ok ? { documents: data.documents || [] } : { error: data.error || "โหลดรายการเอกสารไม่สำเร็จ" };
  } catch {
    return { error: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" };
  }
}

export default function KnowledgeWorkspace() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [orgs, setOrgs] = useState<KnowledgeOrg[] | null>(null);
  const [orgId, setOrgId] = useState<string>("");
  const [maxFileMb, setMaxFileMb] = useState(50);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  // The org whose list is on screen; while it differs from orgId the first load is still running
  const [loadedOrgId, setLoadedOrgId] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<KnowledgeDocument | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }, []);

  // Organizations come from the server (group membership); the page only picks among them
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/knowledge/orgs");
        const data = await res.json();
        if (!res.ok) {
          setOrgs([]);
          showToast(data.error || "โหลดรายชื่อองค์กรไม่สำเร็จ", "error");
          return;
        }
        setOrgs(data.orgs || []);
        if (data.max_file_mb) setMaxFileMb(data.max_file_mb);
        if (data.orgs?.length) setOrgId(data.orgs[0].org_id);
      } catch {
        setOrgs([]);
        showToast("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", "error");
      }
    })();
  }, [showToast]);

  /** Apply a loaded list unless the user has switched organization meanwhile. */
  const applyResult = useCallback(
    (forOrg: string, result: LoadResult, quiet: boolean) => {
      if ("documents" in result) setDocuments(result.documents);
      else if (!quiet) showToast(result.error, "error");
      setLoadedOrgId(forOrg);
    },
    [showToast]
  );

  const fetchDocuments = useCallback(
    async (quiet = false) => {
      if (!orgId) return;
      applyResult(orgId, await loadDocuments(orgId), quiet);
    },
    [orgId, applyResult]
  );
  const isLoading = orgId !== "" && loadedOrgId !== orgId;

  const refresh = async () => {
    setRefreshing(true);
    await fetchDocuments();
    setRefreshing(false);
  };

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    loadDocuments(orgId).then((result) => {
      if (!cancelled) applyResult(orgId, result, false);
    });
    return () => {
      cancelled = true;
    };
  }, [orgId, applyResult]);

  const switchOrg = (next: string) => {
    setDocuments([]); // never show one organization's documents under another's name
    setOrgId(next);
  };

  // Keep refreshing while the worker is still busy with any document
  const anyBusy = documents.some(isBusy);
  useEffect(() => {
    if (!anyBusy) return;
    const timer = setInterval(() => fetchDocuments(true), POLL_MS);
    return () => clearInterval(timer);
  }, [anyBusy, fetchDocuments]);

  const documentAction = async (doc: KnowledgeDocument, action: "reindex" | "delete") => {
    const base = `/api/knowledge/documents/${encodeURIComponent(doc.doc_id)}`;
    const url = `${action === "reindex" ? `${base}/reindex` : base}?org_id=${encodeURIComponent(orgId)}`;
    try {
      const res = await fetch(url, { method: action === "reindex" ? "POST" : "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast(action === "reindex" ? `ส่ง "${doc.filename}" ไปประมวลผลใหม่แล้ว` : `กำลังลบ "${doc.filename}"`);
        fetchDocuments(true);
      } else {
        showToast(data.error || "ทำรายการไม่สำเร็จ", "error");
      }
    } catch {
      showToast("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", "error");
    }
  };

  const currentOrg = orgs?.find((o) => o.org_id === orgId);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14]">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#070b14]/85 backdrop-blur-xl shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/chat"
              title="กลับไปหน้าแชท"
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0055fa] to-[#2670ff] text-white shadow-xs shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold tracking-tight text-slate-900 dark:text-white leading-tight">คลังความรู้องค์กร</h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                อัปโหลดเอกสารให้ AI ใช้ตอบคำถามพร้อมอ้างอิงแหล่งที่มา
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-all cursor-pointer"
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-[#fec921]" /> : <Moon className="w-4 h-4 text-[#0055fa]" />}
            </button>
            <div className="hidden sm:block text-right text-xs font-semibold text-slate-900 dark:text-white">{user?.name}</div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-5">
        {orgs === null ? (
          <div className="py-16 text-center text-sm text-slate-500">
            <RefreshCw className="w-4 h-4 inline animate-spin mr-2" />
            กำลังโหลด...
          </div>
        ) : orgs.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-white/10 rounded-3xl">
            <Building2 className="w-8 h-8 mx-auto text-slate-400" />
            <h2 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">บัญชีนี้ยังไม่ได้อยู่ในองค์กรใด</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              ผู้ดูแลระบบต้องเพิ่มคุณเข้ากลุ่มที่มี &quot;รหัสองค์กร&quot; ก่อน (Admin → จัดการผู้ใช้งาน → กลุ่ม)
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <Building2 className="w-4 h-4 text-slate-400" />
                {orgs.length > 1 ? (
                  <select
                    value={orgId}
                    onChange={(e) => switchOrg(e.target.value)}
                    aria-label="เลือกองค์กร"
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0055fa]"
                  >
                    {orgs.map((o) => (
                      <option key={o.org_id} value={o.org_id}>
                        {o.name} ({o.org_id})
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {currentOrg?.name} <span className="font-mono text-slate-400">({currentOrg?.org_id})</span>
                  </span>
                )}
              </div>
              <button
                onClick={refresh}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl text-slate-600 dark:text-slate-300 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading || refreshing ? "animate-spin" : ""}`} />
                <span>รีเฟรช</span>
              </button>
            </div>

            <KnowledgeUploadForm
              key={orgId}
              orgId={orgId}
              maxFileMb={maxFileMb}
              onUploaded={(message) => {
                showToast(message);
                fetchDocuments(true);
              }}
              onError={(message) => showToast(message, "error")}
            />

            <KnowledgeDocumentTable
              documents={documents}
              isLoading={isLoading}
              onReindex={(doc) => documentAction(doc, "reindex")}
              onDelete={setConfirmDelete}
            />
          </>
        )}
      </main>

      {confirmDelete && (
        <Modal
          onClose={() => setConfirmDelete(null)}
          panelClassName="w-full max-w-md p-6 space-y-4 bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">ลบเอกสารนี้?</h2>
            </div>
            <button
              onClick={() => setConfirmDelete(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            <span className="font-semibold break-all">{confirmDelete.filename}</span> จะถูกลบออกจากคลังความรู้ทั้งไฟล์และดัชนีค้นหา
            AI จะไม่ใช้เอกสารนี้ตอบคำถามอีก ยกเลิกไม่ได้
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setConfirmDelete(null)}
              className="px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              onClick={() => {
                const doc = confirmDelete;
                setConfirmDelete(null);
                documentAction(doc, "delete");
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>ลบเอกสาร</span>
            </button>
          </div>
        </Modal>
      )}

      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-50 max-w-sm px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold border ${
            toast.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-500/30"
              : "bg-rose-50 dark:bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-500/30"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
