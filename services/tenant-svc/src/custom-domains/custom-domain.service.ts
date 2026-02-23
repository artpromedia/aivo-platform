/**
 * Custom Domain Service
 *
 * Manages per-tenant custom domains with DNS TXT-record verification.
 * Stores verification tokens and lookup results in Postgres with
 * an optional Redis cache.
 *
 * @module custom-domains/custom-domain.service
 */

import { randomBytes } from 'node:crypto';
import { promises as dns } from 'node:dns';
import type { Redis as RedisType } from 'ioredis';

import { prisma } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════════════════

export interface CustomDomainEntry {
  id: string;
  tenantId: string;
  domain: string;
  status: 'PENDING_VERIFICATION' | 'VERIFIED' | 'FAILED';
  verificationToken: string;
  verifiedAt: Date | null;
  createdAt: Date;
}

export interface AddDomainInput {
  tenantId: string;
  domain: string;
}

export interface VerifyResult {
  verified: boolean;
  message: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// Service
// ══════════════════════════════════════════════════════════════════════════════

const DOMAIN_CACHE_PREFIX = 'tenant:domain-lookup:';
const DOMAIN_CACHE_TTL = 300; // 5 min

export class CustomDomainService {
  constructor(private readonly redis?: RedisType | null) {}

  // ──────────────────────── CRUD ────────────────────────

  /**
   * Register a new custom domain for a tenant.
   * Generates a verification token that must be placed in a DNS TXT record.
   */
  async addDomain(input: AddDomainInput): Promise<CustomDomainEntry> {
    const token = randomBytes(32).toString('hex');
    const entry = await prisma.tenantCustomDomain.create({
      data: {
        tenantId: input.tenantId,
        domain: input.domain.toLowerCase(),
        verificationToken: token,
      },
    });
    return entry as unknown as CustomDomainEntry;
  }

  /** List all custom domains for a tenant. */
  async listDomains(tenantId: string): Promise<CustomDomainEntry[]> {
    return prisma.tenantCustomDomain.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    }) as unknown as Promise<CustomDomainEntry[]>;
  }

  /** Remove a custom domain (scoped to tenant). */
  async removeDomain(tenantId: string, domainId: string): Promise<boolean> {
    const deleted = await prisma.tenantCustomDomain.deleteMany({
      where: { id: domainId, tenantId },
    });
    if (deleted.count > 0) {
      await this.invalidateDomainCache(tenantId);
    }
    return deleted.count > 0;
  }

  // ──────────────────────── Verification ────────────────────────

  /**
   * Verify a domain by performing a DNS TXT lookup for
   * `_aivo-verification.<domain>` and checking for the stored token.
   */
  async verifyDomain(tenantId: string, domainId: string): Promise<VerifyResult> {
    const entry = await prisma.tenantCustomDomain.findFirst({
      where: { id: domainId, tenantId },
    });

    if (!entry) {
      return { verified: false, message: 'Domain entry not found.' };
    }

    const lookupHost = `_aivo-verification.${entry.domain}`;
    let txtRecords: string[][];

    try {
      txtRecords = await dns.resolveTxt(lookupHost);
    } catch {
      await this.markStatus(entry.id, 'FAILED');
      return {
        verified: false,
        message: `DNS TXT lookup failed for ${lookupHost}. Ensure the record exists.`,
      };
    }

    const flat = txtRecords.flat();
    const found = flat.some((txt) => txt === entry.verificationToken);

    if (found) {
      await this.markStatus(entry.id, 'VERIFIED');
      await this.invalidateDomainCache(tenantId);
      return { verified: true, message: 'Domain verified successfully.' };
    }

    await this.markStatus(entry.id, 'FAILED');
    return {
      verified: false,
      message: `Token not found in TXT records for ${lookupHost}.`,
    };
  }

  // ──────────────────────── Domain → Tenant resolution ────────────────────

  /**
   * Given a custom domain, find the tenant it belongs to.
   * Uses Redis cache to speed up resolution on the hot path.
   */
  async resolveDomainToTenant(domain: string): Promise<string | null> {
    const normalized = domain.toLowerCase();
    const cacheKey = `${DOMAIN_CACHE_PREFIX}${normalized}`;

    // Try cache
    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached !== null) return cached || null;
      } catch {
        // fall through
      }
    }

    const entry = await prisma.tenantCustomDomain.findFirst({
      where: { domain: normalized, status: 'VERIFIED' },
      select: { tenantId: true },
    });

    const tenantId = entry?.tenantId ?? null;

    if (this.redis) {
      try {
        await this.redis.set(
          cacheKey,
          tenantId ?? '',
          'EX',
          DOMAIN_CACHE_TTL,
        );
      } catch {
        // ignore
      }
    }

    return tenantId;
  }

  // ──────────────────────── Helpers ────────────────────────

  private async markStatus(
    id: string,
    status: 'VERIFIED' | 'FAILED',
  ): Promise<void> {
    await prisma.tenantCustomDomain.update({
      where: { id },
      data: {
        status,
        ...(status === 'VERIFIED' ? { verifiedAt: new Date() } : {}),
      },
    });
  }

  private async invalidateDomainCache(tenantId: string): Promise<void> {
    if (!this.redis) return;
    try {
      // Invalidate by scanning — limited scope, acceptable for admin ops
      const domains = await prisma.tenantCustomDomain.findMany({
        where: { tenantId },
        select: { domain: true },
      });
      const pipeline = this.redis.pipeline();
      for (const d of domains) {
        pipeline.del(`${DOMAIN_CACHE_PREFIX}${d.domain}`);
      }
      await pipeline.exec();
    } catch {
      // ignore
    }
  }
}
