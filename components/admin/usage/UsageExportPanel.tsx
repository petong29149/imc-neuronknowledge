"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2, AlertCircle, Check } from "lucide-react";
import type { ExportFormat, UsageMonth } from "@/lib/usage-types";
import { errorMessage, formatMonthLong, formatMonthShort, formatNumber } from "./usage-format";

const FORMATS: { value: ExportFormat; label: string; icon: typeof FileText }[] = [
  { value: "xlsx", label: "Excel (.xlsx)", icon: FileSpreadsheet },
  { value: "csv", label: "CSV", icon: FileText },
];

function fileNameFromDisposition(header: string | null, fallback: string) {
  const match = header?.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? fallback;
}

export default function UsageExportPanel() {
  const [months, setMonths] = useState<UsageMonth[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/usage/months", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || "โหลดรายการเดือนไม่สำเร็จ");
        setMonths(data.months);
        // Start with the most recent month selected
        if (data.months.length > 0) setSelected(new Set([data.months[0].month]));
      } catch (err) {
        if (!cancelled) setLoadError(errorMessage(err, "โหลดรายการเดือนไม่สำเร็จ"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Newest year first, months within a year in calendar order
  const years = useMemo(() => {
    const byYear = new Map<string, UsageMonth[]>();
    for (const m of months ?? []) {
      const year = m.month.slice(0, 4);
      byYear.set(year, [...(byYear.get(year) ?? []), m]);
    }
    return [...byYear.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([year, list]) => ({ year, months: list.sort((a, b) => a.month.localeCompare(b.month)) }));
  }, [months]);

  const toggleMonth = (month: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(month)) next.delete(month);
      else next.add(month);
      return next;
    });
    setDownloadError(null);
  };

  const setYearSelected = (list: UsageMonth[], on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      list.forEach((m) => (on ? next.add(m.month) : next.delete(m.month)));
      return next;
    });
  };

  const selectedMonths = [...selected].sort();

  const handleDownload = async () => {
    if (selectedMonths.length === 0) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const params = new URLSearchParams({ months: selectedMonths.join(","), format });
      const res = await fetch(`/api/admin/usage/export?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "ดาวน์โหลดไม่สำเร็จ");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileNameFromDisposition(
        res.headers.get("Content-Disposition"),
        `neuronknowledge-usage.${format}`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(errorMessage(err, "ดาวน์โหลดไม่สำเร็จ"));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-white/10 shadow-xs">
      <div className="flex flex-col lg:flex-row lg:items-start gap-4 p-4 sm:p-5">
        {/* Heading */}
        <div className="lg:w-64 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-[#0055fa] dark:text-blue-400">
              <Download className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">ดาวน์โหลดรายงานรายเดือน</h2>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            สรุปจำนวนคำถามและ Tokens ที่ผู้ใช้แต่ละคนใช้ในเดือนที่เลือก เลือกได้หลายเดือน
          </p>
        </div>

        {/* Month picker */}
        <div className="flex-1 min-w-0 space-y-2.5">
          {loadError && (
            <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-3.5 h-3.5" /> {loadError}
            </div>
          )}
          {!months && !loadError && (
            <div className="flex gap-1.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-11 w-16 rounded-lg bg-slate-100 dark:bg-white/5 animate-pulse" />
              ))}
            </div>
          )}
          {months && months.length === 0 && (
            <p className="text-xs text-slate-400 py-3">ยังไม่มีข้อมูลการใช้งานสำหรับออกรายงาน</p>
          )}
          {years.map(({ year, months: list }) => {
            const allOn = list.every((m) => selected.has(m.month));
            return (
              <div key={year} className="flex items-start gap-3">
                <div className="w-12 shrink-0 pt-1.5">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums">{year}</div>
                  <button
                    type="button"
                    onClick={() => setYearSelected(list, !allOn)}
                    className="text-[10px] text-[#0055fa] dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    {allOn ? "ล้าง" : "ทั้งปี"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {list.map((m) => {
                    const isOn = selected.has(m.month);
                    return (
                      <button
                        key={m.month}
                        type="button"
                        onClick={() => toggleMonth(m.month)}
                        aria-pressed={isOn}
                        title={`${formatMonthLong(m.month)} · ${formatNumber(m.questions)} คำถาม · ${formatNumber(m.totalTokens)} tokens`}
                        className={`relative min-w-16 px-2.5 py-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                          isOn
                            ? "bg-[#0055fa] border-[#0055fa] text-white shadow-xs"
                            : "bg-white dark:bg-white/[0.03] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-[#0055fa]/50 dark:hover:border-blue-400/40"
                        }`}
                      >
                        {isOn && <Check className="absolute top-1 right-1 w-3 h-3" />}
                        <div className="text-xs font-semibold leading-tight">{formatMonthShort(m.month)}</div>
                        <div
                          className={`text-[10px] tabular-nums leading-tight mt-0.5 ${
                            isOn ? "text-blue-100" : "text-slate-400"
                          }`}
                        >
                          {formatNumber(m.questions)} คำถาม
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Format + action */}
        <div className="lg:w-56 shrink-0 space-y-2">
          <div className="grid grid-cols-2 gap-0.5 p-0.5 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
            {FORMATS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setFormat(value)}
                aria-pressed={format === value}
                className={`inline-flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                  format === value
                    ? "bg-white dark:bg-[#0055fa] text-[#0055fa] dark:text-white shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleDownload}
            disabled={selectedMonths.length === 0 || downloading}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#0055fa] hover:bg-[#0046d1] rounded-xl shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            {selectedMonths.length === 0
              ? "เลือกเดือนก่อนดาวน์โหลด"
              : `ดาวน์โหลด ${selectedMonths.length} เดือน`}
          </button>
          {downloadError && (
            <div className="flex items-center gap-1.5 text-[11px] text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {downloadError}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
