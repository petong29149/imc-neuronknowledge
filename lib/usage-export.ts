import ExcelJS from 'exceljs';
import type { MonthlySummary, MonthlyUserUsage } from '@/lib/usage';
import { USAGE_TIMEZONE } from '@/lib/usage';

interface UsageReport {
  months: string[];
  rows: MonthlyUserUsage[];
  summaries: MonthlySummary[];
}

export function exportFileName(months: string[], ext: string): string {
  const sorted = [...months].sort();
  const label =
    sorted.length <= 3
      ? sorted.join('_')
      : `${sorted[0]}_to_${sorted[sorted.length - 1]}_${sorted.length}-months`;
  return `neuronknowledge-usage_${label}.${ext}`;
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** One row per user per selected month. Starts with a BOM so Excel reads Thai names as UTF-8. */
export function buildUsageCsv({ rows }: UsageReport): string {
  const header = [
    'Month',
    'User',
    'Email',
    'Questions',
    'Conversations',
    'Input Tokens',
    'Output Tokens',
    'Total Tokens',
  ];
  const lines = rows.map((r) =>
    [r.month, r.name, r.email, r.questions, r.conversations, r.inputTokens, r.outputTokens, r.totalTokens]
      .map(csvCell)
      .join(',')
  );
  return '﻿' + [header.join(','), ...lines].join('\r\n') + '\r\n';
}

const NUMBER_FORMAT = '#,##0';

function styleTable(sheet: ExcelJS.Worksheet, headerRowNumber: number, numericFrom: number) {
  const header = sheet.getRow(headerRowNumber);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0055FA' } };
  header.alignment = { vertical: 'middle' };

  sheet.columns.forEach((column, i) => {
    if (i + 1 >= numericFrom) column.numFmt = NUMBER_FORMAT;
  });
  sheet.views = [{ state: 'frozen', ySplit: headerRowNumber }];
}

/** Workbook with a per-month summary, per-user totals across the selection, and the month × user detail. */
export async function buildUsageXlsx({ months, rows, summaries }: UsageReport): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'NeuronKnowledge';
  workbook.created = new Date();

  // --- Summary: one row per month + grand total ---
  const summary = workbook.addWorksheet('Summary');
  summary.addRow(['NeuronKnowledge Usage Report']).font = { bold: true, size: 14 };
  summary.addRow([`Months: ${[...months].sort().join(', ')}`]);
  summary.addRow([`Generated: ${new Date().toISOString()} (months in ${USAGE_TIMEZONE})`]);
  summary.addRow([]);
  summary.addRow([
    'Month',
    'Active Users',
    'Conversations',
    'Questions',
    'Input Tokens',
    'Output Tokens',
    'Total Tokens',
  ]);
  for (const s of summaries) {
    summary.addRow([
      s.month,
      s.activeUsers,
      s.conversations,
      s.questions,
      s.inputTokens,
      s.outputTokens,
      s.totalTokens,
    ]);
  }
  const distinctActiveUsers = new Set(rows.filter((r) => r.questions > 0).map((r) => r.userId)).size;
  const sum = (key: 'conversations' | 'questions' | 'inputTokens' | 'outputTokens' | 'totalTokens') =>
    summaries.reduce((acc, s) => acc + s[key], 0);
  summary.addRow([
    'Total',
    distinctActiveUsers,
    sum('conversations'),
    sum('questions'),
    sum('inputTokens'),
    sum('outputTokens'),
    sum('totalTokens'),
  ]).font = { bold: true };
  summary.columns = [16, 14, 15, 13, 16, 16, 16].map((width) => ({ width }));
  styleTable(summary, 5, 2);

  // --- By User: totals across all selected months ---
  const byUser = workbook.addWorksheet('By User');
  byUser.addRow(['User', 'Email', 'Questions', 'Input Tokens', 'Output Tokens', 'Total Tokens']);
  const userTotals = new Map<number, MonthlyUserUsage>();
  for (const r of rows) {
    const t = userTotals.get(r.userId);
    if (!t) {
      userTotals.set(r.userId, { ...r });
    } else {
      t.questions += r.questions;
      t.inputTokens += r.inputTokens;
      t.outputTokens += r.outputTokens;
      t.totalTokens += r.totalTokens;
    }
  }
  [...userTotals.values()]
    .sort((a, b) => b.questions - a.questions || b.totalTokens - a.totalTokens)
    .forEach((u) =>
      byUser.addRow([u.name, u.email, u.questions, u.inputTokens, u.outputTokens, u.totalTokens])
    );
  byUser.columns = [28, 32, 13, 16, 16, 16].map((width) => ({ width }));
  byUser.autoFilter = { from: 'A1', to: 'F1' };
  styleTable(byUser, 1, 3);

  // --- By Month: one row per user per month ---
  const byMonth = workbook.addWorksheet('By Month');
  byMonth.addRow([
    'Month',
    'User',
    'Email',
    'Questions',
    'Conversations',
    'Input Tokens',
    'Output Tokens',
    'Total Tokens',
  ]);
  for (const r of rows) {
    byMonth.addRow([
      r.month,
      r.name,
      r.email,
      r.questions,
      r.conversations,
      r.inputTokens,
      r.outputTokens,
      r.totalTokens,
    ]);
  }
  byMonth.columns = [12, 28, 32, 13, 15, 16, 16, 16].map((width) => ({ width }));
  byMonth.autoFilter = { from: 'A1', to: 'H1' };
  styleTable(byMonth, 1, 4);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
