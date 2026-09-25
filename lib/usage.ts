import { query } from '@/lib/db';
import type {
  ModelUsage,
  UsageMonth,
  UsagePeriod,
  UsageStatsResponse,
  UsageTotals,
  UserUsage,
} from '@/lib/usage-types';

/**
 * Time zone used to decide where "today", "this week", "this month" and export months
 * begin and end. Defaults to Thailand time; override with USAGE_TIMEZONE.
 */
export const USAGE_TIMEZONE = process.env.USAGE_TIMEZONE || 'Asia/Bangkok';

const TOP_USERS_LIMIT = 10;

/**
 * CTE chain that turns every chat's `chat_history` JSONB into one row per question turn:
 * a user message plus the assistant/tool messages that answered it.
 *
 * User messages carry no model_id, so a turn is attributed to the model of its first
 * assistant message (falling back to the chat's model when the turn got no answer).
 * Token usage is summed over every message in the turn, and the turn is timestamped
 * with the time the question was asked.
 *
 * Exposes `usage_turns(chat_id, user_id, at, questions, input_tokens, output_tokens,
 * total_tokens, model_id, model_name)`.
 */
function usageTurnsCte(chatWhere: string): string {
  return `
    msgs AS (
      SELECT
        c.id AS chat_id,
        c.user_id,
        c.model_id AS chat_model_id,
        e.idx,
        e.m->>'role' AS role,
        COALESCE(
          CASE WHEN jsonb_typeof(e.m->'created_at') = 'string'
                AND e.m->>'created_at' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
               THEN (e.m->>'created_at')::timestamptz END,
          c.created_at
        ) AS created_at,
        CASE WHEN jsonb_typeof(e.m->'model_id') = 'number'
             THEN (e.m->>'model_id')::numeric::int END AS model_id,
        NULLIF(e.m->>'model_name', '') AS model_name,
        CASE WHEN jsonb_typeof(e.m->'input_tokens') = 'number'
             THEN (e.m->>'input_tokens')::numeric ELSE 0 END AS input_tokens,
        CASE WHEN jsonb_typeof(e.m->'output_tokens') = 'number'
             THEN (e.m->>'output_tokens')::numeric ELSE 0 END AS output_tokens,
        CASE WHEN jsonb_typeof(e.m->'total_tokens') = 'number'
             THEN (e.m->>'total_tokens')::numeric ELSE 0 END AS total_tokens
      FROM chats c
      CROSS JOIN LATERAL jsonb_array_elements(c.chat_history) WITH ORDINALITY AS e(m, idx)
      WHERE c.user_id IS NOT NULL AND jsonb_typeof(c.chat_history) = 'array' AND (${chatWhere})
    ),
    numbered AS (
      SELECT msgs.*,
             COUNT(*) FILTER (WHERE role = 'user') OVER (PARTITION BY chat_id ORDER BY idx) AS turn_no
      FROM msgs
    ),
    turns AS (
      SELECT
        chat_id,
        user_id,
        COALESCE(MIN(created_at) FILTER (WHERE role = 'user'), MIN(created_at)) AS at,
        COUNT(*) FILTER (WHERE role = 'user') AS questions,
        SUM(input_tokens) AS input_tokens,
        SUM(output_tokens) AS output_tokens,
        SUM(total_tokens) AS total_tokens,
        (ARRAY_AGG(model_id ORDER BY idx)
          FILTER (WHERE role = 'assistant' AND model_id IS NOT NULL))[1] AS answered_model_id,
        (ARRAY_AGG(model_name ORDER BY idx)
          FILTER (WHERE role = 'assistant' AND model_name IS NOT NULL))[1] AS answered_model_name,
        MAX(chat_model_id) AS chat_model_id
      FROM numbered
      GROUP BY chat_id, user_id, turn_no
    ),
    usage_turns AS (
      SELECT
        t.chat_id,
        t.user_id,
        t.at,
        t.questions,
        t.input_tokens,
        t.output_tokens,
        t.total_tokens,
        COALESCE(t.answered_model_id, t.chat_model_id) AS model_id,
        COALESCE(md.display_name, t.answered_model_name, 'Unknown model') AS model_name
      FROM turns t
      LEFT JOIN models md ON md.id = COALESCE(t.answered_model_id, t.chat_model_id)
    )
  `;
}

/** Aggregated sums come back from pg as numeric strings */
type Numeric = string | number | null;

interface TotalsRow {
  questions: Numeric;
  input_tokens: Numeric;
  output_tokens: Numeric;
  total_tokens: Numeric;
}

interface StatsRow extends TotalsRow {
  is_grand_total: number;
  user_id: number | null;
  model_id: number | null;
  model_name: string | null;
  conversations: Numeric;
}

function toTotals(row: TotalsRow | null | undefined): UsageTotals {
  return {
    questions: Number(row?.questions ?? 0),
    inputTokens: Number(row?.input_tokens ?? 0),
    outputTokens: Number(row?.output_tokens ?? 0),
    totalTokens: Number(row?.total_tokens ?? 0),
  };
}

function addTotals(target: UsageTotals, source: UsageTotals) {
  target.questions += source.questions;
  target.inputTokens += source.inputTokens;
  target.outputTokens += source.outputTokens;
  target.totalTokens += source.totalTokens;
}

const emptyTotals = (): UsageTotals => ({
  questions: 0,
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
});

/** Start of the given period in USAGE_TIMEZONE (null for "all"). Weeks start on Monday. */
async function getPeriodStart(period: UsagePeriod): Promise<Date | null> {
  if (period === 'all') return null;
  const unit = { today: 'day', week: 'week', month: 'month' }[period];
  const result = await query<{ start: Date }>(
    `SELECT date_trunc($1, now() AT TIME ZONE $2) AT TIME ZONE $2 AS start`,
    [unit, USAGE_TIMEZONE]
  );
  return result.rows[0].start;
}

/**
 * Dashboard statistics for a period: headline totals, per-model usage and top users.
 */
export async function getUsageStats(period: UsagePeriod): Promise<UsageStatsResponse> {
  const start = await getPeriodStart(period);

  // Chats not touched since the period began cannot contain messages from it
  const [usageResult, usersResult] = await Promise.all([
    query<StatsRow>(
      `WITH ${usageTurnsCte('$1::timestamptz IS NULL OR c.updated_at >= $1')}
       SELECT
         GROUPING(user_id, model_id) AS is_grand_total,
         user_id,
         model_id,
         MAX(model_name) AS model_name,
         SUM(questions) AS questions,
         SUM(input_tokens) AS input_tokens,
         SUM(output_tokens) AS output_tokens,
         SUM(total_tokens) AS total_tokens,
         COUNT(DISTINCT chat_id) AS conversations
       FROM usage_turns
       WHERE $1::timestamptz IS NULL OR at >= $1
       GROUP BY GROUPING SETS ((user_id, model_id), ())`,
      [start]
    ),
    query<{ id: number; name: string; email: string }>(`SELECT id, name, email FROM users`),
  ]);

  const usersById = new Map(usersResult.rows.map((u) => [u.id, u]));
  const models = new Map<string, ModelUsage>();
  const users = new Map<number, UserUsage>();
  let grandTotal: StatsRow | null = null;

  for (const row of usageResult.rows) {
    if (Number(row.is_grand_total) !== 0) {
      grandTotal = row;
      continue;
    }
    const totals = toTotals(row);

    const modelKey = row.model_id === null ? 'unknown' : String(row.model_id);
    const model = models.get(modelKey) ?? {
      key: modelKey,
      name: row.model_name ?? 'Unknown model',
      ...emptyTotals(),
    };
    addTotals(model, totals);
    models.set(modelKey, model);

    const userId = Number(row.user_id);
    const info = usersById.get(userId);
    const user = users.get(userId) ?? {
      id: userId,
      name: info?.name ?? `User #${userId}`,
      email: info?.email ?? '',
      ...emptyTotals(),
    };
    addTotals(user, totals);
    users.set(userId, user);
  }

  const userList = [...users.values()];
  const byQuestions = (a: UsageTotals, b: UsageTotals) =>
    b.questions - a.questions || b.totalTokens - a.totalTokens;
  const byTokens = (a: UsageTotals, b: UsageTotals) =>
    b.totalTokens - a.totalTokens || b.questions - a.questions;

  return {
    period,
    rangeStart: start ? start.toISOString() : null,
    rangeEnd: new Date().toISOString(),
    timezone: USAGE_TIMEZONE,
    summary: {
      ...toTotals(grandTotal),
      activeUsers: userList.filter((u) => u.questions > 0).length,
      totalUsers: usersResult.rows.length,
      conversations: Number(grandTotal?.conversations ?? 0),
    },
    models: [...models.values()].sort(byQuestions),
    topUsersByQuestions: userList.filter((u) => u.questions > 0).sort(byQuestions).slice(0, TOP_USERS_LIMIT),
    topUsersByTokens: userList.filter((u) => u.totalTokens > 0).sort(byTokens).slice(0, TOP_USERS_LIMIT),
  };
}

/** Months (YYYY-MM in USAGE_TIMEZONE) that have any usage, newest first. */
export async function getUsageMonths(): Promise<UsageMonth[]> {
  const result = await query(
    `WITH ${usageTurnsCte('true')}
     SELECT
       to_char(at AT TIME ZONE $1, 'YYYY-MM') AS month,
       SUM(questions) AS questions,
       SUM(total_tokens) AS total_tokens
     FROM usage_turns
     GROUP BY 1
     HAVING SUM(questions) > 0 OR SUM(total_tokens) > 0
     ORDER BY 1 DESC`,
    [USAGE_TIMEZONE]
  );
  return result.rows.map((row) => ({
    month: row.month,
    questions: Number(row.questions),
    totalTokens: Number(row.total_tokens),
  }));
}

export interface MonthlyUserUsage extends UsageTotals {
  month: string;
  userId: number;
  name: string;
  email: string;
  conversations: number;
}

export interface MonthlySummary extends UsageTotals {
  month: string;
  activeUsers: number;
  conversations: number;
}

/**
 * Per-user usage for each of the given months (YYYY-MM), plus a per-month summary.
 * Only users with usage in a month get a row for that month.
 */
export async function getMonthlyUsageReport(
  months: string[]
): Promise<{ rows: MonthlyUserUsage[]; summaries: MonthlySummary[] }> {
  const sortedMonths = [...months].sort();
  const earliestMonthStart = `${sortedMonths[0]}-01 00:00:00`;

  const turnsCte = usageTurnsCte('c.updated_at >= ($3::timestamp AT TIME ZONE $1)');
  const [userResult, summaryResult] = await Promise.all([
    query(
      `WITH ${turnsCte}
       SELECT
         to_char(ut.at AT TIME ZONE $1, 'YYYY-MM') AS month,
         ut.user_id,
         u.name,
         u.email,
         SUM(ut.questions) AS questions,
         SUM(ut.input_tokens) AS input_tokens,
         SUM(ut.output_tokens) AS output_tokens,
         SUM(ut.total_tokens) AS total_tokens,
         COUNT(DISTINCT ut.chat_id) AS conversations
       FROM usage_turns ut
       JOIN users u ON u.id = ut.user_id
       WHERE to_char(ut.at AT TIME ZONE $1, 'YYYY-MM') = ANY($2::text[])
       GROUP BY 1, ut.user_id, u.name, u.email
       HAVING SUM(ut.questions) > 0 OR SUM(ut.total_tokens) > 0
       ORDER BY 1, SUM(ut.questions) DESC, SUM(ut.total_tokens) DESC, u.name`,
      [USAGE_TIMEZONE, sortedMonths, earliestMonthStart]
    ),
    query(
      `WITH ${turnsCte}
       SELECT
         to_char(at AT TIME ZONE $1, 'YYYY-MM') AS month,
         COUNT(DISTINCT user_id) FILTER (WHERE questions > 0) AS active_users,
         COUNT(DISTINCT chat_id) AS conversations,
         SUM(questions) AS questions,
         SUM(input_tokens) AS input_tokens,
         SUM(output_tokens) AS output_tokens,
         SUM(total_tokens) AS total_tokens
       FROM usage_turns
       WHERE to_char(at AT TIME ZONE $1, 'YYYY-MM') = ANY($2::text[])
       GROUP BY 1`,
      [USAGE_TIMEZONE, sortedMonths, earliestMonthStart]
    ),
  ]);

  const summaryByMonth = new Map(summaryResult.rows.map((row) => [row.month, row]));

  return {
    rows: userResult.rows.map((row) => ({
      month: row.month,
      userId: Number(row.user_id),
      name: row.name,
      email: row.email,
      conversations: Number(row.conversations),
      ...toTotals(row),
    })),
    // Every requested month appears in the summary, even with zero usage
    summaries: sortedMonths.map((month) => {
      const row = summaryByMonth.get(month);
      return {
        month,
        activeUsers: Number(row?.active_users ?? 0),
        conversations: Number(row?.conversations ?? 0),
        ...toTotals(row),
      };
    }),
  };
}
