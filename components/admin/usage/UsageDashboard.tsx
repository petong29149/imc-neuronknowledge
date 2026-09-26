"use client";

import React, { useEffect, useState } from "react";
import {
  MessageSquareText,
  Coins,
  UserCheck,
  RefreshCw,
  AlertCircle,
  ChartColumn,
  ChartPie,
  Users,
} from "lucide-react";
import type { UsageMetric, UsagePeriod, UsageStatsResponse } from "@/lib/usage-types";
import UsageExportPanel from "./UsageExportPanel";
import UsageBarChart from "./UsageBarChart";
import UsageDonutChart from "./UsageDonutChart";
import {
  THAI_LOCALE,
  VIZ_VARS,
  errorMessage,
  formatCompact,
  formatNumber,
  METRIC_LABEL,
} from "./usage-format";

const PERIODS: { value: UsagePeriod; label: string }[] = [
  { value: "today", label: "วันนี้" },
  { value: "week", label: "สัปดาห์นี้" },
  { value: "month", label: "เดือนนี้" },
  { value: "all", label: "ทั้งหมด" },
];

const METRICS: UsageMetric[] = ["questions", "tokens"];

function rangeLabel(stats: UsageStatsResponse) {
  if (!stats.rangeStart) return "ข้อมูลทั้งหมดในระบบ";
  const format = (iso: string) =>
    new Date(iso).toLocaleDateString(THAI_LOCALE, {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: stats.timezone,
    });
  return stats.period === "today"
    ? format(stats.rangeStart)
    : `${format(stats.rangeStart)} – ${format(stats.rangeEnd)}`;
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex items-center gap-0.5 p-0.5 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            value === option.value
              ? "bg-white dark:bg-[#0055fa] text-[#0055fa] dark:text-white shadow-xs border border-slate-200/80 dark:border-[#0055fa]"
              : "border border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  fullValue,
  detail,
  icon: Icon,
  iconClass,
  children,
}: {
  label: string;
  value: string;
  fullValue?: string;
  detail: React.ReactNode;
  icon: typeof Users;
  iconClass: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
        <div className={`p-1.5 rounded-lg ${iconClass}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div
        className="mt-2 text-3xl sm:text-[2rem] font-bold tracking-tight text-slate-900 dark:text-white leading-none"
        title={fullValue}
      >
        {value}
      </div>
      <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">{detail}</div>
      {children}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  icon: Icon,
  className = "",
  children,
}: {
  title: string;
  subtitle: string;
  icon: typeof Users;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col ${className}`}
    >
      <div className="flex items-start gap-2 mb-3">
        <Icon className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{title}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

export default function UsageDashboard() {
  const [period, setPeriod] = useState<UsagePeriod>("month");
  const [metric, setMetric] = useState<UsageMetric>("questions");
  const [stats, setStats] = useState<UsageStatsResponse | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  // The request that last finished; while it differs from the current one we're loading
  const [settled, setSettled] = useState<{ key: string; error: string | null } | null>(null);

  const requestKey = `${period}:${refreshKey}`;
  const loading = settled?.key !== requestKey;
  const error = loading ? null : settled.error;

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/admin/usage?period=${period}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "โหลดข้อมูลไม่สำเร็จ");
        setStats(data);
        setSettled({ key: requestKey, error: null });
      } catch (err) {
        if (controller.signal.aborted) return;
        setSettled({ key: requestKey, error: errorMessage(err, "โหลดข้อมูลไม่สำเร็จ") });
      }
    })();
    return () => controller.abort();
  }, [period, requestKey]);

  const summary = stats?.summary;
  const metricTotal = summary ? (metric === "questions" ? summary.questions : summary.totalTokens) : 0;
  const topModels = (stats?.models ?? [])
    .slice()
    .sort((a, b) =>
      metric === "questions"
        ? b.questions - a.questions || b.totalTokens - a.totalTokens
        : b.totalTokens - a.totalTokens || b.questions - a.questions
    )
    .slice(0, 10);
  const topUsers = (metric === "questions" ? stats?.topUsersByQuestions : stats?.topUsersByTokens) ?? [];
  const activeShare = summary && summary.totalUsers > 0 ? summary.activeUsers / summary.totalUsers : 0;

  return (
    <div className={`space-y-5 ${VIZ_VARS}`}>
      <UsageExportPanel />

      {/* Period filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-3 flex-wrap">
          <SegmentedControl options={PERIODS} value={period} onChange={setPeriod} label="ช่วงเวลา" />
          {stats && (
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">{rangeLabel(stats)}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={loading}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          รีเฟรช
        </button>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-xs text-rose-700 dark:text-rose-300">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </span>
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="font-semibold hover:underline cursor-pointer"
          >
            ลองอีกครั้ง
          </button>
        </div>
      )}

      {/* Headline numbers */}
      {!summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[140px] rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-white/10 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 transition-opacity ${loading ? "opacity-60" : ""}`}>
          <StatCard
            label="คำถามทั้งหมด"
            value={formatCompact(summary.questions)}
            fullValue={formatNumber(summary.questions)}
            detail={`จาก ${formatNumber(summary.conversations)} บทสนทนา`}
            icon={MessageSquareText}
            iconClass="bg-blue-50 dark:bg-blue-500/10 text-[#0055fa] dark:text-blue-400"
          />
          <StatCard
            label="Tokens ทั้งหมด"
            value={formatCompact(summary.totalTokens)}
            fullValue={formatNumber(summary.totalTokens)}
            detail={
              <span className="tabular-nums">
                Input {formatNumber(summary.inputTokens)} · Output {formatNumber(summary.outputTokens)}
              </span>
            }
            icon={Coins}
            iconClass="bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
          />
          <StatCard
            label="ผู้ใช้งาน (Active)"
            value={formatNumber(summary.activeUsers)}
            detail={`จากผู้ใช้ทั้งหมด ${formatNumber(summary.totalUsers)} คน (${Math.round(activeShare * 100)}%)`}
            icon={UserCheck}
            iconClass="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          >
            <div
              className="mt-2.5 h-1.5 rounded-full bg-[var(--viz-track)] overflow-hidden"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={summary.totalUsers}
              aria-valuenow={summary.activeUsers}
              aria-label="สัดส่วนผู้ใช้งาน Active"
            >
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{ width: `${activeShare * 100}%`, backgroundColor: "var(--viz-1)" }}
              />
            </div>
          </StatCard>
        </div>
      )}

      {/* Charts */}
      <section className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">สถิติตามโมเดลและผู้ใช้</h2>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">แสดงตาม</span>
            <SegmentedControl
              options={METRICS.map((m) => ({ value: m, label: METRIC_LABEL[m] }))}
              value={metric}
              onChange={setMetric}
              label="ตัวชี้วัดของกราฟ"
            />
          </div>
        </div>

        <div className={`grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4 transition-opacity ${loading && stats ? "opacity-60" : ""}`}>
          <ChartCard
            title="Top 10 โมเดลที่ใช้งานมากที่สุด"
            subtitle={`เรียงตาม${METRIC_LABEL[metric]}`}
            icon={ChartColumn}
            className="lg:col-span-3"
          >
            <UsageBarChart
              items={topModels.map((m) => ({ ...m, label: m.name }))}
              metric={metric}
              total={metricTotal}
              emptyText="ยังไม่มีการใช้งานโมเดลในช่วงเวลานี้"
            />
          </ChartCard>

          <ChartCard
            title="สัดส่วนการใช้งานโมเดล"
            subtitle={`คิดจาก${METRIC_LABEL[metric]}`}
            icon={ChartPie}
            className="lg:col-span-2"
          >
            <UsageDonutChart models={stats?.models ?? []} metric={metric} />
          </ChartCard>

          <ChartCard
            title={metric === "questions" ? "Top 10 ผู้ใช้ที่ถามมากที่สุด" : "Top 10 ผู้ใช้ที่ใช้ Tokens มากที่สุด"}
            subtitle={`เรียงตาม${METRIC_LABEL[metric]}`}
            icon={Users}
            className="lg:col-span-5"
          >
            <UsageBarChart
              items={topUsers.map((u) => ({ ...u, key: String(u.id), label: u.name, sublabel: u.email }))}
              metric={metric}
              total={metricTotal}
              emptyText="ยังไม่มีผู้ใช้งานในช่วงเวลานี้"
            />
          </ChartCard>
        </div>
      </section>
    </div>
  );
}
