import { query } from '@/lib/db';
import type { AuthUser } from '@/lib/auth';
import type { ConnectionStatus, ConnectionType } from '@/lib/studio/types';
import { autoIcon } from './icons';
import type { ConnectionView, IconKind, KnowledgeSetRef, SslMode } from './types';

interface ConnectionRow {
  id: number;
  name: string;
  type: ConnectionType;
  host: string;
  port: number;
  database_name: string;
  username: string;
  password_encrypted: string | null;
  ssl_mode: SslMode;
  read_only_verified: boolean;
  status: ConnectionStatus;
  last_error: string | null;
  last_tested_at: Date | null;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
  description: string;
  icon_kind: IconKind;
  icon_preset: string | null;
  icon_color: string | null;
  has_icon_data: boolean;
  published: boolean;
  enabled: boolean;
  catalog_synced_at: Date | null;
  enabled_table_count: number;
  knowledge_sets: KnowledgeSetRef[];
}

/** Row including the encrypted password; stays on the server. */
export interface StoredConnection {
  view: ConnectionView;
  passwordEncrypted: string | null;
  /** An uploaded picture is stored, even if another icon kind is selected now */
  hasIconData: boolean;
}

// icon_data is left out on purpose: uploaded pictures are served by /api/connections/[id]/icon.
const CONNECTION_COLUMNS = `dc.id, dc.name, dc.type, dc.host, dc.port, dc.database_name, dc.username,
  dc.password_encrypted, dc.ssl_mode, dc.read_only_verified, dc.status, dc.last_error, dc.last_tested_at,
  dc.created_by, dc.created_at, dc.updated_at, dc.description, dc.icon_kind, dc.icon_preset, dc.icon_color,
  dc.icon_data IS NOT NULL AS has_icon_data, dc.published, dc.enabled, dc.catalog_synced_at,
  (SELECT count(*)::int FROM connection_tables t WHERE t.connection_id = dc.id AND t.enabled AND NOT t.missing)
    AS enabled_table_count`;

const SELECT_CONNECTION = `
  SELECT ${CONNECTION_COLUMNS}, COALESCE(ks.list, '[]'::json) AS knowledge_sets
  FROM data_connections dc
  LEFT JOIN LATERAL (
    SELECT json_agg(json_build_object('id', s.id, 'name', s.name) ORDER BY s.name) AS list
    FROM knowledge_sets s
    WHERE s.id IN (SELECT knowledge_set_id FROM knowledge_sources WHERE connection_id = dc.id)
  ) ks ON true`;

export function iconOf(row: {
  id: number;
  name: string;
  database_name: string;
  updated_at: Date;
  icon_kind: IconKind;
  icon_preset: string | null;
  icon_color: string | null;
  has_icon_data: boolean;
}): ConnectionView['icon'] {
  const auto = autoIcon(row.name, row.database_name);
  if (row.icon_kind === 'custom' && row.has_icon_data) {
    // The version parameter busts the browser cache when the picture changes.
    return { kind: 'custom', preset: null, color: row.icon_color ?? auto.color, url: `/api/connections/${row.id}/icon?v=${row.updated_at.getTime()}` };
  }
  if (row.icon_kind === 'preset' && row.icon_preset) {
    return { kind: 'preset', preset: row.icon_preset, color: row.icon_color ?? auto.color, url: null };
  }
  return { kind: 'auto', preset: auto.preset, color: auto.color, url: null };
}

function toStored(row: ConnectionRow): StoredConnection {
  return {
    passwordEncrypted: row.password_encrypted,
    hasIconData: row.has_icon_data,
    view: {
      id: row.id,
      name: row.name,
      type: row.type,
      host: row.host,
      port: row.port,
      database: row.database_name,
      username: row.username,
      hasPassword: Boolean(row.password_encrypted),
      readOnlyVerified: row.read_only_verified,
      status: row.status,
      lastError: row.last_error,
      lastTestedAt: row.last_tested_at ? row.last_tested_at.toISOString() : null,
      createdBy: row.created_by ?? 0,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      sslMode: row.ssl_mode,
      knowledgeSets: row.knowledge_sets,
      description: row.description,
      icon: iconOf(row),
      published: row.published,
      enabled: row.enabled,
      catalogSyncedAt: row.catalog_synced_at ? row.catalog_synced_at.toISOString() : null,
      enabledTableCount: row.enabled_table_count,
    },
  };
}

/** Creators see the connections they created; admins see all. */
function ownerFilter(session: AuthUser, paramIndex: number): { sql: string; params: unknown[] } {
  return session.role === 'admin'
    ? { sql: '', params: [] }
    : { sql: ` AND dc.created_by = $${paramIndex}`, params: [session.id] };
}

export async function listConnections(session: AuthUser): Promise<ConnectionView[]> {
  const owner = ownerFilter(session, 1);
  const { rows } = await query<ConnectionRow>(
    `${SELECT_CONNECTION} WHERE true${owner.sql} ORDER BY dc.updated_at DESC`,
    owner.params
  );
  return rows.map((r) => toStored(r).view);
}

export async function findConnection(session: AuthUser, id: number): Promise<StoredConnection | null> {
  const owner = ownerFilter(session, 2);
  const { rows } = await query<ConnectionRow>(
    `${SELECT_CONNECTION} WHERE dc.id = $1${owner.sql}`,
    [id, ...owner.params]
  );
  return rows[0] ? toStored(rows[0]) : null;
}

export interface ConnectionWrite {
  name: string;
  type: ConnectionType;
  host: string;
  port: number;
  database: string;
  username: string;
  /** undefined = keep the stored value (update only) */
  passwordEncrypted: string | null | undefined;
  sslMode: SslMode;
  readOnlyVerified: boolean;
  status: ConnectionStatus;
  lastError: string | null;
  tested: boolean;
  /** undefined = keep the stored description */
  description?: string;
}

export async function insertConnection(createdBy: number, w: ConnectionWrite): Promise<number> {
  const { rows } = await query<{ id: number }>(
    `INSERT INTO data_connections
       (name, type, host, port, database_name, username, password_encrypted, ssl_mode,
        read_only_verified, status, last_error, last_tested_at, created_by, description)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CASE WHEN $12 THEN now() END, $13, $14)
     RETURNING id`,
    [
      w.name, w.type, w.host, w.port, w.database, w.username, w.passwordEncrypted ?? null,
      w.sslMode, w.readOnlyVerified, w.status, w.lastError, w.tested, createdBy, w.description ?? '',
    ]
  );
  return rows[0].id;
}

export async function updateConnectionRow(id: number, w: ConnectionWrite): Promise<void> {
  await query(
    `UPDATE data_connections SET
       name = $2, type = $3, host = $4, port = $5, database_name = $6, username = $7,
       password_encrypted = CASE WHEN $8 THEN $9 ELSE password_encrypted END,
       ssl_mode = $10, read_only_verified = $11, status = $12, last_error = $13,
       last_tested_at = CASE WHEN $14 THEN now() ELSE last_tested_at END,
       description = COALESCE($15, description),
       updated_at = now()
     WHERE id = $1`,
    [
      id, w.name, w.type, w.host, w.port, w.database, w.username,
      w.passwordEncrypted !== undefined, w.passwordEncrypted ?? null,
      w.sslMode, w.readOnlyVerified, w.status, w.lastError, w.tested, w.description ?? null,
    ]
  );
}

export async function saveTestResult(
  id: number,
  result: { status: ConnectionStatus; readOnlyVerified: boolean; lastError: string | null }
): Promise<void> {
  await query(
    `UPDATE data_connections
     SET status = $2, read_only_verified = $3, last_error = $4, last_tested_at = now()
     WHERE id = $1`,
    [id, result.status, result.readOnlyVerified, result.lastError]
  );
}

/** Deletes only when no knowledge source uses the connection; returns false otherwise. */
export async function deleteUnusedConnection(id: number): Promise<boolean> {
  const { rowCount } = await query(
    `DELETE FROM data_connections dc
     WHERE dc.id = $1 AND NOT EXISTS (SELECT 1 FROM knowledge_sources WHERE connection_id = dc.id)`,
    [id]
  );
  return (rowCount ?? 0) > 0;
}

export async function updateDescription(id: number, description: string): Promise<void> {
  await query(`UPDATE data_connections SET description = $2, updated_at = now() WHERE id = $1`, [id, description]);
}

export async function updateIcon(
  id: number,
  icon: { kind: IconKind; preset: string | null; color: string | null; dataUrl: string | null | undefined }
): Promise<void> {
  // dataUrl undefined = keep the uploaded picture (e.g. switching back to it), null = remove it.
  await query(
    `UPDATE data_connections SET icon_kind = $2, icon_preset = $3, icon_color = $4,
       icon_data = CASE WHEN $5 THEN $6 ELSE icon_data END, updated_at = now()
     WHERE id = $1`,
    [id, icon.kind, icon.preset, icon.color, icon.dataUrl !== undefined, icon.dataUrl ?? null]
  );
}

export async function setEnabled(id: number, enabled: boolean): Promise<void> {
  await query(`UPDATE data_connections SET enabled = $2, updated_at = now() WHERE id = $1`, [id, enabled]);
}

export async function setPublished(id: number, published: boolean): Promise<void> {
  await query(`UPDATE data_connections SET published = $2, updated_at = now() WHERE id = $1`, [id, published]);
}

/** Uploaded picture of a connection the viewer may see (published, or owned / admin). */
export async function findIconData(viewer: AuthUser, id: number): Promise<string | null> {
  const { rows } = await query<{ icon_data: string | null }>(
    `SELECT icon_data FROM data_connections
     WHERE id = $1 AND icon_kind = 'custom' AND (published OR $2 = 'admin' OR created_by = $3)`,
    [id, viewer.role, viewer.id]
  );
  return rows[0]?.icon_data ?? null;
}

/** System lookup without an owner check — only for callers that authenticated another way (API key). */
export async function findConnectionById(id: number): Promise<StoredConnection | null> {
  const { rows } = await query<ConnectionRow>(`${SELECT_CONNECTION} WHERE dc.id = $1`, [id]);
  return rows[0] ? toStored(rows[0]) : null;
}
