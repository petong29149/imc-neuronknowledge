"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Code2,
  Globe2,
  ImageIcon,
  LayoutDashboard,
  Library,
  Maximize2,
  Pencil,
  PlugZap,
  Plug,
  Plus,
  PowerOff,
  RefreshCw,
  Search,
  ShieldCheck,
  Table2,
  Trash2,
  XCircle,
} from "lucide-react";
import Modal from "@/components/common/Modal";
import type { ConnectionStatus } from "@/lib/studio/types";
import {
  CONNECTION_TYPES,
  TYPE_HINTS,
  TYPE_LABELS,
  type ConnectionView,
  type TestResult,
} from "@/lib/studio/connections/types";
import CatalogPanel from "./CatalogPanel";
import ConnectionAvatar from "./ConnectionAvatar";
import ConnectionFormModal from "./ConnectionFormModal";
import DbLogo, { brandColor } from "./DbLogo";
import IconPickerModal from "./IconPickerModal";
import McpPanel from "./McpPanel";
import QueryPanel from "./QueryPanel";
import SchemaModal from "./SchemaModal";
import {
  apiFetch,
  formatDateTime,
  ghostButton,
  modalPanel,
  ModalHeader,
  primaryButton,
  secondaryButton,
  StatusBadge,
  Toggle,
} from "./ui";

type ListState =
  | { state: "loading" }
  | { state: "error"; error: string }
  | { state: "ready"; connections: ConnectionView[] };

type Dialog =
  | { kind: "form"; connection: ConnectionView | null }
  | { kind: "schema"; connection: ConnectionView }
  | { kind: "delete"; connection: ConnectionView }
  | { kind: "icon"; connection: ConnectionView }
  | null;

type Tab = "overview" | "catalog" | "query" | "mcp";
type Notice = { tone: "ok" | "error"; text: string } | null;

const STATUS_DOT: Record<ConnectionStatus, string> = {
  ok: "bg-emerald-500",
  error: "bg-red-500",
  untested: "bg-slate-400",
};

const SSL_TEXT: Record<ConnectionView["sslMode"], string> = {
  disable: "ไม่ใช้",
  prefer: "ใช้ถ้ามี",
  require: "บังคับ",
  "verify-full": "บังคับ + ตรวจใบรับรอง",
};

export default function ConnectionsPage() {
  const [list, setList] = useState<ListState>({ state: "loading" });
  const [dialog, setDialog] = useState<Dialog>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // On small screens the list and the detail take turns filling the screen.
  const [mobileDetail, setMobileDetail] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [testingId, setTestingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const res = await apiFetch<{ connections: ConnectionView[] }>("/api/studio/connections");
    setList(res.ok ? { state: "ready", connections: res.data.connections } : { state: "error", error: res.error });
  }, []);

  useEffect(() => {
    // Initial fetch; setState happens after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const connections = useMemo(() => (list.state === "ready" ? list.connections : []), [list]);
  const selected = connections.find((c) => c.id === selectedId) ?? connections[0] ?? null;

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = q
      ? connections.filter((c) =>
          [c.name, c.host, c.database, c.description, TYPE_LABELS[c.type]].some((v) => v.toLowerCase().includes(q))
        )
      : connections;
    return CONNECTION_TYPES.map((type) => ({
      type,
      items: matches.filter((c) => c.type === type).sort((a, b) => a.name.localeCompare(b.name, "th")),
    })).filter((g) => g.items.length > 0);
  }, [connections, search]);

  const replace = (connection: ConnectionView) =>
    setList((prev) =>
      prev.state !== "ready"
        ? prev
        : {
            state: "ready",
            connections: prev.connections.some((c) => c.id === connection.id)
              ? prev.connections.map((c) => (c.id === connection.id ? connection : c))
              : [connection, ...prev.connections],
          }
    );

  const select = (id: number) => {
    setSelectedId(id);
    setMobileDetail(true);
    setNotice(null);
  };

  const testSaved = async (connection: ConnectionView) => {
    setTestingId(connection.id);
    setNotice(null);
    const res = await apiFetch<TestResult & { connection: ConnectionView }>(
      `/api/studio/connections/${connection.id}/test`,
      { method: "POST" }
    );
    setTestingId(null);
    if (!res.ok) {
      setNotice({ tone: "error", text: res.error });
      return;
    }
    replace(res.data.connection);
    if (!res.data.ok) setNotice({ tone: "error", text: res.data.error ?? "เชื่อมต่อไม่สำเร็จ" });
    else if (!res.data.readOnly) setNotice({ tone: "error", text: "เชื่อมต่อได้ แต่บัญชีนี้เขียนข้อมูลได้" });
    else setNotice({ tone: "ok", text: "เชื่อมต่อได้ และเป็นบัญชีอ่านอย่างเดียว" });
  };

  const setPublished = async (connection: ConnectionView, published: boolean) => {
    setNotice(null);
    const res = await apiFetch<{ connection: ConnectionView }>(`/api/studio/connections/${connection.id}/publish`, {
      method: "PUT",
      body: JSON.stringify({ published }),
    });
    if (!res.ok) {
      setNotice({ tone: "error", text: res.error });
      return;
    }
    replace(res.data.connection);
    setNotice({ tone: "ok", text: published ? "เผยแพร่แล้ว ผู้ใช้เห็นและเลือกใช้ฐานข้อมูลนี้ได้ในหน้า /connections" : "ยกเลิกการเผยแพร่แล้ว" });
  };

  const setEnabled = async (connection: ConnectionView, enabled: boolean) => {
    setNotice(null);
    // Optimistic: the switch answers at once, the server reply settles it.
    replace({ ...connection, enabled });
    const res = await apiFetch<{ connection: ConnectionView }>(`/api/studio/connections/${connection.id}/enabled`, {
      method: "PUT",
      body: JSON.stringify({ enabled }),
    });
    if (!res.ok) {
      replace(connection);
      setNotice({ tone: "error", text: res.error });
      return;
    }
    replace(res.data.connection);
  };

  const openCreate = () => setDialog({ kind: "form", connection: null });
  const okCount = connections.filter((c) => c.status === "ok").length;

  return (
    <section className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">แหล่งข้อมูล</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            เชื่อมฐานข้อมูลแบบอ่านอย่างเดียว ทำคำอธิบายตารางให้ AI เข้าใจ ทดสอบ query และส่งต่อให้ทีม MCP
          </p>
        </div>
        <button type="button" className={`${primaryButton} px-5 py-3 text-sm self-start`} onClick={openCreate}>
          <Plus className="w-4 h-4" /> เพิ่มการเชื่อมต่อ
        </button>
      </div>

      {list.state === "loading" && (
        <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
          <div className="h-[480px] rounded-3xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 animate-pulse" />
          <div className="hidden lg:block h-[480px] rounded-3xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 animate-pulse" />
        </div>
      )}

      {list.state === "error" && (
        <div className="text-center py-12 bg-white dark:bg-white/[0.02] rounded-3xl border border-dashed border-red-300 dark:border-red-500/30 p-6 space-y-3">
          <p className="text-sm text-red-600 dark:text-red-400">{list.error}</p>
          <button
            type="button"
            className={secondaryButton}
            onClick={() => {
              setList({ state: "loading" });
              void load();
            }}
          >
            ลองอีกครั้ง
          </button>
        </div>
      )}

      {list.state === "ready" && connections.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-white/[0.03] rounded-3xl border border-dashed border-slate-300 dark:border-white/10 px-6">
          <div className="inline-grid grid-cols-4 gap-3">
            {CONNECTION_TYPES.map((type) => (
              <DbLogo key={type} type={type} size="md" />
            ))}
          </div>
          <p className="mt-6 text-base font-semibold text-slate-800 dark:text-slate-100">ยังไม่มีการเชื่อมต่อ</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            เริ่มจากสร้างบัญชี database ที่มีสิทธิ์ SELECT อย่างเดียว แล้วกด &quot;เพิ่มการเชื่อมต่อ&quot; เพื่อกรอก host และทดสอบ
          </p>
          <button type="button" className={`${primaryButton} mt-6 px-5 py-3 text-sm`} onClick={openCreate}>
            <Plus className="w-4 h-4" /> เพิ่มการเชื่อมต่อ
          </button>
        </div>
      )}

      {list.state === "ready" && connections.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-[320px_1fr] items-start">
          {/* Sidebar */}
          <aside
            className={`${mobileDetail ? "hidden lg:flex" : "flex"} flex-col rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] overflow-hidden lg:sticky lg:top-36 lg:max-h-[calc(100vh-10rem)]`}
            aria-label="รายการการเชื่อมต่อ"
          >
            <div className="p-4 space-y-3 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>
                  ทั้งหมด <strong className="text-slate-900 dark:text-white">{connections.length}</strong>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> ใช้ได้ {okCount}
                  <span className="w-2 h-2 rounded-full bg-red-500 ml-2" /> อื่นๆ {connections.length - okCount}
                </span>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ค้นหาชื่อ, host, ประเภท"
                  aria-label="ค้นหาการเชื่อมต่อ"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0055fa]"
                />
              </div>
            </div>

            <nav className="flex-1 min-h-0 overflow-y-auto p-2">
              {groups.length === 0 && (
                <p className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">ไม่พบการเชื่อมต่อที่ค้นหา</p>
              )}
              {groups.map((g) => (
                <div key={g.type} className="mb-2 last:mb-0">
                  <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {TYPE_LABELS[g.type]} · {g.items.length}
                  </p>
                  <ul className="space-y-0.5">
                    {g.items.map((c) => {
                      const active = selected?.id === c.id;
                      return (
                        <li key={c.id}>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => select(c.id)}
                            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && select(c.id)}
                            aria-current={active ? "true" : undefined}
                            className={`relative w-full flex items-center gap-3 pl-3 pr-3 py-2.5 rounded-2xl text-left cursor-pointer transition-colors ${
                              active ? "bg-blue-50 dark:bg-blue-500/10" : "hover:bg-slate-50 dark:hover:bg-white/5"
                            }`}
                          >
                            {active && (
                              <span aria-hidden="true" className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-full bg-[#0055fa] dark:bg-blue-400" />
                            )}
                            <span className={c.enabled ? "" : "opacity-40 grayscale"}>
                              <ConnectionAvatar connection={c} size="sm" />
                            </span>
                            <span className={`min-w-0 flex-1 pl-1 ${c.enabled ? "" : "opacity-60"}`}>
                              <span
                                className={`block text-sm truncate ${
                                  active ? "font-semibold text-slate-900 dark:text-white" : "font-medium text-slate-700 dark:text-slate-200"
                                }`}
                              >
                                {c.name}
                              </span>
                              <span className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[c.status]}`} />
                                {c.published && <Globe2 className="w-3 h-3 text-emerald-500 shrink-0" aria-label="เผยแพร่แล้ว" />}
                                <span className="truncate">{c.enabled ? `${c.enabledTableCount} ตารางเปิดใช้` : "ปิดใช้งาน"}</span>
                              </span>
                            </span>
                            <Toggle
                              size="sm"
                              checked={c.enabled}
                              label={c.enabled ? `ปิดการใช้ ${c.name}` : `เปิดใช้ ${c.name}`}
                              onChange={(next) => void setEnabled(c, next)}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>

          {/* Detail */}
          {selected && (
            <div className={`${mobileDetail ? "block" : "hidden lg:block"} min-w-0 space-y-5`}>
              <button
                type="button"
                onClick={() => setMobileDetail(false)}
                className="lg:hidden inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> กลับไปที่รายการ
              </button>

              <DetailHeader
                connection={selected}
                testing={testingId === selected.id}
                tab={tab}
                onTab={setTab}
                onTest={() => testSaved(selected)}
                onEdit={() => setDialog({ kind: "form", connection: selected })}
                onDelete={() => setDialog({ kind: "delete", connection: selected })}
                onIcon={() => setDialog({ kind: "icon", connection: selected })}
                onEnabled={(next) => setEnabled(selected, next)}
              />

              {notice && <NoticeBar notice={notice} onClose={() => setNotice(null)} />}

              <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 sm:p-6">
                {tab === "overview" && (
                  <Overview
                    connection={selected}
                    onPublish={(p) => setPublished(selected, p)}
                    onGoCatalog={() => setTab("catalog")}
                    onFullscreen={() => setDialog({ kind: "schema", connection: selected })}
                  />
                )}
                {tab === "catalog" && <CatalogPanel key={selected.id} connection={selected} onCatalogChanged={() => void load()} />}
                {tab === "query" && <QueryPanel key={selected.id} connection={selected} />}
                {tab === "mcp" && <McpPanel key={selected.id} connection={selected} />}
              </div>
            </div>
          )}
        </div>
      )}

      {dialog?.kind === "form" && (
        <ConnectionFormModal
          connection={dialog.connection}
          onClose={() => setDialog(null)}
          onSaved={(saved) => {
            replace(saved);
            setSelectedId(saved.id);
            setDialog(null);
            setNotice({ tone: "ok", text: `บันทึก "${saved.name}" แล้ว` });
          }}
        />
      )}
      {dialog?.kind === "icon" && (
        <IconPickerModal
          connection={dialog.connection}
          onClose={() => setDialog(null)}
          onSaved={(saved) => {
            replace(saved);
            setDialog(null);
          }}
        />
      )}
      {dialog?.kind === "schema" && <SchemaModal connection={dialog.connection} onClose={() => setDialog(null)} />}
      {dialog?.kind === "delete" && (
        <DeleteConnectionModal
          connection={dialog.connection}
          onClose={() => setDialog(null)}
          onDeleted={(id) => {
            setList((prev) =>
              prev.state === "ready" ? { state: "ready", connections: prev.connections.filter((c) => c.id !== id) } : prev
            );
            setSelectedId(null);
            setMobileDetail(false);
            setDialog(null);
            setNotice({ tone: "ok", text: "ลบการเชื่อมต่อแล้ว" });
          }}
        />
      )}
    </section>
  );
}

function NoticeBar({ notice, onClose }: { notice: NonNullable<Notice>; onClose: () => void }) {
  return (
    <div
      role="status"
      className={`flex items-start gap-2 px-4 py-3 rounded-2xl text-sm border ${
        notice.tone === "ok"
          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-500/20"
          : "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200/60 dark:border-red-500/20"
      }`}
    >
      {notice.tone === "ok" ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 mt-0.5 shrink-0" />}
      <span className="flex-1">{notice.text}</span>
      <button type="button" onClick={onClose} className="text-xs opacity-70 hover:opacity-100 cursor-pointer">
        ปิด
      </button>
    </div>
  );
}

function DetailHeader({
  connection: c,
  testing,
  tab,
  onTab,
  onTest,
  onEdit,
  onDelete,
  onIcon,
  onEnabled,
}: {
  connection: ConnectionView;
  testing: boolean;
  tab: Tab;
  onTab: (t: Tab) => void;
  onTest: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onIcon: () => void;
  onEnabled: (enabled: boolean) => void;
}) {
  const color = brandColor(c.type);
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "ภาพรวม", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: "catalog", label: "ตารางและคำอธิบาย", icon: <Table2 className="w-4 h-4" /> },
    { id: "query", label: "ทดสอบ Query", icon: <Code2 className="w-4 h-4" /> },
    { id: "mcp", label: "เชื่อม MCP", icon: <Plug className="w-4 h-4" /> },
  ];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03]">
      <div aria-hidden="true" className="h-1.5" style={{ backgroundColor: color }} />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-16 w-72 h-56 rounded-full opacity-10 dark:opacity-15 blur-3xl"
        style={{ backgroundColor: c.icon.color }}
      />
      <div className="relative p-5 sm:p-6 pb-0 sm:pb-0">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <button
            type="button"
            onClick={onIcon}
            className="group relative self-start rounded-3xl cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0055fa]"
            aria-label="เปลี่ยนรูปของการเชื่อมต่อ"
            title="เปลี่ยนรูป"
          >
            <ConnectionAvatar connection={c} size="xl" />
            <span className="absolute inset-0 rounded-3xl bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <ImageIcon className="w-6 h-6 text-white" />
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{TYPE_LABELS[c.type]}</p>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white break-words">{c.name}</h2>
            {c.description && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 line-clamp-2">{c.description}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={c.status} />
              {c.status === "ok" && c.readOnlyVerified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" /> อ่านอย่างเดียว
                </span>
              )}
              {c.status === "ok" && !c.readOnlyVerified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-3.5 h-3.5" /> บัญชีนี้เขียนข้อมูลได้
                </span>
              )}
              {c.published && c.enabled && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-blue-50 dark:bg-blue-500/10 text-[#0055fa] dark:text-blue-300">
                  <Globe2 className="w-3.5 h-3.5" /> เผยแพร่แล้ว
                </span>
              )}
              {!c.enabled && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                  <PowerOff className="w-3.5 h-3.5" /> ปิดใช้งาน
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 mr-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <Toggle checked={c.enabled} label={c.enabled ? "ปิดการใช้ฐานข้อมูลนี้" : "เปิดใช้ฐานข้อมูลนี้"} onChange={onEnabled} />
              {c.enabled ? "ใช้งาน" : "ไม่ใช้งาน"}
            </label>
            <button type="button" className={primaryButton} onClick={onTest} disabled={testing}>
              {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <PlugZap className="w-4 h-4" />}
              ทดสอบการเชื่อมต่อ
            </button>
            <button type="button" className={secondaryButton} onClick={onEdit}>
              <Pencil className="w-4 h-4" /> แก้ไข
            </button>
            <button
              type="button"
              className={`${secondaryButton} text-red-600! dark:text-red-400! hover:bg-red-50! dark:hover:bg-red-500/10!`}
              onClick={onDelete}
              aria-label={`ลบ ${c.name}`}
              title="ลบ"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div role="tablist" aria-label="ส่วนของการเชื่อมต่อ" className="mt-5 -mx-1 flex gap-1 overflow-x-auto">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onTab(t.id)}
                className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 cursor-pointer transition-colors ${
                  active
                    ? "border-[#0055fa] text-[#0055fa] dark:text-blue-400 dark:border-blue-400"
                    : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Overview({
  connection: c,
  onPublish,
  onGoCatalog,
  onFullscreen,
}: {
  connection: ConnectionView;
  onPublish: (published: boolean) => Promise<void>;
  onGoCatalog: () => void;
  onFullscreen: () => void;
}) {
  const [publishing, setPublishing] = useState(false);
  const info: { label: string; value: string; mono?: boolean }[] = [
    { label: "Host", value: c.host, mono: true },
    { label: "Port", value: String(c.port), mono: true },
    { label: TYPE_HINTS[c.type]?.database ?? "Database", value: c.database, mono: true },
    { label: "ผู้ใช้", value: c.username, mono: true },
    { label: "SSL", value: SSL_TEXT[c.sslMode] },
    { label: "ทดสอบล่าสุด", value: formatDateTime(c.lastTestedAt) },
  ];
  const canPublish = c.status === "ok" && c.enabledTableCount > 0;

  return (
    <div className="space-y-6">
      {!c.enabled && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-2xl text-sm bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200">
          <PowerOff className="w-4 h-4 mt-0.5 shrink-0" />
          ปิดใช้งานอยู่: ผู้ใช้จะไม่เห็นฐานข้อมูลนี้ และ API ของ MCP จะตอบ 403 — การตั้งค่าตาราง คอลัมน์ และคำอธิบายยังเก็บไว้ครบ เปิดกลับได้ทุกเมื่อ
        </div>
      )}
      {c.status === "error" && c.lastError && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-2xl text-sm bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400">
          <XCircle className="w-4 h-4 mt-0.5 shrink-0" /> {c.lastError}
        </div>
      )}

      <dl className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {info.map((item) => (
          <div key={item.label} className="rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 px-4 py-3 min-w-0">
            <dt className="text-[11px] text-slate-500 dark:text-slate-400">{item.label}</dt>
            <dd className={`mt-0.5 text-sm text-slate-900 dark:text-white truncate ${item.mono ? "font-mono" : "font-medium"}`} title={item.value}>
              {item.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">แคตตาล็อกสำหรับ AI</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {c.catalogSyncedAt ? `sync ล่าสุด ${formatDateTime(c.catalogSyncedAt)}` : "ยังไม่ได้ดึงรายการตาราง"}
              </p>
            </div>
            <Table2 className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
            {c.enabledTableCount} <span className="text-sm font-medium text-slate-500">ตารางเปิดใช้</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={primaryButton} onClick={onGoCatalog}>
              <Table2 className="w-4 h-4" /> จัดการตารางและคำอธิบาย
            </button>
            <button type="button" className={secondaryButton} onClick={onFullscreen}>
              <Maximize2 className="w-4 h-4" /> ดูข้อมูลเต็มจอ
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">เผยแพร่ให้ผู้ใช้เลือกใช้</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">ผู้ใช้เห็นชื่อ รูป คำอธิบาย และรายชื่อตารางที่เปิดใช้ ไม่เห็น host หรือรหัสผ่าน</p>
            </div>
            <Toggle
              checked={c.published}
              disabled={publishing || (!c.published && !canPublish)}
              label={c.published ? "ยกเลิกการเผยแพร่" : "เผยแพร่"}
              onChange={async (next) => {
                setPublishing(true);
                await onPublish(next);
                setPublishing(false);
              }}
            />
          </div>
          {!c.published && !canPublish && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              ต้องทดสอบการเชื่อมต่อให้ผ่าน และเปิดใช้อย่างน้อย 1 ตารางก่อนเผยแพร่
            </p>
          )}
          {c.published && <p className="text-xs text-emerald-600 dark:text-emerald-400">ผู้ใช้เลือกฐานข้อมูลนี้ได้ที่หน้า /connections</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <Library className="w-4 h-4" /> ใช้ใน Knowledge Set:
        </span>
        {c.knowledgeSets.length === 0 ? (
          <span className="text-slate-400 dark:text-slate-500">ยังไม่มี</span>
        ) : (
          c.knowledgeSets.map((s) => (
            <span key={s.id} className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-500/10 text-[#0055fa] dark:text-blue-300">
              {s.name}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function DeleteConnectionModal({
  connection,
  onClose,
  onDeleted,
}: {
  connection: ConnectionView;
  onClose: () => void;
  onDeleted: (id: number) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inUse = connection.knowledgeSets.length > 0;

  const remove = async () => {
    setDeleting(true);
    setError(null);
    const res = await apiFetch<{ ok: true }>(`/api/studio/connections/${connection.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) onDeleted(connection.id);
    else setError(res.error);
  };

  return (
    <Modal onClose={onClose} label="ลบการเชื่อมต่อ" panelClassName={`max-w-md ${modalPanel}`}>
      <ModalHeader icon={<Trash2 className="w-5 h-5" />} title="ลบการเชื่อมต่อ" onClose={onClose} />
      <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-white/5">
        <ConnectionAvatar connection={connection} size="md" />
        <div className="min-w-0 pl-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{connection.name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
            {connection.host}:{connection.port} / {connection.database}
          </p>
        </div>
      </div>
      {inUse ? (
        <div className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
          <p>ลบไม่ได้ เพราะ Knowledge Set ต่อไปนี้ยังใช้อยู่:</p>
          <ul className="list-disc pl-5 text-xs">
            {connection.knowledgeSets.map((s) => (
              <li key={s.id}>{s.name}</li>
            ))}
          </ul>
          <p className="text-xs text-slate-500 dark:text-slate-400">นำแหล่งข้อมูลออกจาก Knowledge Set เหล่านี้ก่อน แล้วจึงลบ</p>
        </div>
      ) : (
        <p className="text-sm text-slate-700 dark:text-slate-200">
          ต้องการลบการเชื่อมต่อนี้ใช่ไหม แคตตาล็อก คำอธิบาย และ API key ทั้งหมดจะถูกลบด้วย การลบย้อนกลับไม่ได้
        </p>
      )}
      {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-white/5">
        <button type="button" className={ghostButton} onClick={onClose}>
          {inUse ? "ปิด" : "ยกเลิก"}
        </button>
        {!inUse && (
          <button type="button" className={`${primaryButton} bg-red-600! hover:bg-red-700!`} onClick={remove} disabled={deleting}>
            {deleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            ลบ
          </button>
        )}
      </div>
    </Modal>
  );
}
