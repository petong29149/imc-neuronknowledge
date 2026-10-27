import type { TableSchema } from '@/lib/studio/types';
import type { PreviewResult, SslMode } from '../types';

export const CONNECT_TIMEOUT_MS = 10_000;
export const PREVIEW_ROW_LIMIT = 5;
export const MAX_TABLES = 500;

export interface ConnectParams {
  /** Host name as entered (used for TLS SNI / certificate checks) */
  host: string;
  /** Address resolved and approved by checkHost(); the driver dials this */
  address: string;
  port: number;
  database: string;
  username: string;
  password: string;
  sslMode: SslMode;
}

/** Drivers throw raw errors; the service maps them with friendlyConnectionError(). */
export interface DbDriver {
  /** Connects and reports whether the account can change data or schema. */
  test(params: ConnectParams): Promise<{ readOnly: boolean }>;
  listTables(params: ConnectParams): Promise<TableSchema[]>;
  /** Throws TableNotFoundError when the table is missing or not readable. */
  preview(params: ConnectParams, schema: string, table: string): Promise<PreviewResult>;
  /**
   * Runs one already-validated SELECT in a read-only session and returns at most
   * maxRows + 1 rows (the extra row tells the caller the result was cut).
   */
  query(params: ConnectParams, sql: string, maxRows: number): Promise<RawQueryResult>;
}

export interface RawQueryResult {
  columns: string[];
  rows: unknown[][];
}

export class TableNotFoundError extends Error {}

/** Makes driver values JSON-safe and short enough for a preview grid. */
export function previewValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return `[binary ${value.length} bytes]`;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'object') {
    const json = JSON.stringify(value);
    return json.length > 500 ? `${json.slice(0, 500)}…` : json;
  }
  if (typeof value === 'string' && value.length > 500) return `${value.slice(0, 500)}…`;
  return value;
}
