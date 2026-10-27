import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';
import { networkInterfaces } from 'node:os';

// SSRF guard (spec S02 §6): a creator must not be able to point a connection at
// the server itself or at cloud metadata endpoints. Hosts in
// STUDIO_DB_HOST_ALLOWLIST (comma separated host names or IPs) skip the check.

const blocked = new BlockList();
blocked.addSubnet('0.0.0.0', 8, 'ipv4');
blocked.addSubnet('127.0.0.0', 8, 'ipv4');
blocked.addSubnet('169.254.0.0', 16, 'ipv4');
blocked.addAddress('::', 'ipv6');
blocked.addAddress('::1', 'ipv6');
blocked.addSubnet('fe80::', 10, 'ipv6');
blocked.addAddress('fd00:ec2::254', 'ipv6');

export const BLOCKED_HOST_MESSAGE =
  'ไม่อนุญาตให้เชื่อมต่อ host ภายในของเซิร์ฟเวอร์ (localhost, 127.x.x.x, 169.254.x.x) หากจำเป็นให้ผู้ดูแลระบบเพิ่ม host นี้ใน allowlist';

function allowlist(): Set<string> {
  return new Set(
    (process.env.STUDIO_DB_HOST_ALLOWLIST ?? '')
      .split(',')
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean)
  );
}

function serverOwnAddresses(): Set<string> {
  const own = new Set<string>();
  for (const list of Object.values(networkInterfaces())) {
    for (const info of list ?? []) {
      own.add(info.address.toLowerCase());
    }
  }
  return own;
}

function isBlockedAddress(address: string): boolean {
  const normalized = address.toLowerCase();
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) {
    return isBlockedAddress(mapped[1]);
  }
  const family = isIP(normalized);
  if (family === 4 && blocked.check(normalized, 'ipv4')) return true;
  if (family === 6 && blocked.check(normalized, 'ipv6')) return true;
  return serverOwnAddresses().has(normalized);
}

export type HostCheck =
  | { kind: 'ok'; address: string }
  | { kind: 'blocked' }
  | { kind: 'unresolvable' };

/**
 * Resolves the host once and returns the address to connect to, so the driver
 * dials the exact IP that was checked (no DNS rebinding between check and connect).
 */
export async function checkHost(rawHost: string): Promise<HostCheck> {
  const host = rawHost.replace(/^\[|\]$/g, '').toLowerCase();
  const allowed = allowlist();

  if (!allowed.has(host) && (host === 'localhost' || host.endsWith('.localhost'))) {
    return { kind: 'blocked' };
  }

  let addresses: string[];
  if (isIP(host)) {
    addresses = [host];
  } else {
    try {
      addresses = (await lookup(host, { all: true, verbatim: true })).map((a) => a.address);
    } catch {
      return { kind: 'unresolvable' };
    }
  }
  if (addresses.length === 0) {
    return { kind: 'unresolvable' };
  }

  const bypass = allowed.has(host) || addresses.some((a) => allowed.has(a.toLowerCase()));
  if (!bypass && addresses.some(isBlockedAddress)) {
    return { kind: 'blocked' };
  }
  return { kind: 'ok', address: addresses[0] };
}
