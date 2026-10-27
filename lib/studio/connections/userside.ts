import { query } from '@/lib/db';
import type { AuthUser } from '@/lib/auth';
import type { ConnectionType } from '@/lib/studio/types';
import { logActivity } from './core-shim';
import { HttpError } from './http';
import { iconOf } from './repo';
import type { ConnectionIcon, IconKind } from './types';

// What any signed-in user sees on /connections: published connections only,
// without host, username, database name or credentials.

export interface PublishedConnection {
  id: number;
  name: string;
  type: ConnectionType;
  description: string;
  icon: ConnectionIcon;
  tableCount: number;
  tables: { name: string; description: string }[];
  selected: boolean;
  updatedAt: string;
}

interface Row {
  id: number;
  name: string;
  type: ConnectionType;
  description: string;
  database_name: string;
  icon_kind: IconKind;
  icon_preset: string | null;
  icon_color: string | null;
  has_icon_data: boolean;
  updated_at: Date;
  tables: { name: string; description: string }[];
  selected: boolean;
}

const PUBLISHED_SQL = `
  SELECT dc.id, dc.name, dc.type, dc.description, dc.database_name, dc.icon_kind, dc.icon_preset, dc.icon_color,
         dc.icon_data IS NOT NULL AS has_icon_data, dc.updated_at,
         COALESCE(t.list, '[]'::json) AS tables,
         EXISTS (SELECT 1 FROM user_connection_selections s WHERE s.connection_id = dc.id AND s.user_id = $1) AS selected
  FROM data_connections dc
  LEFT JOIN LATERAL (
    SELECT json_agg(json_build_object('name', ct.table_name, 'description', ct.description) ORDER BY ct.table_name) AS list
    FROM connection_tables ct WHERE ct.connection_id = dc.id AND ct.enabled AND NOT ct.missing
  ) t ON true
  WHERE dc.published AND dc.enabled AND dc.status = 'ok'`;

const toView = (r: Row): PublishedConnection => ({
  id: r.id,
  name: r.name,
  type: r.type,
  description: r.description,
  icon: iconOf(r),
  tableCount: r.tables.length,
  tables: r.tables.map((t) => ({ name: t.name, description: t.description.slice(0, 300) })),
  selected: r.selected,
  updatedAt: r.updated_at.toISOString(),
});

export async function listPublished(session: AuthUser): Promise<PublishedConnection[]> {
  const { rows } = await query<Row>(`${PUBLISHED_SQL} ORDER BY dc.name`, [session.id]);
  return rows.map(toView);
}

export async function listSelected(session: AuthUser): Promise<PublishedConnection[]> {
  const { rows } = await query<Row>(
    `${PUBLISHED_SQL} AND EXISTS (SELECT 1 FROM user_connection_selections s WHERE s.connection_id = dc.id AND s.user_id = $1)
     ORDER BY dc.name`,
    [session.id]
  );
  return rows.map(toView);
}

export async function setSelection(
  session: AuthUser,
  id: number,
  body: Record<string, unknown>,
  request: Request
): Promise<PublishedConnection> {
  if (typeof body.selected !== 'boolean') throw new HttpError(400, 'ค่าการเลือกไม่ถูกต้อง');
  const { rows } = await query<Row>(`${PUBLISHED_SQL} AND dc.id = $2`, [session.id, id]);
  if (!rows[0]) throw new HttpError(404, 'ไม่พบฐานข้อมูลนี้ หรือยังไม่ได้เผยแพร่');

  if (body.selected) {
    await query(
      `INSERT INTO user_connection_selections (user_id, connection_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [session.id, id]
    );
  } else {
    await query(`DELETE FROM user_connection_selections WHERE user_id = $1 AND connection_id = $2`, [session.id, id]);
  }
  await logActivity({
    actor: session,
    action: 'connection.select',
    targetType: 'data_connection',
    targetId: id,
    detail: { selected: body.selected },
    request,
  });
  return { ...toView(rows[0]), selected: body.selected };
}
