"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Database, Plus, RefreshCw, Search, Table2 } from "lucide-react";
import ConnectionAvatar from "@/components/studio/connections/ConnectionAvatar";
import { brandColor } from "@/components/studio/connections/DbLogo";
import { apiFetch, primaryButton, secondaryButton } from "@/components/studio/connections/ui";
import { TYPE_LABELS } from "@/lib/studio/connections/types";
import type { PublishedConnection } from "@/lib/studio/connections/userside";

type Filter = "all" | "selected";

export default function UserConnectionsPage({ userName }: { userName: string }) {
  const [state, setState] = useState<
    { state: "loading" } | { state: "error"; error: string } | { state: "ready"; items: PublishedConnection[] }
  >({ state: "loading" });
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await apiFetch<{ connections: PublishedConnection[] }>("/api/connections");
    setState(res.ok ? { state: "ready", items: res.data.connections } : { state: "error", error: res.error });
  }, []);

  useEffect(() => {
    // Initial fetch; setState happens after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const items = useMemo(() => (state.state === "ready" ? state.items : []), [state]);
  const selectedCount = items.filter((c) => c.selected).length;
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(
      (c) =>
        (filter === "all" || c.selected) &&
        (!q || [c.name, c.description, TYPE_LABELS[c.type], ...c.tables.map((t) => t.name)].some((v) => v.toLowerCase().includes(q)))
    );
  }, [items, filter, search]);

  const toggle = async (c: PublishedConnection) => {
    setBusyId(c.id);
    setError(null);
    const res = await apiFetch<{ connection: PublishedConnection }>(`/api/connections/${c.id}/selection`, {
      method: "PUT",
      body: JSON.stringify({ selected: !c.selected }),
    });
    setBusyId(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setState((prev) =>
      prev.state === "ready" ? { state: "ready", items: prev.items.map((x) => (x.id === c.id ? res.data.connection : x)) } : prev
    );
  };

  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-6 sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-gradient-to-br from-[#0055fa]/20 via-violet-500/10 to-transparent blur-3xl"
        />
        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0055fa] dark:text-blue-400">Databases</p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">เลือกฐานข้อมูลที่จะใช้</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              สวัสดี {userName} — เลือกฐานข้อมูลที่ต้องการให้ AI ใช้ตอบคำถามของคุณ ข้อมูลทั้งหมดอ่านอย่างเดียว
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 dark:bg-white/5 px-4 py-3">
            <Check className="w-5 h-5 text-emerald-500" />
            <p className="text-sm text-slate-600 dark:text-slate-300">
              เลือกแล้ว <strong className="text-xl tabular-nums text-slate-900 dark:text-white">{selectedCount}</strong> ฐานข้อมูล
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="inline-grid grid-cols-2 gap-1 p-1 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 self-start">
          {(
            [
              ["all", `ทั้งหมด (${items.length})`],
              ["selected", `ที่ฉันเลือก (${selectedCount})`],
            ] as [Filter, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer ${
                filter === id ? "bg-[#0055fa] text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ คำอธิบาย หรือชื่อตาราง"
            aria-label="ค้นหาฐานข้อมูล"
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-sm bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0055fa]"
          />
        </div>
      </div>

      {error && <p className="px-4 py-3 rounded-2xl text-sm bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400">{error}</p>}

      {state.state === "loading" && (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-64 rounded-3xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 animate-pulse" />
          ))}
        </ul>
      )}

      {state.state === "error" && (
        <div className="text-center py-12 rounded-3xl border border-dashed border-red-300 dark:border-red-500/30 space-y-3">
          <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
          <button type="button" className={secondaryButton} onClick={() => { setState({ state: "loading" }); void load(); }}>
            ลองอีกครั้ง
          </button>
        </div>
      )}

      {state.state === "ready" && visible.length === 0 && (
        <div className="text-center py-16 rounded-3xl border border-dashed border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.03]">
          <Database className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-base font-semibold text-slate-800 dark:text-slate-100">
            {items.length === 0 ? "ยังไม่มีฐานข้อมูลที่เปิดให้ใช้" : filter === "selected" ? "คุณยังไม่ได้เลือกฐานข้อมูล" : "ไม่พบฐานข้อมูลที่ค้นหา"}
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {items.length === 0 ? "เมื่อทีมผู้สร้างเผยแพร่ฐานข้อมูลแล้ว จะแสดงที่นี่" : "กด \"ใช้ฐานข้อมูลนี้\" ที่การ์ดเพื่อเลือก"}
          </p>
        </div>
      )}

      {visible.length > 0 && (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((c) => (
            <li
              key={c.id}
              className={`relative flex flex-col overflow-hidden rounded-3xl border bg-white dark:bg-white/[0.03] transition-all ${
                c.selected
                  ? "border-[#0055fa] ring-2 ring-[#0055fa]/20 shadow-lg"
                  : "border-slate-200 dark:border-white/10 shadow-sm hover:shadow-lg hover:-translate-y-0.5"
              }`}
            >
              <div aria-hidden="true" className="h-1.5" style={{ backgroundColor: brandColor(c.type) }} />
              <div className="flex-1 p-5 space-y-4">
                <div className="flex items-start gap-4">
                  <ConnectionAvatar connection={c} size="lg" />
                  <div className="min-w-0 flex-1 pl-1">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white break-words">{c.name}</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{TYPE_LABELS[c.type]}</p>
                  </div>
                  {c.selected && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#0055fa] text-white">
                      <Check className="w-3.5 h-3.5" /> ใช้อยู่
                    </span>
                  )}
                </div>
                {c.description && <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3">{c.description}</p>}
                <div>
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                    <Table2 className="w-3.5 h-3.5" /> {c.tableCount} ตาราง
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {c.tables.slice(0, 6).map((t) => (
                      <span
                        key={t.name}
                        title={t.description || t.name}
                        className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300"
                      >
                        {t.name}
                      </span>
                    ))}
                    {c.tables.length > 6 && <span className="text-[11px] text-slate-400">+{c.tables.length - 6}</span>}
                  </div>
                </div>
              </div>
              <div className="px-5 py-4 border-t border-slate-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => toggle(c)}
                  disabled={busyId === c.id}
                  className={`w-full ${c.selected ? secondaryButton : primaryButton}`}
                >
                  {busyId === c.id ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : c.selected ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {c.selected ? "เลิกใช้ฐานข้อมูลนี้" : "ใช้ฐานข้อมูลนี้"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
