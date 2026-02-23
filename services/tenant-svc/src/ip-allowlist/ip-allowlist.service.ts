/**
 * IP Allowlist Service
 *
 * Manages per-tenant IP allowlists stored in Postgres with a Redis cache layer.
 * Supports CIDR notation for both IPv4 and IPv6.
 *
 * @module ip-allowlist/ip-allowlist.service
 */

import type { Redis as RedisType } from 'ioredis';

import { prisma } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════════════════

export interface IpAllowlistEntry {
  id: string;
  tenantId: string;
  cidr: string;
  label: string | null;
  createdBy: string | null;
  createdAt: Date;
}

export interface AddRangeInput {
  tenantId: string;
  cidr: string;
  label?: string;
  createdBy?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// CIDR Helpers (pure bit-math, no external deps)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Parse an IPv4 address string into a 32-bit number.
 */
function ipv4ToNumber(ip: string): number {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    throw new Error(`Invalid IPv4 address: ${ip}`);
  }
  // Use unsigned right shift to ensure unsigned 32-bit result
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

/**
 * Check whether an IPv4 address falls within a CIDR range.
 */
function ipv4InCidr(ip: string, cidr: string): boolean {
  const [network, prefixStr] = cidr.split('/');
  if (!network) return false;
  const prefix = prefixStr ? parseInt(prefixStr, 10) : 32;
  if (prefix < 0 || prefix > 32) return false;

  const ipNum = ipv4ToNumber(ip);
  const netNum = ipv4ToNumber(network);

  if (prefix === 0) return true; // /0 matches everything
  const mask = (~0 << (32 - prefix)) >>> 0;
  return (ipNum & mask) === (netNum & mask);
}

/**
 * Expand an IPv6 address to its full 8-group form (e.g. :: → 0:0:0:0:0:0:0:0).
 */
function expandIPv6(ip: string): string {
  // Handle IPv4-mapped IPv6
  if (ip.includes('.')) {
    const lastColon = ip.lastIndexOf(':');
    const ipv4Part = ip.slice(lastColon + 1);
    const ipv6Prefix = ip.slice(0, lastColon);
    const parts = ipv4Part.split('.').map(Number);
    const hex1 = ((parts[0] << 8) | parts[1]).toString(16);
    const hex2 = ((parts[2] << 8) | parts[3]).toString(16);
    ip = `${ipv6Prefix}:${hex1}:${hex2}`;
  }

  let groups: string[];
  if (ip.includes('::')) {
    const [left, right] = ip.split('::');
    const leftGroups = left ? left.split(':') : [];
    const rightGroups = right ? right.split(':') : [];
    const missing = 8 - leftGroups.length - rightGroups.length;
    groups = [...leftGroups, ...Array<string>(missing).fill('0'), ...rightGroups];
  } else {
    groups = ip.split(':');
  }
  return groups.map((g) => g.padStart(4, '0')).join(':');
}

/**
 * Parse a full IPv6 address into an array of 8 x 16-bit integers.
 */
function ipv6ToGroups(ip: string): number[] {
  const expanded = expandIPv6(ip);
  return expanded.split(':').map((g) => parseInt(g, 16));
}

/**
 * Check whether an IPv6 address falls within a CIDR range.
 */
function ipv6InCidr(ip: string, cidr: string): boolean {
  const [network, prefixStr] = cidr.split('/');
  if (!network) return false;
  const prefix = prefixStr ? parseInt(prefixStr, 10) : 128;
  if (prefix < 0 || prefix > 128) return false;
  if (prefix === 0) return true;

  const ipGroups = ipv6ToGroups(ip);
  const netGroups = ipv6ToGroups(network);

  let remaining = prefix;
  for (let i = 0; i < 8; i++) {
    if (remaining <= 0) break;
    const bits = Math.min(remaining, 16);
    const mask = bits === 16 ? 0xffff : (~0 << (16 - bits)) & 0xffff;
    if ((ipGroups[i] & mask) !== (netGroups[i] & mask)) return false;
    remaining -= 16;
  }
  return true;
}

/**
 * Determine whether `ip` is an IPv6 address.
 */
function isIPv6(ip: string): boolean {
  return ip.includes(':');
}

/**
 * Check whether an IP address matches a CIDR range (IPv4 or IPv6).
 */
export function ipMatchesCidr(ip: string, cidr: string): boolean {
  const cidrIsV6 = isIPv6(cidr.split('/')[0]);
  const ipIsV6 = isIPv6(ip);

  if (cidrIsV6 !== ipIsV6) return false;
  return cidrIsV6 ? ipv6InCidr(ip, cidr) : ipv4InCidr(ip, cidr);
}

// ══════════════════════════════════════════════════════════════════════════════
// Service
// ══════════════════════════════════════════════════════════════════════════════

const CACHE_KEY_PREFIX = 'tenant:ip-allowlist:';
const CACHE_TTL_SECONDS = 120;

/* eslint-disable @typescript-eslint/no-unnecessary-condition */
export class IpAllowlistService {
  constructor(private readonly redis?: RedisType | null) {}

  // ──────────────────────── CRUD ────────────────────────

  /** Add a CIDR range to a tenant's allow-list. */
  async addRange(input: AddRangeInput): Promise<IpAllowlistEntry> {
    const entry = await prisma.tenantIpAllowlist.create({
      data: {
        tenantId: input.tenantId,
        cidr: input.cidr,
        label: input.label ?? null,
        createdBy: input.createdBy ?? null,
      },
    });
    await this.invalidateCache(input.tenantId);
    return entry as IpAllowlistEntry;
  }

  /** Remove a range by its ID (scoped to tenant). */
  async removeRange(tenantId: string, rangeId: string): Promise<boolean> {
    const deleted = await prisma.tenantIpAllowlist.deleteMany({
      where: { id: rangeId, tenantId },
    });
    if (deleted.count > 0) {
      await this.invalidateCache(tenantId);
    }
    return deleted.count > 0;
  }

  /** List all allow-list entries for a tenant. */
  async listRanges(tenantId: string): Promise<IpAllowlistEntry[]> {
    return prisma.tenantIpAllowlist.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    }) as Promise<IpAllowlistEntry[]>;
  }

  // ──────────────────────── IP Check ────────────────────────

  /**
   * Check if a given IP is allowed for the specified tenant.
   *
   * Rules:
   *  • If the tenant has NO allow-list entries → allow all (open).
   *  • If entries exist the IP must match at least one CIDR → allowed.
   *  • Otherwise → blocked.
   */
  async isAllowed(tenantId: string, ip: string): Promise<boolean> {
    const cidrs = await this.getCidrs(tenantId);

    // No entries = open access (allow-list not configured)
    if (cidrs.length === 0) return true;

    return cidrs.some((cidr) => {
      try {
        return ipMatchesCidr(ip, cidr);
      } catch {
        return false;
      }
    });
  }

  // ──────────────────────── Cache helpers ────────────────────────

  private async getCidrs(tenantId: string): Promise<string[]> {
    const cacheKey = `${CACHE_KEY_PREFIX}${tenantId}`;

    // Try Redis first
    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached !== null) return JSON.parse(cached) as string[];
      } catch {
        // fall through to DB
      }
    }

    const entries = await prisma.tenantIpAllowlist.findMany({
      where: { tenantId },
      select: { cidr: true },
    });
    const cidrs = entries.map((e) => e.cidr);

    // Populate cache
    if (this.redis) {
      try {
        await this.redis.set(cacheKey, JSON.stringify(cidrs), 'EX', CACHE_TTL_SECONDS);
      } catch {
        // ignore cache write failures
      }
    }

    return cidrs;
  }

  private async invalidateCache(tenantId: string): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.del(`${CACHE_KEY_PREFIX}${tenantId}`);
    } catch {
      // ignore
    }
  }
}
/* eslint-enable @typescript-eslint/no-unnecessary-condition */
