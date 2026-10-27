"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Columns3, Eye, RefreshCw, Rows3, Search, Table2, X } from "lucide-react";
import Modal from "@/components/common/Modal";
import type { TableSchema } from "@/lib/studio/types";
import { TYPE_LABELS, type ConnectionView, type PreviewResult } from "@/lib/studio/connections/types";
import DbLogo, { brandColor } from "./DbLogo";
import { apiFetch, secondaryButton } from "./ui";

export type Load<T> = { state: "loading" } | { state: "error"; error: string } | { state: "ready"; data: T };
type Tab = "columns" | "preview";

const tableKey = (t: TableSchema) => `${t.schema}.${t.table}`;

export default function SchemaModal({
  connection,
  onClose,
}: {
  connection: ConnectionView;
  onClose: () => void;
}) {
  return (
    <Modal
      onClose={onClose}
      label={`Schema ของ ${connection.name}`}
      containerClassName="p-2 sm:p-4"
      panelClassName="w-full max-w-[1400px] h-[94vh] sm:h-[92vh] flex flex-col overflow-hidden rounded-3xl bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-white/10 shadow-2xl"
    >
      {/* Header */}
      <header className="relative shrink-0 flex items-center gap-4 px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-white/10 overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -left-10 w-64 h-40 rounded-full opacity-15 blur-3xl"
          style={{ backgroundColor: brandColor(connection.type) }}
        />
        <DbLogo type={connection.type} size="lg" />
        <div className="relative min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Schema · {TYPE_LABELS[connection.type]}
          </p>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate">{connection.name}</h2>
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">
            {connection.host}:{connection.port} / {connection.database}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิด"
          className="relative p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-white/10 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      <SchemaBrowser connection={connection} />
    </Modal>
  );
}

/** Table list + column/preview detail. Fills its parent, which must have a height. */
export function SchemaBrowser({ connection }: { connection: ConnectionView }) {
  const [tables, setTables] = useState<Load<TableSchema[]>>({ state: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [filter, setFilter] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ tables: TableSchema[] }>(`/api/studio/connections/${connection.id}/schema`).then((res) => {
      if (cancelled) return;
      setTables(res.ok ? { state: "ready", data: res.data.tables } : { state: "error", error: res.error });
    });
    return () => {
      cancelled = true;
    };
  }, [connection.id, reloadKey]);

  const all = useMemo(() => (tables.state === "ready" ? tables.data : []), [tables]);
  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? all.filter((t) => tableKey(t).toLowerCase().includes(q)) : all;
  }, [all, filter]);
  // Show the first table straight away instead of an empty right pane.
  const selected = all.find((t) => tableKey(t) === selectedKey) ?? all[0] ?? null;

  return (
    <>
        {tables.state === "loading" && (
          <div className="flex-1 grid md:grid-cols-[320px_1fr] min-h-0">
            <div className="p-4 space-y-2 border-r border-slate-200 dark:border-white/10">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="h-12 rounded-xl bg-slate-100 dark:bg-white/5 animate-pulse" />
              ))}
            </div>
            <div className="hidden md:flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <RefreshCw className="w-4 h-4 animate-spin" /> กำลังอ่านรายการตาราง…
            </div>
          </div>
        )}

        {tables.state === "error" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="text-sm text-red-600 dark:text-red-400 max-w-md">{tables.error}</p>
            <button
              type="button"
              className={secondaryButton}
              onClick={() => {
                setTables({ state: "loading" });
                setReloadKey((k) => k + 1);
              }}
            >
              <RefreshCw className="w-4 h-4" /> ลองอีกครั้ง
            </button>
          </div>
        )}

        {tables.state === "ready" && all.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
            <Table2 className="w-10 h-10 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
              ไม่พบตารางที่บัญชีนี้อ่านได้ ตรวจว่าได้ GRANT SELECT ให้บัญชีนี้แล้ว
            </p>
          </div>
        )}

        {tables.state === "ready" && all.length > 0 && (
          <div className="flex-1 min-h-0 flex flex-col md:grid md:grid-cols-[320px_1fr]">
            {/* Table list */}
            <aside className="min-h-0 max-h-[35vh] md:max-h-none flex flex-col border-b md:border-b-0 md:border-r border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02]">
              <div className="p-3 sm:p-4 pb-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0055fa]"
                    placeholder={`ค้นหาใน ${all.length} ตาราง`}
                    aria-label="ค้นหาตาราง"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                </div>
              </div>
              <ul className="flex-1 min-h-0 overflow-y-auto px-2 sm:px-3 pb-3 space-y-1">
                {visible.map((t) => {
                  const active = selected !== null && tableKey(t) === tableKey(selected);
                  return (
                    <li key={tableKey(t)}>
                      <button
                        type="button"
                        onClick={() => setSelectedKey(tableKey(t))}
                        aria-current={active ? "true" : undefined}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left cursor-pointer transition-colors ${
                          active
                            ? "bg-white dark:bg-white/10 shadow-sm ring-1 ring-[#0055fa]/40"
                            : "hover:bg-white/80 dark:hover:bg-white/5"
                        }`}
                      >
                        <span
                          className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
                            active
                              ? "bg-[#0055fa] text-white"
                              : "bg-slate-200/70 dark:bg-white/10 text-slate-500 dark:text-slate-300"
                          }`}
                        >
                          <Table2 className="w-4 h-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium font-mono text-slate-800 dark:text-slate-100 truncate">
                            {t.table}
                          </span>
                          <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {t.schema} · {t.columns.length} คอลัมน์
                            {t.rowEstimate !== null && ` · ~${t.rowEstimate.toLocaleString("th-TH")} แถว`}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
                {visible.length === 0 && (
                  <li className="px-3 py-6 text-center text-xs text-slate-500 dark:text-slate-400">ไม่พบตารางที่ค้นหา</li>
                )}
              </ul>
            </aside>

            {/* Detail */}
            <div className="flex-1 min-h-0 min-w-0">
              {selected && <TableDetail key={tableKey(selected)} connectionId={connection.id} table={selected} />}
            </div>
          </div>
        )}
    </>
  );
}

function StatChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
      {icon}
      {label}
    </span>
  );
}

function TableDetail({ connectionId, table }: { connectionId: number; table: TableSchema }) {
  const [tab, setTab] = useState<Tab>("columns");
  const [preview, setPreview] = useState<Load<PreviewResult>>({ state: "loading" });

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ schema: table.schema, table: table.table });
    apiFetch<PreviewResult>(`/api/studio/connections/${connectionId}/preview?${params}`).then((res) => {
      if (cancelled) return;
      setPreview(res.ok ? { state: "ready", data: res.data } : { state: "error", error: res.error });
    });
    return () => {
      cancelled = true;
    };
  }, [connectionId, table.schema, table.table]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "columns", label: "คอลัมน์", icon: <Columns3 className="w-4 h-4" />, count: table.columns.length },
    {
      id: "preview",
      label: "ตัวอย่างข้อมูล",
      icon: <Eye className="w-4 h-4" />,
      count: preview.state === "ready" ? preview.data.rows.length : undefined,
    },
  ];

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="shrink-0 px-4 sm:px-6 pt-5 pb-0 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{table.schema}</p>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-mono break-all">
              {table.table}
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatChip icon={<Columns3 className="w-3.5 h-3.5" />} label={`${table.columns.length} คอลัมน์`} />
            {table.rowEstimate !== null && (
              <StatChip
                icon={<Rows3 className="w-3.5 h-3.5" />}
                label={`~${table.rowEstimate.toLocaleString("th-TH")} แถว`}
              />
            )}
          </div>
        </div>

        <div role="tablist" aria-label="รายละเอียดตาราง" className="flex gap-1 border-b border-slate-200 dark:border-white/10">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 -mb-px text-sm font-semibold border-b-2 cursor-pointer transition-colors ${
                  active
                    ? "border-[#0055fa] text-[#0055fa] dark:text-blue-400 dark:border-blue-400"
                    : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {t.icon}
                {t.label}
                {t.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[11px] tabular-nums ${
                      active ? "bg-[#0055fa]/10 dark:bg-blue-400/15" : "bg-slate-100 dark:bg-white/10"
                    }`}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div role="tabpanel" className="flex-1 min-h-0 overflow-auto px-4 sm:px-6 py-4">
        {tab === "columns" ? <ColumnsGrid table={table} /> : <PreviewGrid preview={preview} />}
      </div>
    </div>
  );
}

// ---------- Columns

type TypeKind = "number" | "text" | "date" | "bool" | "json" | "other";

const KIND_STYLES: Record<TypeKind, { label: string; className: string }> = {
  number: { label: "ตัวเลข", className: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300" },
  text: { label: "ข้อความ", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" },
  date: { label: "วันเวลา", className: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" },
  bool: { label: "จริง/เท็จ", className: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300" },
  json: { label: "โครงสร้าง", className: "bg-pink-50 text-pink-700 dark:bg-pink-500/10 dark:text-pink-300" },
  other: { label: "อื่นๆ", className: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300" },
};

function typeKind(dataType: string): TypeKind {
  const t = dataType.toLowerCase();
  if (/json|array|\[\]|map\(|tuple|object|xml/.test(t)) return "json";
  if (/bool|^bit\b/.test(t)) return "bool";
  if (/date|time|interval|year/.test(t)) return "date";
  if (/int|numeric|decimal|float|double|real|number|money|serial|dec\b/.test(t)) return "number";
  if (/char|text|string|clob|enum|uuid|name|set\(/.test(t)) return "text";
  return "other";
}

function ColumnsGrid({ table }: { table: TableSchema }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-[#111a2e] text-slate-500 dark:text-slate-400">
          <tr>
            <th className="w-12 text-right font-semibold px-3 py-2.5 text-xs">#</th>
            <th className="text-left font-semibold px-3 py-2.5 text-xs">ชื่อคอลัมน์</th>
            <th className="text-left font-semibold px-3 py-2.5 text-xs">ชนิดข้อมูล</th>
            <th className="text-left font-semibold px-3 py-2.5 text-xs">ว่างได้</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {table.columns.map((c, i) => {
            const kind = KIND_STYLES[typeKind(c.dataType)];
            return (
              <tr key={c.name} className="hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                <td className="px-3 py-2.5 text-right text-xs text-slate-400 tabular-nums">{i + 1}</td>
                <td className="px-3 py-2.5 font-mono font-medium text-slate-800 dark:text-slate-100">{c.name}</td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${kind.className}`}>{kind.label}</span>
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{c.dataType}</span>
                  </span>
                </td>
                <td className="px-3 py-2.5 text-xs">
                  {c.nullable ? (
                    <span className="text-slate-500 dark:text-slate-400">ได้</span>
                  ) : (
                    <span className="font-semibold text-slate-700 dark:text-slate-200">ไม่ได้</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Preview

export function PreviewGrid({ preview }: { preview: Load<PreviewResult> }) {
  if (preview.state === "loading") {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-9 rounded-lg bg-slate-100 dark:bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }
  if (preview.state === "error") {
    return <p className="py-10 text-center text-sm text-red-600 dark:text-red-400">{preview.error}</p>;
  }
  const { columns, rows } = preview.data;
  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">ตารางนี้ยังไม่มีข้อมูล</p>;
  }
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500 dark:text-slate-400">แสดง {rows.length} แถวแรก (สูงสุด 5 แถว) · อ่านอย่างเดียว</p>
      <div className="overflow-auto rounded-2xl border border-slate-200 dark:border-white/10 max-h-[60vh]">
        <table className="text-sm whitespace-nowrap border-separate border-spacing-0">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="sticky left-0 z-20 w-10 px-3 py-2.5 text-right text-xs font-semibold text-slate-400 bg-slate-50 dark:bg-[#111a2e] border-b border-slate-200 dark:border-white/10">
                #
              </th>
              {columns.map((c) => (
                <th
                  key={c}
                  className="text-left px-3 py-2.5 text-xs font-semibold font-mono text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#111a2e] border-b border-slate-200 dark:border-white/10"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="odd:bg-white even:bg-slate-50/60 dark:odd:bg-transparent dark:even:bg-white/[0.02]">
                <td className="sticky left-0 px-3 py-2 text-right text-xs text-slate-400 tabular-nums bg-inherit border-b border-slate-100 dark:border-white/5">
                  {i + 1}
                </td>
                {columns.map((c) => (
                  <td
                    key={c}
                    className="px-3 py-2 max-w-xs truncate text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-white/5"
                    title={cellText(row[c])}
                  >
                    {row[c] === null ? (
                      <span className="px-1.5 py-0.5 rounded text-[11px] italic text-slate-400 bg-slate-100 dark:bg-white/5">null</span>
                    ) : (
                      cellText(row[c])
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : String(value);
}
