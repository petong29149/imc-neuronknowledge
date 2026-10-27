import { HttpError } from './http';

// Uploaded connection pictures arrive as data URLs and are stored as-is after checks.
// They are only ever served from /api/connections/[id]/icon with a locked-down CSP and
// rendered through <img>, so even a missed SVG trick cannot run script in the app.

export const MAX_ICON_BYTES = 256 * 1024;

const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'] as const;
type AllowedMime = (typeof ALLOWED)[number];

function sniff(bytes: Buffer): AllowedMime | null {
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'image/webp';
  }
  const head = bytes.subarray(0, 1024).toString('utf8').replace(/^﻿/, '').trimStart();
  if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]/i.test(head)) return 'image/svg+xml';
  return null;
}

/** Removes active content from an SVG: scripts, foreign HTML, event handlers and external references. */
export function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<script[^>]*\/>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject\s*>/gi, '')
    .replace(/<(iframe|embed|object|audio|video)[\s\S]*?(<\/\1\s*>|\/>)/gi, '')
    .replace(/\s(on[a-z]+)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s((?:xlink:)?href)\s*=\s*("(?!#)[^"]*"|'(?!#)[^']*')/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/@import[^;]+;?/gi, '');
}

export function parseIconDataUrl(dataUrl: unknown): { mime: AllowedMime; dataUrl: string } {
  if (typeof dataUrl !== 'string') {
    throw new HttpError(400, 'กรุณาเลือกไฟล์รูป');
  }
  const match = dataUrl.match(/^data:([a-z+/.-]+);base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) {
    throw new HttpError(400, 'รูปแบบไฟล์รูปไม่ถูกต้อง');
  }
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length === 0) {
    throw new HttpError(400, 'ไฟล์รูปว่างเปล่า');
  }
  if (bytes.length > MAX_ICON_BYTES) {
    throw new HttpError(400, 'ไฟล์รูปใหญ่เกิน 256 KB');
  }
  const mime = sniff(bytes);
  if (!mime) {
    throw new HttpError(400, 'รองรับเฉพาะรูป PNG, JPG, WebP หรือ SVG');
  }
  if (mime === 'image/svg+xml') {
    const clean = sanitizeSvg(bytes.toString('utf8'));
    return { mime, dataUrl: `data:${mime};base64,${Buffer.from(clean, 'utf8').toString('base64')}` };
  }
  return { mime, dataUrl: `data:${mime};base64,${bytes.toString('base64')}` };
}

export function decodeIconDataUrl(dataUrl: string): { mime: string; bytes: Buffer } | null {
  const match = dataUrl.match(/^data:([a-z+/.-]+);base64,(.+)$/i);
  if (!match || !(ALLOWED as readonly string[]).includes(match[1])) return null;
  return { mime: match[1], bytes: Buffer.from(match[2], 'base64') };
}
