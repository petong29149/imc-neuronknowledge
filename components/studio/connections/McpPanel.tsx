"use client";

import React, { useEffect, useState } from "react";
import { Check, Copy, KeyRound, Plug, Plus, RefreshCw, ShieldCheck, Trash2, TriangleAlert } from "lucide-react";
import type { ConnectionView } from "@/lib/studio/connections/types";
import { mcpToolNames } from "@/lib/studio/connections/mcpnames";
import { QUERY_MAX_ROWS } from "@/lib/studio/connections/types";
import { apiFetch, formatDateTime, primaryButton } from "./ui";

interface ApiKeyView {
  id: number;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

function CopyButton({ text, label = "คัดลอก" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          // Clipboard blocked (e.g. insecure context); the text is still selectable.
        }
      }}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
    >
      {done ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {done ? "คัดลอกแล้ว" : label}
    </button>
  );
}

function Field({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid sm:grid-cols-[9rem_1fr] gap-1 sm:gap-3 items-center">
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</span>
      <div className="flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 min-w-0">
        <code className={`flex-1 text-xs text-slate-100 break-all ${mono ? "font-mono" : ""}`}>{value}</code>
        <CopyButton text={value} />
      </div>
    </div>
  );
}

function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-slate-800">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 text-xs text-slate-400">
        <span>{title}</span>
        <CopyButton text={code} />
      </div>
      <pre className="px-4 py-3 bg-slate-950 text-slate-100 text-xs font-mono overflow-x-auto leading-relaxed">{code}</pre>
    </div>
  );
}

export default function McpPanel({ connection }: { connection: ConnectionView }) {
  const [keys, setKeys] = useState<ApiKeyView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [origin, setOrigin] = useState("https://<โดเมนของระบบ>");

  useEffect(() => {
    // window is only available after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
    let cancelled = false;
    apiFetch<{ apiKeys: ApiKeyView[] }>(`/api/studio/connections/${connection.id}/api-keys`).then((res) => {
      if (cancelled) return;
      if (res.ok) setKeys(res.data.apiKeys);
      else setError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [connection.id]);

  const create = async () => {
    setCreating(true);
    setError(null);
    const res = await apiFetch<{ key: string; apiKey: ApiKeyView }>(`/api/studio/connections/${connection.id}/api-keys`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    setCreating(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setNewKey(res.data.key);
    setName("");
    setKeys((prev) => [res.data.apiKey, ...(prev ?? [])]);
  };

  const revoke = async (key: ApiKeyView) => {
    if (!window.confirm(`ยกเลิก key "${key.name}"? ระบบที่ใช้ key นี้จะเรียก API ไม่ได้ทันที`)) return;
    const res = await apiFetch(`/api/studio/connections/${connection.id}/api-keys/${key.id}`, { method: "DELETE" });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setKeys((prev) => prev?.map((k) => (k.id === key.id ? { ...k, revokedAt: new Date().toISOString() } : k)) ?? null);
  };

  const base = `${origin}/api/connections/${connection.id}`;
  const tools = mcpToolNames(connection);
  const keyText = newKey ?? "nkc_xxxxxxxx_...";
  const curlCatalog = `curl -H "Authorization: Bearer ${keyText}" \\\n  ${base}/catalog`;
  const curlQuery = `curl -X POST ${base}/query \\\n  -H "Authorization: Bearer ${keyText}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"sql": "SELECT ...", "maxRows": 50}'`;
  const toolDefs = JSON.stringify(
    [
      {
        name: "describe_database",
        description: `ดูตาราง คอลัมน์ และคำอธิบายของฐานข้อมูล "${connection.name}" ก่อนเขียน SQL`,
        inputSchema: { type: "object", properties: {} },
        calls: `GET ${base}/catalog`,
      },
      {
        name: "query_database",
        description: `รัน SQL แบบอ่านอย่างเดียวบน "${connection.name}" ใช้ได้เฉพาะตาราง/คอลัมน์ที่อยู่ใน describe_database`,
        inputSchema: {
          type: "object",
          properties: {
            sql: { type: "string", description: "SELECT หรือ WITH คำสั่งเดียว ตาม sqlDialect ใน catalog" },
            maxRows: { type: "integer", minimum: 1, maximum: QUERY_MAX_ROWS },
          },
          required: ["sql"],
        },
        calls: `POST ${base}/query`,
      },
    ],
    null,
    2
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-sm text-slate-700 dark:text-slate-200">
        <ShieldCheck className="w-5 h-5 shrink-0 text-[#0055fa] dark:text-blue-400" />
        <p>
          ทีม MCP ไม่ต้องต่อ DB เอง — ใช้ API key เรียก <strong>catalog</strong> (ตาราง/คอลัมน์ที่เปิดใช้ + คำอธิบาย) และ{" "}
          <strong>query</strong> (SELECT อ่านอย่างเดียว ที่ระบบบังคับให้ใช้ได้เฉพาะตาราง/คอลัมน์ที่เปิดใช้ ไม่รวม PII, ≤ {QUERY_MAX_ROWS} แถว)
          แล้วห่อเป็น MCP tool 2 ตัว
        </p>
      </div>

      {/* MCP Hub */}
      <section className="space-y-3 rounded-2xl border border-[#0055fa]/30 bg-blue-50/40 dark:bg-blue-500/5 p-5">
        <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
          <Plug className="w-5 h-5 text-[#0055fa]" /> เพิ่มเข้า MCP Hub (แนะนำ)
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          ฐานข้อมูลนี้เป็น MCP server ในตัว ไปที่ <strong>Admin Console → MCP Hub → MCP Servers → เพิ่ม Server</strong> แล้วกรอกค่าด้านล่าง
          จากนั้นกด &quot;รีเฟรช Tools&quot; จะได้ tool 2 ตัวใน Tools Catalog ให้ agent ใช้ได้ทันที
        </p>
        <div className="space-y-2">
          <Field label="ชื่อ Server" value={connection.name} mono={false} />
          <Field label="Transport" value="Streamable HTTP" mono={false} />
          <Field label="URL" value={`${base}/mcp`} />
          <Field label="Headers (JSON)" value={JSON.stringify({ Authorization: `Bearer ${keyText}` })} />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Tools ที่จะได้: <code className="font-mono">{tools.describe}</code> (ดูตารางและคำอธิบาย) และ{" "}
          <code className="font-mono">{tools.query}</code> (รัน SELECT อ่านอย่างเดียว ≤ {QUERY_MAX_ROWS} แถว) •
          {newKey ? " ใช้ key ที่เพิ่งสร้างด้านล่างแล้ว" : " สร้าง API key ด้านล่างก่อน แล้วค่า Headers จะใส่ key ให้"}
          {" "}• ถ้าปิดใช้งานฐานข้อมูลนี้ tool จะตอบ 403
        </p>
      </section>

      {/* Keys */}
      <section className="space-y-3">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">API keys</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            placeholder='ตั้งชื่อ key เช่น "MCP server ทีม Data"'
            aria-label="ชื่อ API key"
            className="flex-1 px-3.5 py-2.5 rounded-xl text-sm bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0055fa]"
          />
          <button type="button" className={primaryButton} onClick={create} disabled={creating || !name.trim()}>
            {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            สร้าง key
          </button>
        </div>

        {newKey && (
          <div className="p-4 rounded-2xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 space-y-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
              <TriangleAlert className="w-4 h-4" /> คัดลอก key นี้เก็บไว้ตอนนี้ ระบบจะไม่แสดงอีก
            </p>
            <div className="flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2">
              <code className="flex-1 text-xs text-slate-100 break-all">{newKey}</code>
              <CopyButton text={newKey} />
            </div>
            <button type="button" onClick={() => setNewKey(null)} className="text-xs text-amber-800 dark:text-amber-300 underline cursor-pointer">
              เก็บแล้ว ซ่อน key
            </button>
          </div>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        {keys === null ? (
          <div className="h-20 rounded-2xl bg-slate-100 dark:bg-white/5 animate-pulse" />
        ) : keys.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">ยังไม่มี key</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
            {keys.map((k) => (
              <li key={k.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <KeyRound className={`w-4 h-4 ${k.revokedAt ? "text-slate-300" : "text-[#0055fa]"}`} />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold ${k.revokedAt ? "text-slate-400 line-through" : "text-slate-900 dark:text-white"}`}>{k.name}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {k.prefix}_… · สร้าง {formatDateTime(k.createdAt)} · ใช้ล่าสุด {formatDateTime(k.lastUsedAt)}
                  </p>
                </div>
                {k.revokedAt ? (
                  <span className="text-xs text-slate-400">ยกเลิกแล้ว</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => revoke(k)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" /> ยกเลิก
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Guide */}
      <section className="space-y-3">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">ทางเลือก: เรียก REST API เอง (สำหรับ MCP server ที่ทีมเขียนเอง)</h3>
        <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-600 dark:text-slate-300">
          <li>เปิดใช้ตารางและยืนยันคำอธิบายในแท็บ &quot;ตารางและคำอธิบาย&quot; (catalog ส่งเฉพาะตารางที่เปิดใช้)</li>
          <li>สร้าง API key ด้านบนแล้วเก็บไว้ใน secret ของ MCP server</li>
          <li>สร้าง tool <code className="font-mono">describe_database</code> เรียก catalog และ <code className="font-mono">query_database</code> เรียก query</li>
          <li>ให้ AI เรียก describe_database ก่อนเสมอ แล้วเขียน SQL ตาม <code className="font-mono">sqlDialect</code> ที่ได้</li>
        </ol>
        <CodeBlock title="1. อ่าน catalog" code={curlCatalog} />
        <CodeBlock title="2. รัน query" code={curlQuery} />
        <CodeBlock title="ตัวอย่างนิยาม MCP tools" code={toolDefs} />
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Error ตอบเป็น <code className="font-mono">{"{ \"error\": \"...\" }"}</code> พร้อม 400 (SQL ไม่ผ่านกติกา), 401 (key ผิด/ยกเลิก), 404 (ไม่พบ connection)
        </p>
      </section>
    </div>
  );
}
