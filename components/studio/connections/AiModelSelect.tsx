"use client";

import React, { useEffect, useState } from "react";
import { Bot } from "lucide-react";
import { apiFetch } from "./ui";

export interface AiModel {
  id: number;
  name: string;
  provider: string;
  isDefault: boolean;
}

let cache: Promise<AiModel[]> | null = null;

/** Active LLM models, fetched once per page load. */
export function useAiModels(): { models: AiModel[]; error: string | null } {
  const [state, setState] = useState<{ models: AiModel[]; error: string | null }>({ models: [], error: null });
  useEffect(() => {
    let cancelled = false;
    cache ??= apiFetch<{ models: AiModel[] }>("/api/studio/connections/models").then((res) => {
      if (!res.ok) {
        cache = null;
        throw new Error(res.error);
      }
      return res.data.models;
    });
    cache
      .then((models) => !cancelled && setState({ models, error: null }))
      .catch((e: Error) => !cancelled && setState({ models: [], error: e.message }));
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

export default function AiModelSelect({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (id: number | null) => void;
}) {
  const { models, error } = useAiModels();
  if (error) return <span className="text-xs text-red-600 dark:text-red-400">{error}</span>;
  const current = value ?? models.find((m) => m.isDefault)?.id ?? models[0]?.id ?? "";
  return (
    <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
      <Bot className="w-4 h-4 text-slate-400" />
      <span className="sr-only">โมเดล AI</span>
      <select
        value={current}
        onChange={(e) => onChange(Number(e.target.value))}
        className="max-w-[16rem] px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0055fa]"
      >
        {models.length === 0 && <option value="">กำลังโหลดโมเดล…</option>}
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
            {m.isDefault ? " (ค่าเริ่มต้น)" : ""} · {m.provider}
          </option>
        ))}
      </select>
    </label>
  );
}
