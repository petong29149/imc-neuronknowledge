/**
 * Shared types for the usage monitoring dashboard (safe to import from client components).
 */

export type UsagePeriod = 'today' | 'week' | 'month' | 'all';

export const USAGE_PERIODS: UsagePeriod[] = ['today', 'week', 'month', 'all'];

export type UsageMetric = 'questions' | 'tokens';

export interface UsageTotals {
  questions: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface ModelUsage extends UsageTotals {
  /** Stable grouping key (model DB id, or the stored model name for deleted models) */
  key: string;
  name: string;
}

export interface UserUsage extends UsageTotals {
  id: number;
  name: string;
  email: string;
}

export interface UsageStatsResponse {
  period: UsagePeriod;
  /** ISO start of the period (null for "all") */
  rangeStart: string | null;
  rangeEnd: string;
  timezone: string;
  summary: UsageTotals & {
    activeUsers: number;
    totalUsers: number;
    conversations: number;
  };
  /** Every model with usage in the period, sorted by question count */
  models: ModelUsage[];
  topUsersByQuestions: UserUsage[];
  topUsersByTokens: UserUsage[];
}

export interface UsageMonth {
  /** YYYY-MM */
  month: string;
  questions: number;
  totalTokens: number;
}

export type ExportFormat = 'csv' | 'xlsx';
