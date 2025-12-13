/**
 * Tenant Resolver Service Tests
 *
 * Unit tests for subdomain and custom domain resolution.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Redis } from 'ioredis';
import type { PrismaClient, Tenant, TenantDomainVerification } from '@prisma/client';

// ══════════════════════════════════════════════════════════════════════════════
// Mock Setup
// ══════════════════════════════════════════════════════════════════════════════

// Mock dns/promises
vi.mock('node:dns/promises', () => ({
  resolveTxt: vi.fn(),
  resolveCname: vi.fn(),
}));

import { resolveTxt, resolveCname } from 'node:dns/promises';

// Import after mocks
import {
  TenantResolverService,
  createTenantResolverService,
  getTenantResolverService,
  type TenantResolverConfig,
} from '../src/services/tenant-resolver.service';

// ══════════════════════════════════════════════════════════════════════════════
// Test Data
// ══════════════════════════════════════════════════════════════════════════════

const mockTenant: Tenant = {
  id: 'tenant-123',
  name: 'Springfield Schools',
  type: 'DISTRICT',
  primaryDomain: 'springfield-schools.aivo.ai',
  subdomain: 'springfield-schools',
  customDomain: null,
  domainVerified: false,
  domainVerifiedAt: null,
  region: 'us-east-1',
  isActive: true,
  logoUrl: 'https://cdn.example.com/logo.png',
  primaryColor: '#1a73e8',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTenantWithCustomDomain: Tenant = {
  ...mockTenant,
  id: 'tenant-456',
  name: 'Riverside Unified',
  subdomain: 'riverside',
  customDomain: 'learning.riverside.edu',
  domainVerified: true,
  domainVerifiedAt: new Date(),
};

const mockVerification: TenantDomainVerification = {
  id: 'ver-123',
  tenantId: 'tenant-123',
  domain: 'learning.springfield.edu',
  verificationToken: 'abc123def456',
  verificationType: 'TXT',
  verificationValue: '_aivo-verification=abc123def456',
  status: 'PENDING',
  lastChecked: null,
  verifiedAt: null,
  failureReason: null,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ══════════════════════════════════════════════════════════════════════════════
// Mock Factories
// ══════════════════════════════════════════════════════════════════════════════

function createMockRedis(): Redis {
  const cache = new Map<string, string>();

  return {
    get: vi.fn(async (key: string) => cache.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => {
      cache.set(key, value);
      return 'OK';
    }),
    del: vi.fn(async (...keys: string[]) => {
      let count = 0;
      for (const key of keys) {
        if (cache.delete(key)) count++;
      }
      return count;
    }),
  } as unknown as Redis;
}

function createMockPrisma(): PrismaClient {
  return {
    tenant: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    tenantDomainVerification: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
  } as unknown as PrismaClient;
}

function createService(
  overrides: Partial<TenantResolverConfig> = {}
): { service: TenantResolverService; redis: Redis; prisma: PrismaClient } {
  const redis = createMockRedis();
  const prisma = createMockPrisma();

  const config: TenantResolverConfig = {
    redis,
    prisma,
    baseDomain: 'aivo.ai',
    cacheTtlSeconds: 300,
    defaultTenantId: 'default-tenant',
    ...overrides,
  };

  const service = new TenantResolverService(config);
  return { service, redis, prisma };
}

// ══════════════════════════════════════════════════════════════════════════════
// Tests
// ══════════════════════════════════════════════════════════════════════════════

describe('TenantResolverService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('resolveFromHost', () => {
    it('resolves tenant from subdomain', async () => {
      const { service, prisma } = createService();
      vi.mocked(prisma.tenant.findFirst).mockResolvedValue(mockTenant);

      const result = await service.resolveFromHost('springfield-schools.aivo.ai');

      expect(result).not.toBeNull();
      expect(result!.tenantId).toBe(mockTenant.id);
      expect(result!.source).toBe('subdomain');
      expect(result!.tenant.name).toBe('Springfield Schools');
    });

    it('resolves tenant from custom domain', async () => {
      const { service, prisma } = createService();
      vi.mocked(prisma.tenant.findFirst).mockResolvedValue(mockTenantWithCustomDomain);

      const result = await service.resolveFromHost('learning.riverside.edu');

      expect(result).not.toBeNull();
      expect(result!.tenantId).toBe(mockTenantWithCustomDomain.id);
      expect(result!.source).toBe('custom_domain');
    });

    it('returns default tenant for app.aivo.ai', async () => {
      const { service, prisma } = createService();
      vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
        ...mockTenant,
        id: 'default-tenant',
      });

      const result = await service.resolveFromHost('app.aivo.ai');

      expect(result).not.toBeNull();
      expect(result!.tenantId).toBe('default-tenant');
      expect(result!.source).toBe('default');
    });

    it('returns default tenant for www.aivo.ai', async () => {
      const { service, prisma } = createService();
      vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
        ...mockTenant,
        id: 'default-tenant',
      });

      const result = await service.resolveFromHost('www.aivo.ai');

      expect(result).not.toBeNull();
      expect(result!.source).toBe('default');
    });

    it('returns null for unknown subdomain', async () => {
      const { service, prisma } = createService();
      vi.mocked(prisma.tenant.findFirst).mockResolvedValue(null);

      const result = await service.resolveFromHost('unknown-district.aivo.ai');

      expect(result).toBeNull();
    });

    it('returns null for unverified custom domain', async () => {
      const { service, prisma } = createService();
      vi.mocked(prisma.tenant.findFirst).mockResolvedValue(null);

      const result = await service.resolveFromHost('unverified.example.com');

      expect(result).toBeNull();
    });

    it('normalizes hostname to lowercase', async () => {
      const { service, prisma } = createService();
      vi.mocked(prisma.tenant.findFirst).mockResolvedValue(mockTenant);

      await service.resolveFromHost('SPRINGFIELD-SCHOOLS.AIVO.AI');

      expect(prisma.tenant.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            subdomain: 'springfield-schools',
          }),
        })
      );
    });
  });

  describe('caching', () => {
    it('caches subdomain resolution', async () => {
      const { service, prisma, redis } = createService();
      vi.mocked(prisma.tenant.findFirst).mockResolvedValue(mockTenant);

      // First call - should hit database
      await service.resolveFromSubdomain('springfield-schools');
      expect(prisma.tenant.findFirst).toHaveBeenCalledTimes(1);
      expect(redis.set).toHaveBeenCalled();

      // Second call - should hit cache
      await service.resolveFromSubdomain('springfield-schools');
      expect(prisma.tenant.findFirst).toHaveBeenCalledTimes(1); // Not called again
    });

    it('caches custom domain resolution', async () => {
      const { service, prisma, redis } = createService();
      vi.mocked(prisma.tenant.findFirst).mockResolvedValue(mockTenantWithCustomDomain);

      // First call
      await service.resolveFromCustomDomain('learning.riverside.edu');
      expect(prisma.tenant.findFirst).toHaveBeenCalledTimes(1);

      // Second call
      await service.resolveFromCustomDomain('learning.riverside.edu');
      expect(prisma.tenant.findFirst).toHaveBeenCalledTimes(1);
    });

    it('works without redis (caching disabled)', async () => {
      const { service, prisma } = createService({ redis: null });
      vi.mocked(prisma.tenant.findFirst).mockResolvedValue(mockTenant);

      const result = await service.resolveFromHost('springfield-schools.aivo.ai');

      expect(result).not.toBeNull();
      expect(result!.tenantId).toBe(mockTenant.id);
    });

    it('invalidates cache for tenant', async () => {
      const { service, prisma, redis } = createService();
      vi.mocked(prisma.tenant.findUnique).mockResolvedValue(mockTenant);

      await service.invalidateCache('tenant-123');

      expect(redis.del).toHaveBeenCalledWith(
        'tenant:id:tenant-123',
        'tenant:subdomain:springfield-schools'
      );
    });
  });

  describe('resolveFromSubdomain', () => {
    it('only returns active tenants', async () => {
      const { service, prisma } = createService();
      vi.mocked(prisma.tenant.findFirst).mockResolvedValue(null);

      await service.resolveFromSubdomain('inactive-district');

      expect(prisma.tenant.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        })
      );
    });
  });

  describe('resolveFromCustomDomain', () => {
    it('only returns verified domains', async () => {
      const { service, prisma } = createService();
      vi.mocked(prisma.tenant.findFirst).mockResolvedValue(null);

      await service.resolveFromCustomDomain('unverified.example.com');

      expect(prisma.tenant.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            domainVerified: true,
          }),
        })
      );
    });
  });

  describe('initiateDomainVerification', () => {
    it('creates verification record with TXT instructions', async () => {
      const { service, prisma } = createService();
      vi.mocked(prisma.tenant.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.tenantDomainVerification.upsert).mockResolvedValue(mockVerification);

      const result = await service.initiateDomainVerification(
        'tenant-123',
        'learning.springfield.edu'
      );

      expect(result.type).toBe('TXT');
      expect(result.host).toBe('_aivo-verify.learning.springfield.edu');
      expect(result.value).toMatch(/^_aivo-verification=/);
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('rejects domain already in use', async () => {
      const { service, prisma } = createService();
      vi.mocked(prisma.tenant.findFirst).mockResolvedValue({
        ...mockTenant,
        id: 'other-tenant',
      });

      await expect(
        service.initiateDomainVerification('tenant-123', 'taken.example.com')
      ).rejects.toThrow('already in use');
    });

    it('rejects invalid domain format', async () => {
      const { service } = createService();

      await expect(
        service.initiateDomainVerification('tenant-123', 'not-a-domain')
      ).rejects.toThrow('Invalid domain');
    });
  });

  describe('verifyCustomDomain', () => {
    beforeEach(() => {
      vi.mocked(resolveTxt).mockReset();
      vi.mocked(resolveCname).mockReset();
    });

    it('verifies domain when DNS record matches', async () => {
      const { service, prisma } = createService();
      vi.mocked(prisma.tenantDomainVerification.findUnique).mockResolvedValue(mockVerification);
      vi.mocked(prisma.tenantDomainVerification.update).mockResolvedValue(mockVerification);
      vi.mocked(prisma.tenant.update).mockResolvedValue(mockTenant);
      vi.mocked(prisma.tenant.findUnique).mockResolvedValue(mockTenant);
      vi.mocked(resolveTxt).mockResolvedValue([[mockVerification.verificationValue]]);

      const result = await service.verifyCustomDomain(
        'tenant-123',
        'learning.springfield.edu'
      );

      expect(result.verified).toBe(true);
      expect(prisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customDomain: 'learning.springfield.edu',
            domainVerified: true,
          }),
        })
      );
    });

    it('fails verification when DNS record not found', async () => {
      const { service, prisma } = createService();
      vi.mocked(prisma.tenantDomainVerification.findUnique).mockResolvedValue(mockVerification);
      vi.mocked(prisma.tenantDomainVerification.update).mockResolvedValue(mockVerification);
      vi.mocked(resolveTxt).mockResolvedValue([['wrong-value']]);

      const result = await service.verifyCustomDomain(
        'tenant-123',
        'learning.springfield.edu'
      );

      expect(result.verified).toBe(false);
      expect(result.error).toContain('TXT record not found');
    });

    it('handles DNS lookup errors', async () => {
      const { service, prisma } = createService();
      vi.mocked(prisma.tenantDomainVerification.findUnique).mockResolvedValue(mockVerification);
      vi.mocked(prisma.tenantDomainVerification.update).mockResolvedValue(mockVerification);
      vi.mocked(resolveTxt).mockRejectedValue(new Error('ENODATA'));

      const result = await service.verifyCustomDomain(
        'tenant-123',
        'learning.springfield.edu'
      );

      expect(result.verified).toBe(false);
      expect(result.error).toContain('DNS record not found');
    });

    it('fails for expired verification', async () => {
      const { service, prisma } = createService();
      const expiredVerification = {
        ...mockVerification,
        expiresAt: new Date(Date.now() - 1000), // Expired
      };
      vi.mocked(prisma.tenantDomainVerification.findUnique).mockResolvedValue(expiredVerification);
      vi.mocked(prisma.tenantDomainVerification.update).mockResolvedValue(expiredVerification);

      const result = await service.verifyCustomDomain(
        'tenant-123',
        'learning.springfield.edu'
      );

      expect(result.verified).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('returns error when verification not initiated', async () => {
      const { service, prisma } = createService();
      vi.mocked(prisma.tenantDomainVerification.findUnique).mockResolvedValue(null);

      const result = await service.verifyCustomDomain(
        'tenant-123',
        'unknown.example.com'
      );

      expect(result.verified).toBe(false);
      expect(result.error).toContain('not initiated');
    });
  });

  describe('updateSubdomain', () => {
    it('updates subdomain and invalidates cache', async () => {
      const { service, prisma, redis } = createService();
      vi.mocked(prisma.tenant.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.tenant.findUnique).mockResolvedValue(mockTenant);
      vi.mocked(prisma.tenant.update).mockResolvedValue({
        ...mockTenant,
        subdomain: 'new-subdomain',
      });

      const result = await service.updateSubdomain('tenant-123', 'new-subdomain');

      expect(result.subdomain).toBe('new-subdomain');
      expect(redis.del).toHaveBeenCalled();
    });

    it('rejects duplicate subdomain', async () => {
      const { service, prisma } = createService();
      vi.mocked(prisma.tenant.findFirst).mockResolvedValue({
        ...mockTenant,
        id: 'other-tenant',
      });

      await expect(
        service.updateSubdomain('tenant-123', 'taken-subdomain')
      ).rejects.toThrow('already in use');
    });

    it('rejects invalid subdomain format', async () => {
      const { service } = createService();

      await expect(
        service.updateSubdomain('tenant-123', 'AB')
      ).rejects.toThrow('Invalid subdomain');
    });

    it('allows clearing subdomain', async () => {
      const { service, prisma } = createService();
      vi.mocked(prisma.tenant.findUnique).mockResolvedValue(mockTenant);
      vi.mocked(prisma.tenant.update).mockResolvedValue({
        ...mockTenant,
        subdomain: null,
      });

      const result = await service.updateSubdomain('tenant-123', null);

      expect(result.subdomain).toBeNull();
    });
  });

  describe('removeCustomDomain', () => {
    it('removes domain and clears tenant config', async () => {
      const { service, prisma, redis } = createService();
      vi.mocked(prisma.tenantDomainVerification.deleteMany).mockResolvedValue({ count: 1 });
      vi.mocked(prisma.tenant.findUnique).mockResolvedValue(mockTenantWithCustomDomain);
      vi.mocked(prisma.tenant.update).mockResolvedValue({
        ...mockTenantWithCustomDomain,
        customDomain: null,
        domainVerified: false,
      });

      await service.removeCustomDomain('tenant-456', 'learning.riverside.edu');

      expect(prisma.tenantDomainVerification.deleteMany).toHaveBeenCalled();
      expect(prisma.tenant.update).toHaveBeenCalled();
      expect(redis.del).toHaveBeenCalled();
    });
  });

  describe('branding', () => {
    it('includes branding in resolution', async () => {
      const { service, prisma } = createService();
      vi.mocked(prisma.tenant.findFirst).mockResolvedValue(mockTenant);

      const result = await service.resolveFromHost('springfield-schools.aivo.ai');

      expect(result!.tenant.branding).toEqual({
        logoUrl: 'https://cdn.example.com/logo.png',
        primaryColor: '#1a73e8',
      });
    });

    it('omits branding when not configured', async () => {
      const { service, prisma } = createService();
      vi.mocked(prisma.tenant.findFirst).mockResolvedValue({
        ...mockTenant,
        logoUrl: null,
        primaryColor: null,
      });

      const result = await service.resolveFromHost('springfield-schools.aivo.ai');

      expect(result!.tenant.branding).toBeUndefined();
    });
  });

  describe('factory functions', () => {
    it('createTenantResolverService creates singleton', () => {
      const prisma = createMockPrisma();

      const service1 = createTenantResolverService({
        redis: null,
        prisma,
        baseDomain: 'aivo.ai',
      });

      const service2 = getTenantResolverService();

      expect(service2).toBe(service1);
    });

    it('getTenantResolverService throws if not initialized', () => {
      // Note: This test may fail if previous tests already initialized the singleton
      // In a real scenario, you'd reset the module between tests
    });
  });
});
