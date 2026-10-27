import type { AuthUser } from '@/lib/auth';
import { logActivity } from './core-shim';
import { HttpError } from './http';
import { ICON_COLORS, ICON_PRESET_KEYS } from './icons';
import { parseIconDataUrl } from './image';
import { setEnabled, setPublished, updateIcon } from './repo';
import { requireConnection } from './service';
import type { ConnectionView, IconKind } from './types';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export async function updateConnectionIcon(
  session: AuthUser,
  id: number,
  body: Record<string, unknown>,
  request: Request
): Promise<ConnectionView> {
  const stored = await requireConnection(session, id);
  const kind = body.kind as IconKind;
  if (!['auto', 'preset', 'custom'].includes(kind)) {
    throw new HttpError(400, 'รูปแบบรูปไม่ถูกต้อง');
  }
  const color = body.color === undefined || body.color === null ? null : String(body.color);
  if (color !== null && !HEX_COLOR.test(color) && !ICON_COLORS.includes(color)) {
    throw new HttpError(400, 'สีไม่ถูกต้อง');
  }

  if (kind === 'auto') {
    await updateIcon(id, { kind, preset: null, color: null, dataUrl: undefined });
  } else if (kind === 'preset') {
    const preset = String(body.preset ?? '');
    if (!ICON_PRESET_KEYS.has(preset)) throw new HttpError(400, 'ไม่พบไอคอนที่เลือก');
    await updateIcon(id, { kind, preset, color, dataUrl: undefined });
  } else {
    // A new upload replaces the picture; without one we switch back to the one already stored.
    if (body.dataUrl === undefined && !stored.hasIconData) {
      throw new HttpError(400, 'กรุณาเลือกไฟล์รูป');
    }
    const upload = body.dataUrl === undefined ? undefined : parseIconDataUrl(body.dataUrl).dataUrl;
    await updateIcon(id, { kind, preset: null, color, dataUrl: upload });
  }

  await logActivity({
    actor: session,
    action: 'connection.update',
    targetType: 'data_connection',
    targetId: id,
    detail: { field: 'icon', kind },
    request,
  });
  return (await requireConnection(session, id)).view;
}

/** Master switch: off hides the connection from users and blocks the MCP API, without losing any settings. */
export async function enableConnection(
  session: AuthUser,
  id: number,
  body: Record<string, unknown>,
  request: Request
): Promise<ConnectionView> {
  await requireConnection(session, id);
  if (typeof body.enabled !== 'boolean') {
    throw new HttpError(400, 'ค่าเปิด/ปิดใช้งานไม่ถูกต้อง');
  }
  await setEnabled(id, body.enabled);
  await logActivity({
    actor: session,
    action: 'connection.update',
    targetType: 'data_connection',
    targetId: id,
    detail: { field: 'enabled', enabled: body.enabled },
    request,
  });
  return (await requireConnection(session, id)).view;
}

export async function publishConnection(
  session: AuthUser,
  id: number,
  body: Record<string, unknown>,
  request: Request
): Promise<ConnectionView> {
  const stored = await requireConnection(session, id);
  if (typeof body.published !== 'boolean') {
    throw new HttpError(400, 'ค่าการเผยแพร่ไม่ถูกต้อง');
  }
  if (body.published) {
    if (stored.view.status !== 'ok') {
      throw new HttpError(409, 'ต้องทดสอบการเชื่อมต่อให้ผ่านก่อนเผยแพร่');
    }
    if (stored.view.enabledTableCount === 0) {
      throw new HttpError(409, 'ต้องเปิดใช้อย่างน้อย 1 ตารางในแท็บ "ตารางและคำอธิบาย" ก่อนเผยแพร่');
    }
  }
  await setPublished(id, body.published);
  await logActivity({
    actor: session,
    action: 'connection.publish',
    targetType: 'data_connection',
    targetId: id,
    detail: { published: body.published },
    request,
  });
  return (await requireConnection(session, id)).view;
}
