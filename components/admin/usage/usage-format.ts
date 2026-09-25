import type { UsageMetric, UsageTotals } from "@/lib/usage-types";

const integerFormat = new Intl.NumberFormat("en-US");
const compactFormat = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export const formatNumber = (value: number) => integerFormat.format(value);

/** Full number up to 7 digits, compact (12.4M) beyond that */
export const formatCompact = (value: number) =>
  value >= 10_000_000 ? compactFormat.format(value) : integerFormat.format(value);

export const formatPercent = (value: number, total: number) =>
  total > 0 ? `${((value / total) * 100).toFixed(value === total ? 0 : 1)}%` : "0%";

export const metricValue = (totals: UsageTotals, metric: UsageMetric) =>
  metric === "questions" ? totals.questions : totals.totalTokens;

export const METRIC_LABEL: Record<UsageMetric, string> = {
  questions: "จำนวนคำถาม",
  tokens: "Tokens",
};

export const METRIC_UNIT: Record<UsageMetric, string> = {
  questions: "คำถาม",
  tokens: "tokens",
};

export const errorMessage = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

/** Thai month names on the Gregorian calendar, matching the YYYY-MM used in exported files */
export const THAI_LOCALE = "th-TH-u-ca-gregory";

export function formatMonthShort(month: string) {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m - 1, 1)).toLocaleDateString(THAI_LOCALE, {
    month: "short",
    timeZone: "UTC",
  });
}

export function formatMonthLong(month: string) {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m - 1, 1)).toLocaleDateString(THAI_LOCALE, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Chart color tokens, validated for this app's card surfaces (white / #0c1222).
 * Categorical slots are assigned in fixed order; SERIES_SURFACE draws the 2px gaps between marks.
 */
export const VIZ_VARS = [
  "[--viz-surface:#ffffff] dark:[--viz-surface:#0c1222]",
  "[--viz-track:#f1f5f9] dark:[--viz-track:rgba(255,255,255,0.04)]",
  "[--viz-1:#2a78d6] dark:[--viz-1:#3987e5]",
  "[--viz-2:#eb6834] dark:[--viz-2:#d95926]",
  "[--viz-3:#1baf7a] dark:[--viz-3:#199e70]",
  "[--viz-4:#eda100] dark:[--viz-4:#c98500]",
  "[--viz-5:#e87ba4] dark:[--viz-5:#d55181]",
  "[--viz-other:#b5b4ad] dark:[--viz-other:#55544f]",
].join(" ");

export const CATEGORICAL_SLOTS = [
  "var(--viz-1)",
  "var(--viz-2)",
  "var(--viz-3)",
  "var(--viz-4)",
  "var(--viz-5)",
];

export const OTHER_COLOR = "var(--viz-other)";
