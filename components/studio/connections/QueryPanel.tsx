"use client";

import React, { useState } from "react";
import { Clock, Code2, MessageSquareText, Play, RefreshCw, Rows3, Sparkles } from "lucide-react";
import type { ConnectionView, QueryResult } from "@/lib/studio/connections/types";
import { QUERY_MAX_ROWS, TYPE_LABELS } from "@/lib/studio/connections/types";
import AiModelSelect from "./AiModelSelect";
import { apiFetch, primaryButton, secondaryButton } from "./ui";

type Mode = "sql" | "ask";
type Run = { state: "idle" } | { state: "running" } | { state: "error"; error: string } | { state: "done"; result: QueryResult };

export default function QueryPanel({ connection }: { connection: ConnectionView }) {
  const [mode, setMode] = useState<Mode>("sql");
  const [sql, setSql] = useState("");
  const [run, setRun] = useState<Run>({ state: "idle" });
  const [question, setQuestion] = useState("");
  const [modelId, setModelId] = useState<number | null>(null);
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<{ sql: string; explanation: string } | null>(null);
  const [askError, setAskError] = useState<string | null>(null);

  const execute = async (text: string) => {
    if (!text.trim()) return;
    setRun({ state: "running" });
    const res = await apiFetch<QueryResult>(`/api/studio/connections/${connection.id}/query`, {
      method: "POST",
      body: JSON.stringify({ sql: text }),
    });
    setRun(res.ok ? { state: "done", result: res.data } : { state: "error", error: res.error });
  };

  const ask = async () => {
    if (!question.trim()) return;
    setAsking(true);
    setAskError(null);
    setAnswer(null);
    setRun({ state: "idle" });
    const res = await apiFetch<{ sql: string; explanation: string }>(
      `/api/studio/connections/${connection.id}/query/ask`,
      { method: "POST", body: JSON.stringify({ question, modelId }) }
    );
    setAsking(false);
    if (res.ok) setAnswer(res.data);
    else setAskError(res.error);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" className="inline-grid grid-cols-2 gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-white/5">
          {(
            [
              ["sql", "SQL", <Code2 key="i" className="w-4 h-4" />],
              ["ask", "ถามภาษาคน", <MessageSquareText key="i" className="w-4 h-4" />],
            ] as [Mode, string, React.ReactNode][]
          ).map(([id, label, icon]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              onClick={() => setMode(id)}
              className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer ${
                mode === id
                  ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {TYPE_LABELS[connection.type]} · อ่านอย่างเดียว · สูงสุด {QUERY_MAX_ROWS} แถว · 10 วินาที
        </p>
      </div>

      {mode === "sql" ? (
        <div className="space-y-3">
          <textarea
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                void execute(sql);
              }
            }}
            rows={8}
            spellCheck={false}
            placeholder={"SELECT *\nFROM ชื่อตาราง\nLIMIT 20"}
            aria-label="คำสั่ง SQL"
            className="w-full px-4 py-3 rounded-2xl font-mono text-sm leading-relaxed bg-slate-950 text-slate-100 placeholder:text-slate-500 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0055fa]"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">กด Ctrl + Enter เพื่อรัน • ใช้ได้เฉพาะ SELECT / WITH คำสั่งเดียว</p>
            <button type="button" className={primaryButton} onClick={() => execute(sql)} disabled={run.state === "running" || !sql.trim()}>
              {run.state === "running" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              รัน
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void ask()}
              placeholder="เช่น ส่งออกไปจีนเดือนไหนมากที่สุด"
              aria-label="คำถาม"
              maxLength={500}
              className="flex-1 px-4 py-3 rounded-2xl text-sm bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0055fa]"
            />
            <button type="button" className={`${primaryButton} py-3`} onClick={ask} disabled={asking || !question.trim()}>
              {asking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              ให้ AI เขียน SQL
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <AiModelSelect value={modelId} onChange={setModelId} />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              AI เห็นเฉพาะตาราง/คอลัมน์ที่เปิดใช้และคำอธิบายในแคตตาล็อก (ไม่เห็นข้อมูลจริง) — ใช้วัดว่าคำอธิบายชัดพอหรือยัง
            </p>
          </div>
          {askError && <p className="text-sm text-red-600 dark:text-red-400">{askError}</p>}
          {answer && (
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
              {answer.explanation && (
                <p className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200 bg-blue-50/60 dark:bg-blue-500/10">
                  {answer.explanation}
                </p>
              )}
              <pre className="px-4 py-3 bg-slate-950 text-slate-100 text-sm font-mono whitespace-pre-wrap break-words">{answer.sql}</pre>
              <div className="flex flex-wrap justify-end gap-2 px-4 py-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  className={secondaryButton}
                  onClick={() => {
                    setSql(answer.sql);
                    setMode("sql");
                  }}
                >
                  <Code2 className="w-4 h-4" /> แก้ใน SQL
                </button>
                <button type="button" className={primaryButton} onClick={() => execute(answer.sql)} disabled={run.state === "running"}>
                  {run.state === "running" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  ตรวจแล้ว รัน SQL นี้
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <ResultView run={run} />
    </div>
  );
}

function ResultView({ run }: { run: Run }) {
  if (run.state === "idle") return null;
  if (run.state === "running") {
    return <div className="h-40 rounded-2xl bg-slate-100 dark:bg-white/5 animate-pulse" />;
  }
  if (run.state === "error") {
    return <p className="px-4 py-3 rounded-2xl text-sm bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400">{run.error}</p>;
  }
  const { columns, rows, rowCount, truncated, durationMs } = run.result;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1">
          <Rows3 className="w-3.5 h-3.5" /> {rowCount.toLocaleString("th-TH")} แถว
          {truncated && <span className="text-amber-600 dark:text-amber-400">(ตัดที่ {QUERY_MAX_ROWS} แถว)</span>}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> {durationMs.toLocaleString("th-TH")} ms
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400 rounded-2xl border border-dashed border-slate-300 dark:border-white/10">
          ไม่มีแถวที่ตรงเงื่อนไข
        </p>
      ) : (
        <div className="overflow-auto max-h-[480px] rounded-2xl border border-slate-200 dark:border-white/10">
          <table className="text-sm whitespace-nowrap border-separate border-spacing-0">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="sticky left-0 z-20 px-3 py-2.5 text-right text-xs font-semibold text-slate-400 bg-slate-50 dark:bg-[#111a2e] border-b border-slate-200 dark:border-white/10">
                  #
                </th>
                {columns.map((c, i) => (
                  <th
                    key={`${c}-${i}`}
                    className="px-3 py-2.5 text-left text-xs font-semibold font-mono text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#111a2e] border-b border-slate-200 dark:border-white/10"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r} className="odd:bg-white even:bg-slate-50/60 dark:odd:bg-transparent dark:even:bg-white/[0.02]">
                  <td className="sticky left-0 px-3 py-2 text-right text-xs text-slate-400 tabular-nums bg-inherit border-b border-slate-100 dark:border-white/5">
                    {r + 1}
                  </td>
                  {row.map((value, i) => (
                    <td
                      key={i}
                      className="px-3 py-2 max-w-xs truncate text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-white/5"
                      title={value === null ? "null" : String(value)}
                    >
                      {value === null ? (
                        <span className="px-1.5 py-0.5 rounded text-[11px] italic text-slate-400 bg-slate-100 dark:bg-white/5">null</span>
                      ) : (
                        String(value)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
