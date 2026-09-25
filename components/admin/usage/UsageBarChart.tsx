"use client";

import React, { useState } from "react";
import type { UsageMetric, UsageTotals } from "@/lib/usage-types";
import { formatNumber, formatPercent, metricValue, METRIC_UNIT } from "./usage-format";

export interface BarItem extends UsageTotals {
  key: string;
  label: string;
  sublabel?: string;
}

interface UsageBarChartProps {
  items: BarItem[];
  metric: UsageMetric;
  /** Denominator for the share shown in the tooltip */
  total: number;
  emptyText: string;
}

/**
 * Ranked horizontal bar chart: one series, one color, value at each bar's tip.
 * Hovering or focusing a row shows both metrics for that item.
 */
export default function UsageBarChart({ items, metric, total, emptyText }: UsageBarChartProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const max = Math.max(0, ...items.map((item) => metricValue(item, metric)));

  if (items.length === 0 || max === 0) {
    return (
      <div className="h-full min-h-[180px] flex items-center justify-center text-xs text-slate-400">
        {emptyText}
      </div>
    );
  }

  return (
    <ol className="space-y-0.5" onMouseLeave={() => setActiveKey(null)}>
      {items.map((item, index) => {
        const value = metricValue(item, metric);
        const isActive = activeKey === item.key;
        return (
          <li
            key={item.key}
            tabIndex={0}
            onMouseEnter={() => setActiveKey(item.key)}
            onFocus={() => setActiveKey(item.key)}
            onBlur={() => setActiveKey(null)}
            aria-label={`${item.label}: ${formatNumber(value)} ${METRIC_UNIT[metric]}`}
            className={`relative grid grid-cols-[minmax(0,38%)_minmax(0,1fr)] sm:grid-cols-[minmax(0,32%)_minmax(0,1fr)] items-center gap-3 px-2 py-1.5 rounded-lg outline-none transition-colors ${
              isActive ? "bg-slate-50 dark:bg-white/[0.04]" : ""
            } focus-visible:ring-2 focus-visible:ring-[#0055fa]/40`}
          >
            {/* Label */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-4 shrink-0 text-right text-[10px] font-semibold text-slate-400 tabular-nums">
                {index + 1}
              </span>
              <div className="min-w-0">
                <div className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate" title={item.label}>
                  {item.label}
                </div>
                {item.sublabel && (
                  <div className="text-[10px] text-slate-400 truncate font-mono" title={item.sublabel}>
                    {item.sublabel}
                  </div>
                )}
              </div>
            </div>

            {/* Bar + value at the tip */}
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="h-3.5 rounded-r-[4px] shrink-0 transition-[width] duration-300 ease-out"
                style={{
                  width: `calc((100% - 5rem) * ${value / max})`,
                  minWidth: value > 0 ? 2 : 0,
                  backgroundColor: "var(--viz-1)",
                }}
              />
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap">
                {formatNumber(value)}
              </span>
            </div>

            {/* Tooltip */}
            {isActive && (
              <div
                role="tooltip"
                className="pointer-events-none absolute z-10 right-2 bottom-full mb-1 w-52 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131c31] shadow-lg px-3 py-2 text-[11px]"
              >
                <div className="font-semibold text-slate-900 dark:text-white truncate">{item.label}</div>
                {item.sublabel && (
                  <div className="text-[10px] text-slate-400 truncate font-mono">{item.sublabel}</div>
                )}
                <dl className="mt-1.5 space-y-0.5 text-slate-600 dark:text-slate-300">
                  <div className="flex justify-between gap-3">
                    <dt>คำถาม</dt>
                    <dd className="font-semibold tabular-nums">{formatNumber(item.questions)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Tokens</dt>
                    <dd className="font-semibold tabular-nums">{formatNumber(item.totalTokens)}</dd>
                  </div>
                  <div className="flex justify-between gap-3 text-slate-400">
                    <dt>Input / Output</dt>
                    <dd className="tabular-nums">
                      {formatNumber(item.inputTokens)} / {formatNumber(item.outputTokens)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 pt-1 mt-1 border-t border-slate-100 dark:border-white/10">
                    <dt>สัดส่วน{metric === "questions" ? "คำถาม" : " Tokens"}</dt>
                    <dd className="font-semibold tabular-nums">{formatPercent(value, total)}</dd>
                  </div>
                </dl>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
