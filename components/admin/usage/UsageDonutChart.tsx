"use client";

import React, { useMemo, useState } from "react";
import type { ModelUsage, UsageMetric } from "@/lib/usage-types";
import {
  CATEGORICAL_SLOTS,
  OTHER_COLOR,
  formatCompact,
  formatNumber,
  formatPercent,
  metricValue,
  METRIC_UNIT,
} from "./usage-format";

interface UsageDonutChartProps {
  /** All models, sorted by question count (this order fixes each model's color) */
  models: ModelUsage[];
  metric: UsageMetric;
}

interface Segment {
  key: string;
  label: string;
  value: number;
  color: string;
  /** Where the arc starts along the ring, and its length */
  start: number;
  length: number;
}

const SIZE = 180;
const STROKE = 26;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** 2px surface gap between segments, measured along the ring's centerline */
const GAP = 2;

/**
 * Share of usage per model. Colors follow the model (assigned by question rank),
 * so switching metric re-sizes segments without repainting them. At most five
 * models get their own segment; the rest fold into "อื่นๆ".
 */
export default function UsageDonutChart({ models, metric }: UsageDonutChartProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const { segments, total } = useMemo(() => {
    const colorByKey = new Map(
      models.slice(0, CATEGORICAL_SLOTS.length).map((m, i) => [m.key, CATEGORICAL_SLOTS[i]])
    );
    const ranked = models
      .map((m) => ({ key: m.key, label: m.name, value: metricValue(m, metric), color: colorByKey.get(m.key) }))
      .filter((m) => m.value > 0)
      .sort((a, b) => b.value - a.value);

    const own: Omit<Segment, "start" | "length">[] = [];
    let otherValue = 0;
    for (const m of ranked) {
      if (m.color && own.length < CATEGORICAL_SLOTS.length) {
        own.push({ key: m.key, label: m.label, value: m.value, color: m.color });
      } else {
        otherValue += m.value;
      }
    }
    if (otherValue > 0) {
      own.push({ key: "__other", label: "อื่นๆ", value: otherValue, color: OTHER_COLOR });
    }
    const sum = ranked.reduce((acc, m) => acc + m.value, 0);
    const placed: Segment[] = [];
    for (const segment of own) {
      const prev = placed[placed.length - 1];
      placed.push({
        ...segment,
        start: prev ? prev.start + prev.length : 0,
        length: (segment.value / sum) * CIRCUMFERENCE,
      });
    }
    return { segments: placed, total: sum };
  }, [models, metric]);

  if (total === 0) {
    return (
      <div className="h-full min-h-[180px] flex items-center justify-center text-xs text-slate-400">
        ยังไม่มีข้อมูลในช่วงเวลานี้
      </div>
    );
  }

  const active = segments.find((s) => s.key === activeKey) ?? null;
  const hasGaps = segments.length > 1;

  return (
    <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-5" onMouseLeave={() => setActiveKey(null)}>
      {/* Ring */}
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="-rotate-90"
          role="img"
          aria-label={`สัดส่วน${METRIC_UNIT[metric]}ตามโมเดล`}
        >
          {segments.map((segment) => {
            const dash = hasGaps ? Math.max(segment.length - GAP, 0.5) : segment.length;
            return (
              <circle
                key={segment.key}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={segment.color}
                strokeWidth={STROKE}
                strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
                strokeDashoffset={-segment.start}
                onMouseEnter={() => setActiveKey(segment.key)}
                className="cursor-default transition-opacity duration-150"
                style={{ opacity: active && active.key !== segment.key ? 0.35 : 1 }}
              />
            );
          })}
        </svg>

        {/* Center readout: total, or the hovered segment */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-8">
          {active ? (
            <>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight line-clamp-2 break-all">
                {active.label}
              </span>
              <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums leading-tight mt-0.5">
                {formatPercent(active.value, total)}
              </span>
              <span className="text-[10px] text-slate-400 tabular-nums">
                {formatNumber(active.value)} {METRIC_UNIT[metric]}
              </span>
            </>
          ) : (
            <>
              <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums leading-tight">
                {formatCompact(total)}
              </span>
              <span className="text-[10px] text-slate-400">{METRIC_UNIT[metric]}ทั้งหมด</span>
            </>
          )}
        </div>
      </div>

      {/* Legend: carries identity and exact values for every segment */}
      <ul className="w-full min-w-0 space-y-0.5">
        {segments.map((segment) => (
          <li
            key={segment.key}
            tabIndex={0}
            onMouseEnter={() => setActiveKey(segment.key)}
            onFocus={() => setActiveKey(segment.key)}
            onBlur={() => setActiveKey(null)}
            className={`flex items-center gap-2 px-2 py-1 rounded-md text-[11px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#0055fa]/40 ${
              activeKey === segment.key ? "bg-slate-50 dark:bg-white/[0.04]" : ""
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ backgroundColor: segment.color }} />
            <span className="flex-1 min-w-0 truncate text-slate-700 dark:text-slate-300" title={segment.label}>
              {segment.label}
            </span>
            <span className="text-slate-400 tabular-nums whitespace-nowrap">{formatNumber(segment.value)}</span>
            <span className="w-11 text-right font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
              {formatPercent(segment.value, total)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
