/**
 * Tenant Resolver Service
 *
 * Resolves tenant from hostname using subdomain or custom domain.
 * Supports multi-tenant access patterns:
 * - Consumer: app.aivo.ai → tenant from JWT
 * - District: springfield-schools.aivo.ai → tenant from subdomain
 * - Custom Domain: learning.springfield.edu → tenant from domain mapping
 *
 * Features:
 * - Redis caching with configurable TTL
 * - Fallback to database on cache miss
 * - DNS verification for custom domains
 * - Cache invalidation on tenant/domain updates
 */

import { randomBytes } from 'node:crypto';
import { resolveTxt, resolveCname } from 'node:dns/promises';

// Types will be properly typed after prisma generate is run
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaClient = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tenant = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TenantDomainVerification = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Redis = any;

// ══════════════════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════════════════

export type TenantResolutionSource = 'subdomain' | 'custom_domain' | 'jwt' | 'default';

export interface TenantBranding {
  logoUrl?: string | undefined;
  primaryColor?: string | undefined;
}

export interface ResolvedTenant {
  id: string;
  name: string;
  type: string;
  region: string;
  branding?: TenantBranding | undefined;
}

export interface TenantResolution {
  tenantId: string;
  tenant: ResolvedTenant;
  source: TenantResolutionSource;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPrismaClient = any;

export interface TenantResolverConfig {
  redis: Redis;
  prisma: AnyPrismaClient;
  cacheTtlSeconds?: number; // Default: 300 (5 minutes)
  baseDomain: string; // e.g., "aivo.ai"
  defaultTenantId?: string | undefined; // For app.aivo.ai consumer access
}

export interface DomainVerificationInfo {
  type: 'TXT' | 'CNAME';
  host: string;
  value: string;
  expiresAt: Date;
}

export interface DomainVerificationResult {
  verified: boolean;
  error?: string | undefined;
}

// Cache key prefixes
const CACHE_PREFIX = {
  SUBDOMAIN: 'tenant:subdomain:',
  DOMAIN: 'tenant:domain:',
  ID: 'tenant:id:',
};

// ══════════════════════════════════════════════════════════════════════════════
// Service Implementation
// ══════════════════════════════════════════════════════════════════════════════

export class TenantResolverService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly redis: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly prisma: any;
  private readonly cacheTtlSeconds: number;
  private readonly baseDomain: string;
  private readonly defaultTenantId?: string | undefined;

  constructor(config: TenantResolverConfig) {
    this.redis = config.redis;
    this.prisma = config.prisma;
    this.cacheTtlSeconds = config.cacheTtlSeconds ?? 300;
    this.baseDomain = config.baseDomain.toLowerCase();
    this.defaultTenantId = config.defaultTenantId;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Public API
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Resolve tenant from hostname
   * Priority: custom domain > subdomain > default
   */
  async resolveFromHost(hostname: string): Promise<TenantResolution | null> {
    const normalizedHost = hostname.toLowerCase().trim();

    // Check if it's a custom domain (not under our base domain)
    if (!this.isBaseDomain(normalizedHost)) {
      return this.resolveFromCustomDomain(normalizedHost);
    }

    // Extract subdomain from base domain
    const subdomain = this.extractSubdomain(normalizedHost);

    // If no subdomain or it's 'app' or 'www', return default tenant
    if (!subdomain || subdomain === 'app' || subdomain === 'www') {
      return this.getDefaultTenantResolution();
    }

    return this.resolveFromSubdomain(subdomain);
  }

  /**
   * Resolve tenant from subdomain
   */
  async resolveFromSubdomain(subdomain: string): Promise<TenantResolution | null> {
    const normalizedSubdomain = subdomain.toLowerCase().trim();
    const cacheKey = `${CACHE_PREFIX.SUBDOMAIN}${normalizedSubdomain}`;

    // Try cache first
    const cached = await this.getFromCache<TenantResolution>(cacheKey);
    if (cached) {
      return cached;
    }

    // Query database
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        subdomain: normalizedSubdomain,
        isActive: true,
      },
    });

    if (!tenant) {
      return null;
    }

    const resolution = this.buildResolution(tenant, 'subdomain');

    // Cache the result
    await this.setCache(cacheKey, resolution);

    return resolution;
  }

  /**
   * Resolve tenant from custom domain
   */
  async resolveFromCustomDomain(domain: string): Promise<TenantResolution | null> {
    const normalizedDomain = domain.toLowerCase().trim();
    const cacheKey = `${CACHE_PREFIX.DOMAIN}${normalizedDomain}`;

    // Try cache first
    const cached = await this.getFromCache<TenantResolution>(cacheKey);
    if (cached) {
      return cached;
    }

    // Query database - only return if domain is verified
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        customDomain: normalizedDomain,
        domainVerified: true,
        isActive: true,
      },
    });

    if (!tenant) {
      return null;
    }

    const resolution = this.buildResolution(tenant, 'custom_domain');

    // Cache the result
    await this.setCache(cacheKey, resolution);

    return resolution;
  }

  /**
   * Get tenant by ID (with caching)
   */
  async getTenantById(tenantId: string): Promise<ResolvedTenant | null> {
    const cacheKey = `${CACHE_PREFIX.ID}${tenantId}`;

    // Try cache first
    const cached = await this.getFromCache<ResolvedTenant>(cacheKey);
    if (cached) {
      return cached;
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId, isActive: true },
    });

    if (!tenant) {
      return null;
    }

    const resolved = this.mapTenantToResolved(tenant);

    // Cache the result
    await this.setCache(cacheKey, resolved);

    return resolved;
  }

  /**
   * Invalidate cache for tenant
   */
  async invalidateCache(tenantId: string): Promise<void> {
    if (!this.redis) return;

    // Get tenant to find associated domains
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) return;

    const keysToDelete: string[] = [`${CACHE_PREFIX.ID}${tenantId}`];

    if (tenant.subdomain) {
      keysToDelete.push(`${CACHE_PREFIX.SUBDOMAIN}${tenant.subdomain}`);
    }

    if (tenant.customDomain) {
      keysToDelete.push(`${CACHE_PREFIX.DOMAIN}${tenant.customDomain}`);
    }

    if (keysToDelete.length > 0) {
      await this.redis.del(...keysToDelete);
    }
  }

  /**
   * Invalidate all cache keys for a specific domain
   */
  async invalidateDomainCache(domain: string): Promise<void> {
    if (!this.redis) return;

    const normalizedDomain = domain.toLowerCase().trim();
    await this.redis.del(`${CACHE_PREFIX.DOMAIN}${normalizedDomain}`);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Domain Verification
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Initiate custom domain verification
   * Creates a verification record with DNS instructions
   */
  async initiateDomainVerification(
    tenantId: string,
    domain: string
  ): Promise<DomainVerificationInfo> {
    const normalizedDomain = domain.toLowerCase().trim();

    // Validate domain format
    if (!this.isValidDomain(normalizedDomain)) {
      throw new Error('Invalid domain format');
    }

    // Check domain isn't already in use by another tenant
    const existingTenant = await this.prisma.tenant.findFirst({
      where: {
        customDomain: normalizedDomain,
        id: { not: tenantId },
      },
    });

    if (existingTenant) {
      throw new Error('Domain is already in use by another tenant');
    }

    // Generate verification token
    const verificationToken = this.generateVerificationToken();
    const verificationType = 'TXT';
    const verificationValue = `_aivo-verification=${verificationToken}`;

    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Upsert verification record
    await this.prisma.tenantDomainVerification.upsert({
      where: {
        tenantId_domain: {
          tenantId,
          domain: normalizedDomain,
        },
      },
      create: {
        tenantId,
        domain: normalizedDomain,
        verificationToken,
        verificationType,
        verificationValue,
        status: 'PENDING',
        expiresAt,
      },
      update: {
        verificationToken,
        verificationValue,
        status: 'PENDING',
        expiresAt,
        lastChecked: null,
        failureReason: null,
        verifiedAt: null,
      },
    });

    return {
      type: verificationType,
      host: `_aivo-verify.${normalizedDomain}`,
      value: verificationValue,
      expiresAt,
    };
  }

  /**
   * Verify custom domain ownership via DNS
   */
  async verifyCustomDomain(tenantId: string, domain: string): Promise<DomainVerificationResult> {
    const normalizedDomain = domain.toLowerCase().trim();

    // Get verification record
    const verification = await this.prisma.tenantDomainVerification.findUnique({
      where: {
        tenantId_domain: {
          tenantId,
          domain: normalizedDomain,
        },
      },
    });

    if (!verification) {
      return {
        verified: false,
        error: 'Verification not initiated. Please add the domain first.',
      };
    }

    // Check if expired
    if (verification.expiresAt < new Date()) {
      await this.prisma.tenantDomainVerification.update({
        where: { id: verification.id },
        data: {
          status: 'EXPIRED',
          lastChecked: new Date(),
          failureReason: 'Verification token expired',
        },
      });
      return {
        verified: false,
        error: 'Verification token expired. Please initiate verification again.',
      };
    }

    // Perform DNS lookup
    const dnsResult = await this.checkDnsRecord(verification);

    // Update verification status
    const now = new Date();
    if (dnsResult.verified) {
      // Update verification record
      await this.prisma.tenantDomainVerification.update({
        where: { id: verification.id },
        data: {
          status: 'VERIFIED',
          lastChecked: now,
          verifiedAt: now,
          failureReason: null,
        },
      });

      // Update tenant with verified domain
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          customDomain: normalizedDomain,
          domainVerified: true,
          domainVerifiedAt: now,
        },
      });

      // Invalidate cache
      await this.invalidateCache(tenantId);

      return { verified: true };
    } else {
      // Update verification record with failure
      await this.prisma.tenantDomainVerification.update({
        where: { id: verification.id },
        data: {
          status: 'FAILED',
          lastChecked: now,
          failureReason: dnsResult.error,
        },
      });

      return {
        verified: false,
        error: dnsResult.error,
      };
    }
  }

  /**
   * Remove custom domain from tenant
   */
  async removeCustomDomain(tenantId: string, domain: string): Promise<void> {
    const normalizedDomain = domain.toLowerCase().trim();

    // Remove verification record
    await this.prisma.tenantDomainVerification.deleteMany({
      where: {
        tenantId,
        domain: normalizedDomain,
      },
    });

    // Get current tenant to check if this is the active domain
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (tenant?.customDomain === normalizedDomain) {
      // Clear domain from tenant
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          customDomain: null,
          domainVerified: false,
          domainVerifiedAt: null,
        },
      });
    }

    // Invalidate cache
    await this.invalidateCache(tenantId);
    await this.invalidateDomainCache(normalizedDomain);
  }

  /**
   * Update tenant subdomain
   */
  async updateSubdomain(tenantId: string, subdomain: string | null): Promise<Tenant> {
    const normalizedSubdomain = subdomain?.toLowerCase().trim() ?? null;

    // Validate subdomain format if provided
    if (normalizedSubdomain && !this.isValidSubdomain(normalizedSubdomain)) {
      throw new Error(
        'Invalid subdomain format. Use lowercase letters, numbers, and hyphens only.'
      );
    }

    // Check subdomain isn't already in use
    if (normalizedSubdomain) {
      const existing = await this.prisma.tenant.findFirst({
        where: {
          subdomain: normalizedSubdomain,
          id: { not: tenantId },
        },
      });

      if (existing) {
        throw new Error('Subdomain is already in use by another tenant');
      }
    }

    // Get old subdomain for cache invalidation
    const oldTenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    // Update tenant
    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { subdomain: normalizedSubdomain },
    });

    // Invalidate caches
    await this.invalidateCache(tenantId);
    if (oldTenant?.subdomain && oldTenant.subdomain !== normalizedSubdomain) {
      if (this.redis) {
        await this.redis.del(`${CACHE_PREFIX.SUBDOMAIN}${oldTenant.subdomain}`);
      }
    }

    return updated;
  }

  /**
   * Get pending domain verifications for a tenant
   */
  async getPendingVerifications(tenantId: string): Promise<TenantDomainVerification[]> {
    return this.prisma.tenantDomainVerification.findMany({
      where: {
        tenantId,
        status: { in: ['PENDING', 'FAILED'] },
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Private Helpers
  // ════════════════════════════════════════════════════════════════════════════

  private isBaseDomain(hostname: string): boolean {
    return hostname === this.baseDomain || hostname.endsWith(`.${this.baseDomain}`);
  }

  private extractSubdomain(hostname: string): string | null {
    if (hostname === this.baseDomain) {
      return null;
    }

    const suffix = `.${this.baseDomain}`;
    if (hostname.endsWith(suffix)) {
      const subdomain = hostname.slice(0, -suffix.length);
      // Don't allow multi-level subdomains
      if (!subdomain.includes('.')) {
        return subdomain;
      }
    }

    return null;
  }

  private async getDefaultTenantResolution(): Promise<TenantResolution | null> {
    if (!this.defaultTenantId) {
      return null;
    }

    const tenant = await this.getTenantById(this.defaultTenantId);
    if (!tenant) {
      return null;
    }

    return {
      tenantId: this.defaultTenantId,
      tenant,
      source: 'default',
    };
  }

  private buildResolution(tenant: any, source: TenantResolutionSource): TenantResolution {
    return {
      tenantId: tenant.id,
      tenant: this.mapTenantToResolved(tenant),
      source,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapTenantToResolved(tenant: any): ResolvedTenant {
    const result: ResolvedTenant = {
      id: tenant.id as string,
      name: tenant.name as string,
      type: tenant.type as string,
      region: tenant.region as string,
    };

    if (tenant.logoUrl || tenant.primaryColor) {
      result.branding = {
        logoUrl: tenant.logoUrl ?? undefined,
        primaryColor: tenant.primaryColor ?? undefined,
      };
    }

    return result;
  }

  private async getFromCache<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;

    try {
      const cached = await this.redis.get(key);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    } catch {
      // Ignore cache errors
    }

    return null;
  }

  private async setCache(key: string, value: unknown): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', this.cacheTtlSeconds);
    } catch {
      // Ignore cache errors
    }
  }

  private generateVerificationToken(): string {
    return randomBytes(16).toString('hex');
  }

  private isValidDomain(domain: string): boolean {
    // Basic domain validation
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
    return domainRegex.test(domain);
  }

  private isValidSubdomain(subdomain: string): boolean {
    // Subdomain: lowercase letters, numbers, hyphens, 3-63 chars
    const subdomainRegex = /^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$/;
    return subdomainRegex.test(subdomain) && subdomain.length >= 3;
  }

  private async checkDnsRecord(
    verification: TenantDomainVerification
  ): Promise<DomainVerificationResult> {
    const recordHost = `_aivo-verify.${verification.domain}`;

    try {
      if (verification.verificationType === 'TXT') {
        const records = await resolveTxt(recordHost);
        const flatRecords = records.flat();

        const found = flatRecords.includes(verification.verificationValue);

        if (found) {
          return { verified: true };
        } else {
          return {
            verified: false,
            error: `TXT record not found. Expected "${verification.verificationValue}" at ${recordHost}`,
          };
        }
      } else if (verification.verificationType === 'CNAME') {
        const records = await resolveCname(recordHost);
        const found = records.includes(verification.verificationValue);

        if (found) {
          return { verified: true };
        } else {
          return {
            verified: false,
            error: `CNAME record not found. Expected "${verification.verificationValue}" at ${recordHost}`,
          };
        }
      }

      return { verified: false, error: 'Unknown verification type' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Handle common DNS errors
      if (errorMessage.includes('ENODATA') || errorMessage.includes('ENOTFOUND')) {
        return {
          verified: false,
          error: `DNS record not found at ${recordHost}. Please add the required ${verification.verificationType} record.`,
        };
      }

      return {
        verified: false,
        error: `DNS lookup failed: ${errorMessage}`,
      };
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Factory Function
// ══════════════════════════════════════════════════════════════════════════════

let instance: TenantResolverService | null = null;

export function createTenantResolverService(config: TenantResolverConfig): TenantResolverService {
  instance = new TenantResolverService(config);
  return instance;
}

export function getTenantResolverService(): TenantResolverService {
  if (!instance) {
    throw new Error(
      'TenantResolverService not initialized. Call createTenantResolverService first.'
    );
  }
  return instance;
}
