import type { ConnectionType } from '@/lib/studio/types';
import { HttpError } from './http';
import {
  CONNECTION_TYPES,
  DEFAULT_PORTS,
  SSL_MODES,
  SUPPORTED_TYPES,
  TYPE_LABELS,
  type ConnectionInput,
  type SslMode,
} from './types';

const HOST_PATTERN = /^[A-Za-z0-9._\-:[\]]+$/;

function text(body: Record<string, unknown>, key: string, label: string, max: number): string {
  const value = body[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, `กรุณากรอก${label}`);
  }
  if (value.trim().length > max) {
    throw new HttpError(400, `${label}ยาวเกิน ${max} ตัวอักษร`);
  }
  return value.trim();
}

export function parseConnectionInput(body: Record<string, unknown>): ConnectionInput {
  const name = text(body, 'name', 'ชื่อการเชื่อมต่อ', 120);

  const type = body.type as ConnectionType;
  if (!CONNECTION_TYPES.includes(type)) {
    throw new HttpError(400, 'ประเภทฐานข้อมูลไม่ถูกต้อง');
  }
  if (!SUPPORTED_TYPES.includes(type)) {
    throw new HttpError(400, `ยังไม่รองรับ ${TYPE_LABELS[type]} ในตอนนี้ (รอติดตั้งไลบรารีเชื่อมต่อ)`);
  }

  const host = text(body, 'host', 'host', 255);
  if (!HOST_PATTERN.test(host)) {
    throw new HttpError(400, 'host ต้องเป็นชื่อโดเมนหรือ IP เท่านั้น (ไม่ต้องใส่ http:// หรือ /)');
  }

  const port = body.port === undefined || body.port === '' ? DEFAULT_PORTS[type] : Number(body.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new HttpError(400, 'port ต้องเป็นตัวเลข 1–65535');
  }

  const database = text(body, 'database', 'ชื่อ database', 255);
  const username = text(body, 'username', 'ชื่อผู้ใช้', 255);

  const password = typeof body.password === 'string' ? body.password : '';
  if (password.length > 1024) {
    throw new HttpError(400, 'รหัสผ่านยาวเกินไป');
  }

  const sslMode = (body.sslMode ?? 'prefer') as SslMode;
  if (!SSL_MODES.includes(sslMode)) {
    throw new HttpError(400, 'โหมด SSL ไม่ถูกต้อง');
  }

  let description: string | undefined;
  if (body.description !== undefined) {
    if (typeof body.description !== 'string') throw new HttpError(400, 'คำอธิบายไม่ถูกต้อง');
    if (body.description.length > 1000) throw new HttpError(400, 'คำอธิบายยาวเกิน 1,000 ตัวอักษร');
    description = body.description.trim();
  }

  return { name, type, host, port, database, username, password, sslMode, description };
}
