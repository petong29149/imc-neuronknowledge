import type { ConnectionType, DataConnection } from '@/lib/studio/types';

export type SslMode = 'disable' | 'prefer' | 'require' | 'verify-full';
export const SSL_MODES: SslMode[] = ['disable', 'prefer', 'require', 'verify-full'];

export const CONNECTION_TYPES: ConnectionType[] = [
  'postgresql',
  'mysql',
  'mssql',
  'mariadb',
  'oracle',
  'cockroachdb',
  'redshift',
  'clickhouse',
];
/** Types with an installed driver (see lib/studio/connections/drivers). */
export const SUPPORTED_TYPES: ConnectionType[] = CONNECTION_TYPES;

export const DEFAULT_PORTS: Record<ConnectionType, number> = {
  postgresql: 5432,
  mysql: 3306,
  mssql: 1433,
  mariadb: 3306,
  oracle: 1521,
  cockroachdb: 26257,
  redshift: 5439,
  clickhouse: 8123,
};

/** Cloud and distributed databases normally require TLS. */
export const DEFAULT_SSL: Record<ConnectionType, SslMode> = {
  postgresql: 'prefer',
  mysql: 'prefer',
  mssql: 'prefer',
  mariadb: 'prefer',
  oracle: 'disable',
  cockroachdb: 'require',
  redshift: 'require',
  clickhouse: 'disable',
};

export const TYPE_LABELS: Record<ConnectionType, string> = {
  postgresql: 'PostgreSQL',
  mysql: 'MySQL',
  mssql: 'SQL Server',
  mariadb: 'MariaDB',
  oracle: 'Oracle',
  cockroachdb: 'CockroachDB',
  redshift: 'Amazon Redshift',
  clickhouse: 'ClickHouse',
};

/** Label of the "database" field, and form hints where a type behaves differently. */
export const TYPE_HINTS: Partial<Record<ConnectionType, { database?: string; hint?: string }>> = {
  oracle: {
    database: 'Service name',
    hint: 'Oracle: ใส่ service name (เช่น ORCLPDB1) • SSL: disable/prefer = TCP, require/verify-full = TCPS',
  },
  clickhouse: {
    hint: 'ClickHouse เชื่อมต่อผ่าน HTTP: port 8123 = disable, port 8443 = require หรือ verify-full (HTTPS)',
  },
  redshift: { hint: 'Redshift: port ปกติ 5439 และต้องใช้ SSL' },
  cockroachdb: { hint: 'CockroachDB: port ปกติ 26257 ถ้าใช้ CockroachDB Cloud ให้ใช้ SSL แบบ verify-full' },
};

export interface KnowledgeSetRef {
  id: number;
  name: string;
}

export type IconKind = 'auto' | 'preset' | 'custom';

/** Per-connection picture shown next to the database-type logo. */
export interface ConnectionIcon {
  kind: IconKind;
  /** Preset key (see icons.ts); for `auto` this is the key derived from the name, or null for initials */
  preset: string | null;
  color: string;
  /** Uploaded image URL (custom only) */
  url: string | null;
}

// TODO(CORE-01): these fields belong in DataConnection (lib/studio/types.ts);
// proposed in docs/handoff/S02.md. Kept local until the shared type is updated.
export interface ConnectionView extends DataConnection {
  sslMode: SslMode;
  knowledgeSets: KnowledgeSetRef[];
  description: string;
  icon: ConnectionIcon;
  published: boolean;
  /** Off = not offered to AI, MCP or users at all (tables/columns keep their settings) */
  enabled: boolean;
  catalogSyncedAt: string | null;
  enabledTableCount: number;
}

// ---------- Data catalog (v2)
export type DescriptionStatus = 'empty' | 'draft' | 'approved';
export const DESCRIPTION_STATUSES: DescriptionStatus[] = ['empty', 'draft', 'approved'];

export interface CatalogColumn {
  id: number;
  name: string;
  dataType: string;
  nullable: boolean;
  ordinal: number;
  enabled: boolean;
  isPii: boolean;
  missing: boolean;
  description: string;
  exampleValues: string[];
  status: DescriptionStatus;
}

export interface CatalogTable {
  id: number;
  schema: string;
  table: string;
  enabled: boolean;
  missing: boolean;
  rowEstimate: number | null;
  description: string;
  synonyms: string[];
  sampleQuestions: string[];
  status: DescriptionStatus;
  updatedAt: string;
  columns: CatalogColumn[];
}

/** Rows are arrays so duplicate column names (joins) are kept. */
export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  truncated: boolean;
  durationMs: number;
}

export const QUERY_MAX_ROWS = 100;

/** Values from the create/edit form. An empty password means "keep the stored one". */
export interface ConnectionInput {
  name: string;
  type: ConnectionType;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  sslMode: SslMode;
  /** undefined = keep the stored description (update only) */
  description?: string;
}

export interface TestResult {
  ok: boolean;
  readOnly: boolean;
  error?: string;
}

export interface PreviewResult {
  columns: string[];
  rows: Record<string, unknown>[];
}
