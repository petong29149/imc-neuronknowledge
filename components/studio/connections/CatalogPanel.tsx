"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  Sparkles,
  Table2,
} from "lucide-react";
import type { CatalogColumn, CatalogTable, ConnectionView, PreviewResult } from "@/lib/studio/connections/types";
import AiModelSelect from "./AiModelSelect";
import { PreviewGrid, type Load } from "./SchemaModal";
import { apiFetch, DescriptionBadge, formatDateTime, primaryButton, secondaryButton, Toggle } from "./ui";

type Filter = "all" | "enabled" | "todo";

const textArea =
  "w-full px-3.5 py-2.5 rounded-xl text-sm bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0055fa]";

const keyOf = (t: CatalogTable) => t.id;

export default function CatalogPanel({
  connection,
  onCatalogChanged,
}: {
  connection: ConnectionView;
  /** Called after sync or enable/disable so the parent can refresh counts */
  onCatalogChanged: () => void;
}) {
  const [tables, setTables] = useState<Load<CatalogTable[]>>({ state: "loading" });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [modelId, setModelId] = useState<number | null>(null);
  const [includeSamples, setIncludeSamples] = useState(true);
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ tables: CatalogTable[] }>(`/api/studio/connections/${connection.id}/catalog`).then((res) => {
      if (cancelled) return;
      setTables(res.ok ? { state: "ready", data: res.data.tables } : { state: "error", error: res.error });
    });
    return () => {
      cancelled = true;
    };
  }, [connection.id]);

  const all = useMemo(() => (tables.state === "ready" ? tables.data : []), [tables]);
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((t) => {
      if (filter === "enabled" && !t.enabled) return false;
      if (filter === "todo" && (!t.enabled || t.status === "approved")) return false;
      return !q || `${t.schema}.${t.table}`.toLowerCase().includes(q);
    });
  }, [all, filter, search]);
  const selected = all.find((t) => t.id === selectedId) ?? visible[0] ?? null;

  const enabledCount = all.filter((t) => t.enabled && !t.missing).length;
  const approvedCount = all.filter((t) => t.enabled && !t.missing && t.status === "approved").length;

  const replaceTables = (updated: CatalogTable[]) =>
    setTables((prev) =>
      prev.state === "ready"
        ? { state: "ready", data: prev.data.map((t) => updated.find((u) => u.id === t.id) ?? t) }
        : prev
    );

  const sync = async () => {
    setSyncing(true);
    setNotice(null);
    const res = await apiFetch<{ added: number; removed: number; tables: CatalogTable[] }>(
      `/api/studio/connections/${connection.id}/catalog/sync`,
      { method: "POST" }
    );
    setSyncing(false);
    if (!res.ok) {
      setNotice({ tone: "error", text: res.error });
      return;
    }
    setTables({ state: "ready", data: res.data.tables });
    setNotice({
      tone: "ok",
      text: `ดึงรายการแล้ว ${res.data.tables.length} ตาราง (ใหม่ ${res.data.added}, ไม่พบใน DB ${res.data.removed}) ตารางใหม่ยังปิดอยู่ ให้เปิดเฉพาะตารางที่ต้องการให้ AI ใช้`,
    });
    onCatalogChanged();
  };

  const updateTable = async (table: CatalogTable, body: Record<string, unknown>): Promise<boolean> => {
    const res = await apiFetch<{ table: CatalogTable }>(
      `/api/studio/connections/${connection.id}/catalog/tables/${table.id}`,
      { method: "PUT", body: JSON.stringify(body) }
    );
    if (!res.ok) {
      setNotice({ tone: "error", text: res.error });
      return false;
    }
    replaceTables([res.data.table]);
    if ("enabled" in body) onCatalogChanged();
    return true;
  };

  const updateColumn = async (column: CatalogColumn, body: Record<string, unknown>): Promise<boolean> => {
    const res = await apiFetch<{ table: CatalogTable }>(
      `/api/studio/connections/${connection.id}/catalog/columns/${column.id}`,
      { method: "PUT", body: JSON.stringify(body) }
    );
    if (!res.ok) {
      setNotice({ tone: "error", text: res.error });
      return false;
    }
    replaceTables([res.data.table]);
    return true;
  };

  const aiDraft = async (tableIds: number[]): Promise<boolean> => {
    const res = await apiFetch<{ tables: CatalogTable[]; skipped: string[] }>(
      `/api/studio/connections/${connection.id}/catalog/describe`,
      { method: "POST", body: JSON.stringify({ tableIds, modelId, includeSamples }) }
    );
    if (!res.ok) {
      setNotice({ tone: "error", text: res.error });
      return false;
    }
    replaceTables(res.data.tables);
    return true;
  };

  const draftAllMissing = async () => {
    const todo = all.filter((t) => t.enabled && !t.missing && t.status === "empty").map(keyOf);
    if (todo.length === 0) {
      setNotice({ tone: "ok", text: "ทุกตารางที่เปิดใช้มีคำอธิบายแล้ว" });
      return;
    }
    setNotice(null);
    setBulk({ done: 0, total: todo.length });
    for (let i = 0; i < todo.length; i += 2) {
      if (!(await aiDraft(todo.slice(i, i + 2)))) break;
      setBulk({ done: Math.min(i + 2, todo.length), total: todo.length });
    }
    setBulk(null);
    setNotice({ tone: "ok", text: "AI ร่างคำอธิบายเสร็จแล้ว ตรวจและกด \"ยืนยัน\" ทีละตาราง" });
  };

  if (tables.state === "loading") {
    return <div className="h-96 rounded-3xl bg-slate-100 dark:bg-white/5 animate-pulse" />;
  }
  if (tables.state === "error") {
    return <p className="py-10 text-center text-sm text-red-600 dark:text-red-400">{tables.error}</p>;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col xl:flex-row xl:items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={secondaryButton} onClick={sync} disabled={syncing}>
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {all.length === 0 ? "ดึงรายการตารางจาก DB" : "Sync รายการตาราง"}
          </button>
          {connection.catalogSyncedAt && (
            <span className="text-xs text-slate-500 dark:text-slate-400">ล่าสุด {formatDateTime(connection.catalogSyncedAt)}</span>
          )}
        </div>
        {all.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <AiModelSelect value={modelId} onChange={setModelId} />
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSamples}
                onChange={(e) => setIncludeSamples(e.target.checked)}
                className="accent-[#0055fa]"
              />
              ส่งตัวอย่างข้อมูล 5 แถวให้ AI (ไม่รวมคอลัมน์ PII)
            </label>
            <button type="button" className={primaryButton} onClick={draftAllMissing} disabled={bulk !== null || enabledCount === 0}>
              {bulk ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {bulk ? `AI กำลังร่าง ${bulk.done}/${bulk.total}` : "AI ร่างทุกตารางที่ยังว่าง"}
            </button>
          </div>
        )}
      </div>

      {notice && (
        <div
          role="status"
          className={`px-4 py-3 rounded-2xl text-sm ${
            notice.tone === "ok"
              ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400"
          }`}
        >
          {notice.text}
        </div>
      )}

      {all.length === 0 ? (
        <div className="text-center py-14 rounded-3xl border border-dashed border-slate-300 dark:border-white/10">
          <Table2 className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-100">ยังไม่มีแคตตาล็อก</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            กด &quot;ดึงรายการตารางจาก DB&quot; แล้วเลือกเปิดเฉพาะตารางที่ต้องการให้ AI และ MCP ใช้ จากนั้นเขียนหรือให้ AI ร่างคำอธิบาย
          </p>
        </div>
      ) : (
        <>
          {/* Progress */}
          <div className="grid grid-cols-3 gap-3">
            <Stat label="ตารางทั้งหมด" value={all.length} />
            <Stat label="เปิดใช้" value={enabledCount} tone="blue" />
            <Stat label="คำอธิบายยืนยันแล้ว" value={`${approvedCount}/${enabledCount}`} tone="green" />
          </div>

          <div className="grid gap-4 lg:grid-cols-[300px_1fr] items-start">
            {/* Table list */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
              <div className="p-3 space-y-2 border-b border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-white/[0.02]">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ค้นหาตาราง"
                    aria-label="ค้นหาตาราง"
                    className="w-full pl-9 pr-3 py-2 rounded-xl text-sm bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0055fa]"
                  />
                </div>
                <div className="flex gap-1">
                  {(
                    [
                      ["all", "ทั้งหมด"],
                      ["enabled", "เปิดใช้"],
                      ["todo", "ยังไม่ยืนยัน"],
                    ] as [Filter, string][]
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setFilter(id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                        filter === id
                          ? "bg-[#0055fa] text-white"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <ul className="max-h-[560px] overflow-y-auto p-2 space-y-1">
                {visible.map((t) => {
                  const active = selected?.id === t.id;
                  return (
                    <li key={t.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedId(t.id)}
                        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelectedId(t.id)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer ${
                          active ? "bg-blue-50 dark:bg-blue-500/10 ring-1 ring-[#0055fa]/30" : "hover:bg-slate-50 dark:hover:bg-white/5"
                        }`}
                      >
                        <Toggle
                          size="sm"
                          checked={t.enabled}
                          disabled={t.missing}
                          label={t.enabled ? `ปิดการใช้ ${t.table}` : `เปิดใช้ ${t.table}`}
                          onChange={(next) => void updateTable(t, { enabled: next })}
                        />
                        <span className="min-w-0 flex-1">
                          <span className={`block text-sm font-mono truncate ${t.enabled ? "font-semibold text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
                            {t.table}
                          </span>
                          <span className="block text-[11px] text-slate-400 truncate">
                            {t.schema} · {t.columns.length} คอลัมน์
                          </span>
                        </span>
                        {t.missing ? (
                          <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">ไม่พบใน DB</span>
                        ) : (
                          <DescriptionBadge status={t.status} />
                        )}
                      </div>
                    </li>
                  );
                })}
                {visible.length === 0 && (
                  <li className="px-3 py-6 text-center text-xs text-slate-500 dark:text-slate-400">ไม่มีตารางตามตัวกรองนี้</li>
                )}
              </ul>
            </div>

            {selected && (
              <TableEditor
                key={selected.id}
                connectionId={connection.id}
                table={selected}
                onUpdateTable={(body) => updateTable(selected, body)}
                onUpdateColumn={updateColumn}
                onAiDraft={() => aiDraft([selected.id])}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "blue" | "green" }) {
  const color =
    tone === "blue" ? "text-[#0055fa] dark:text-blue-400" : tone === "green" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white";
  return (
    <div className="rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 px-4 py-3">
      <p className="text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function TableEditor({
  connectionId,
  table,
  onUpdateTable,
  onUpdateColumn,
  onAiDraft,
}: {
  connectionId: number;
  table: CatalogTable;
  onUpdateTable: (body: Record<string, unknown>) => Promise<boolean>;
  onUpdateColumn: (column: CatalogColumn, body: Record<string, unknown>) => Promise<boolean>;
  onAiDraft: () => Promise<boolean>;
}) {
  const [description, setDescription] = useState(table.description);
  const [synonyms, setSynonyms] = useState(table.synonyms.join(", "));
  const [questions, setQuestions] = useState(table.sampleQuestions.join("\n"));
  const [saving, setSaving] = useState<"draft" | "approved" | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [preview, setPreview] = useState<Load<PreviewResult> | null>(null);
  const [savedFor, setSavedFor] = useState(table.updatedAt);

  // When the server copy changes (AI draft, column edit) pull the new text into the form.
  if (savedFor !== table.updatedAt) {
    setSavedFor(table.updatedAt);
    setDescription(table.description);
    setSynonyms(table.synonyms.join(", "));
    setQuestions(table.sampleQuestions.join("\n"));
  }

  const dirty =
    description !== table.description ||
    synonyms !== table.synonyms.join(", ") ||
    questions !== table.sampleQuestions.join("\n");

  const save = async (status: "draft" | "approved") => {
    setSaving(status);
    await onUpdateTable({
      description,
      synonyms: synonyms.split(",").map((s) => s.trim()).filter(Boolean),
      sampleQuestions: questions.split("\n").map((s) => s.trim()).filter(Boolean),
      status: description.trim() ? status : "empty",
    });
    setSaving(null);
  };

  const togglePreview = async () => {
    const next = !showPreview;
    setShowPreview(next);
    if (next && !preview) {
      setPreview({ state: "loading" });
      const params = new URLSearchParams({ schema: table.schema, table: table.table });
      const res = await apiFetch<PreviewResult>(`/api/studio/connections/${connectionId}/preview?${params}`);
      setPreview(res.ok ? { state: "ready", data: res.data } : { state: "error", error: res.error });
    }
  };

  const describedColumns = table.columns.filter((c) => c.description && c.status === "draft");

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 justify-between px-5 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-white/[0.02]">
        <div className="min-w-0">
          <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{table.schema}</p>
          <h3 className="text-lg font-bold font-mono text-slate-900 dark:text-white break-all">{table.table}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <DescriptionBadge status={table.status} />
            {table.rowEstimate !== null && <span>~{table.rowEstimate.toLocaleString("th-TH")} แถว</span>}
            <span>{table.columns.length} คอลัมน์</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <Toggle
              checked={table.enabled}
              disabled={table.missing}
              label="เปิดให้ AI/MCP ใช้ตารางนี้"
              onChange={(next) => void onUpdateTable({ enabled: next })}
            />
            เปิดให้ AI/MCP ใช้
          </label>
          <button
            type="button"
            className={secondaryButton}
            disabled={drafting}
            onClick={async () => {
              setDrafting(true);
              await onAiDraft();
              setDrafting(false);
            }}
          >
            {drafting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            AI ร่างคำอธิบาย
          </button>
        </div>
      </div>

      {table.missing && (
        <p className="flex items-center gap-2 px-5 py-3 text-sm bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400">
          <AlertTriangle className="w-4 h-4" /> ไม่พบตารางนี้ใน DB ตอน sync ล่าสุด คำอธิบายยังเก็บไว้ ถ้าตารางกลับมาจะใช้ต่อได้
        </p>
      )}

      <div className="p-5 space-y-5">
        <div className="space-y-3">
          <label className="block">
            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              คำอธิบายตาราง <span className="font-normal text-slate-400">— ตารางนี้เก็บอะไร 1 แถวคืออะไร ใช้ตอบคำถามแบบไหน</span>
            </span>
            <textarea
              rows={4}
              value={description}
              maxLength={4000}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="เช่น สถิติมูลค่าการส่งออกรายเดือน แยกตามพิกัดศุลกากร (HS) และประเทศปลายทาง 1 แถว = 1 พิกัด × 1 ประเทศ × 1 เดือน หน่วยมูลค่าเป็นบาท"
              className={textArea}
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">คำพ้อง (คั่นด้วย ,)</span>
              <input
                value={synonyms}
                onChange={(e) => setSynonyms(e.target.value)}
                placeholder="ยอดส่งออก, export stats"
                className={textArea}
              />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">ตัวอย่างคำถาม (บรรทัดละ 1 ข้อ)</span>
              <textarea
                rows={2}
                value={questions}
                onChange={(e) => setQuestions(e.target.value)}
                placeholder="ส่งออกข้าวไปจีนเดือนไหนมากที่สุด"
                className={textArea}
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-end">
            {dirty && <span className="text-xs text-amber-600 dark:text-amber-400 mr-auto">ยังไม่ได้บันทึก</span>}
            <button type="button" className={secondaryButton} disabled={saving !== null || !dirty} onClick={() => save("draft")}>
              {saving === "draft" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              บันทึกร่าง
            </button>
            <button
              type="button"
              className={primaryButton}
              disabled={saving !== null || !description.trim() || (!dirty && table.status === "approved")}
              onClick={() => save("approved")}
            >
              {saving === "approved" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              ยืนยันคำอธิบาย
            </button>
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">คอลัมน์</h4>
            <div className="flex items-center gap-2">
              {describedColumns.length > 0 && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 cursor-pointer"
                  onClick={async () => {
                    for (const c of describedColumns) await onUpdateColumn(c, { status: "approved" });
                  }}
                >
                  <CheckCheck className="w-4 h-4" /> ยืนยันคอลัมน์ที่ร่างไว้ ({describedColumns.length})
                </button>
              )}
              <button
                type="button"
                onClick={togglePreview}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
              >
                {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showPreview ? "ซ่อนตัวอย่างข้อมูล" : "ดูตัวอย่างข้อมูล"}
              </button>
            </div>
          </div>

          {showPreview && preview && (
            <div className="mb-4">
              <PreviewGrid preview={preview} />
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-white/5 text-xs text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2.5 text-left font-semibold w-14">ใช้</th>
                  <th className="px-3 py-2.5 text-left font-semibold">คอลัมน์</th>
                  <th className="px-3 py-2.5 text-left font-semibold w-16">PII</th>
                  <th className="px-3 py-2.5 text-left font-semibold min-w-[18rem]">คำอธิบาย</th>
                  <th className="px-3 py-2.5 text-left font-semibold w-28">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {table.columns.map((c) => (
                  <ColumnRow key={c.id} column={c} onUpdate={(body) => onUpdateColumn(c, body)} />
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            คอลัมน์ที่ปิดหรือติดธง PII จะไม่ถูกส่งให้ AI และ API ของ MCP จะไม่คืนค่า • คำอธิบายคอลัมน์บันทึกอัตโนมัติเมื่อออกจากช่อง
          </p>
        </div>
      </div>
    </div>
  );
}

function ColumnRow({
  column: c,
  onUpdate,
}: {
  column: CatalogColumn;
  onUpdate: (body: Record<string, unknown>) => Promise<boolean>;
}) {
  const [text, setText] = useState(c.description);
  const [saving, setSaving] = useState(false);
  const [seen, setSeen] = useState(c.description);
  if (seen !== c.description) {
    setSeen(c.description);
    setText(c.description);
  }

  const commit = async () => {
    if (text.trim() === c.description) return;
    setSaving(true);
    await onUpdate({ description: text.trim() });
    setSaving(false);
  };

  return (
    <tr className={c.enabled && !c.isPii ? "" : "bg-slate-50/70 dark:bg-white/[0.02]"}>
      <td className="px-3 py-2 align-top">
        <Toggle size="sm" checked={c.enabled} label={`ใช้คอลัมน์ ${c.name}`} onChange={(next) => void onUpdate({ enabled: next })} />
      </td>
      <td className="px-3 py-2 align-top">
        <p className={`font-mono text-sm ${c.enabled ? "text-slate-900 dark:text-white" : "text-slate-400 line-through"}`}>{c.name}</p>
        <p className="font-mono text-[11px] text-slate-400">
          {c.dataType}
          {c.missing && <span className="ml-1 text-red-500">· ไม่พบใน DB</span>}
        </p>
      </td>
      <td className="px-3 py-2 align-top">
        <button
          type="button"
          onClick={() => void onUpdate({ isPii: !c.isPii })}
          aria-pressed={c.isPii}
          title={c.isPii ? "ข้อมูลส่วนบุคคล (ไม่ส่งให้ AI/MCP) — กดเพื่อยกเลิก" : "ติดธงข้อมูลส่วนบุคคล"}
          className={`p-1.5 rounded-lg cursor-pointer ${
            c.isPii
              ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
              : "text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400"
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
        </button>
      </td>
      <td className="px-3 py-2 align-top">
        <textarea
          rows={1}
          value={text}
          maxLength={2000}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          placeholder="ความหมาย หน่วย หรือค่าที่เป็นไปได้"
          className="w-full min-h-[2.25rem] px-2.5 py-1.5 rounded-lg text-sm bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-white/10 focus:border-slate-200 dark:focus:border-white/10 focus:bg-white dark:focus:bg-white/5 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0055fa] resize-y"
        />
        {c.exampleValues.length > 0 && (
          <p className="px-2.5 text-[11px] text-slate-400 truncate">ตัวอย่าง: {c.exampleValues.join(", ")}</p>
        )}
      </td>
      <td className="px-3 py-2 align-top">
        <div className="flex items-center gap-1.5">
          {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" /> : <DescriptionBadge status={c.status} />}
          {c.status === "draft" && !saving && (
            <button
              type="button"
              onClick={() => void onUpdate({ status: "approved" })}
              title="ยืนยันคำอธิบายคอลัมน์นี้"
              className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
