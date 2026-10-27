"use client";

import React from "react";
import { X } from "lucide-react";
import type { ConnectionStatus } from "@/lib/studio/types";

export const inputClass =
  "w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0055fa] disabled:opacity-60";
export const labelClass = "block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1";
export const primaryButton =
  "inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#0055fa] hover:bg-[#0046d1] rounded-xl shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed";
export const secondaryButton =
  "inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed";
export const ghostButton =
  "px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer";
export const modalPanel =
  "w-full p-6 space-y-5 bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; body: Record<string, unknown> };

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: init?.body ? { "Content-Type": "application/json", ...init.headers } : init?.headers,
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const error = typeof body.error === "string" ? body.error : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
      return { ok: false, status: res.status, error, body };
    }
    return { ok: true, data: body as T };
  } catch {
    return { ok: false, status: 0, error: "ติดต่อเซิร์ฟเวอร์ไม่ได้ ตรวจการเชื่อมต่ออินเทอร์เน็ต", body: {} };
  }
}

const STATUS_STYLES: Record<ConnectionStatus, { label: string; className: string }> = {
  untested: {
    label: "ยังไม่ทดสอบ",
    className: "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10",
  },
  ok: {
    label: "ใช้ได้",
    className: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-500/20",
  },
  error: {
    label: "ผิดพลาด",
    className: "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200/60 dark:border-red-500/20",
  },
};

export function StatusBadge({ status }: { status: ConnectionStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-lg border ${style.className}`}>
      {style.label}
    </span>
  );
}

export function ModalHeader({
  icon,
  title,
  onClose,
}: {
  icon: React.ReactNode;
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-[#0055fa] dark:text-blue-400 shrink-0">
          {icon}
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">{title}</h2>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="ปิด"
        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
  size = "md",
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const track = size === "sm" ? "w-8 h-[18px]" : "w-10 h-6";
  const knob = size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5";
  const shift = size === "sm" ? "translate-x-[14px]" : "translate-x-4";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={`relative inline-flex shrink-0 items-center rounded-full p-0.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${track} ${
        checked ? "bg-[#0055fa]" : "bg-slate-300 dark:bg-white/20"
      }`}
    >
      <span className={`${knob} rounded-full bg-white shadow transition-transform ${checked ? shift : "translate-x-0"}`} />
    </button>
  );
}

const DESCRIPTION_STATUS_STYLES = {
  empty: { label: "ยังไม่มีคำอธิบาย", className: "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400" },
  draft: { label: "ร่าง", className: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" },
  approved: { label: "ยืนยันแล้ว", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" },
};

export function DescriptionBadge({ status }: { status: keyof typeof DESCRIPTION_STATUS_STYLES }) {
  const s = DESCRIPTION_STATUS_STYLES[status];
  return <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap ${s.className}`}>{s.label}</span>;
}
