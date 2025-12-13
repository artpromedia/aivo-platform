/**
 * Tenant Resolver Plugin Tests
 *
 * Integration tests for the Fastify tenant resolver plugin.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import type { Redis } from 'ioredis';
import type { PrismaClient, Tenant } from '@prisma/client';

// Mock the service module
vi.mock('../src/services/tenant-resolver.service', async () => {
  const actual = await vi.importActual('../src/services/tenant-resolver.service');
  return {
    ...actual,
    createTenantResolverService: vi.fn((config) => {
      return new (actual as any).TenantResolverService(config);
    }),
  };
});

import {
  tenantResolverPlugin,
  requireTenantContext,
  getTenantIdOrThrow,
  type TenantResolverPluginOptions,
} from '../src/plugins/tenant-resolver.plugin';

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
  logoUrl: null,
  primaryColor: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCustomDomainTenant: Tenant = {
  ...mockTenant,
  id: 'tenant-456',
  name: 'Riverside Unified',
  subdomain: 'riverside',
  customDomain: 'learning.riverside.edu',
  domainVerified: true,
};

// ══════════════════════════════════════════════════════════════════════════════
// Mock Factories
// ══════════════════════════════════════════════════════════════════════════════

function createMockRedis(): Redis {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
  } as unknown as Redis;
}

function createMockPrisma(): PrismaClient {
  const mockFindFirst = vi.fn(async ({ where }: any) => {
    // Subdomain resolution
    if (where.subdomain === 'springfield-schools') {
      return mockTenant;
    }
    // Custom domain resolution
    if (where.customDomain === 'learning.riverside.edu' && where.domainVerified) {
      return mockCustomDomainTenant;
    }
    return null;
  });

  const mockFindUnique = vi.fn(async ({ where }: any) => {
    if (where.id === 'default-tenant') {
      return { ...mockTenant, id: 'default-tenant', name: 'Consumer' };
    }
    if (where.id === mockTenant.id) return mockTenant;
    return null;
  });

  return {
    tenant: {
      findFirst: mockFindFirst,
      findUnique: mockFindUnique,
    },
  } as unknown as PrismaClient;
}

async function createTestApp(
  options?: Partial<TenantResolverPluginOptions>
): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  await app.register(tenantResolverPlugin, {
    redis: createMockRedis(),
    prisma: createMockPrisma(),
    baseDomain: 'aivo.ai',
    defaultTenantId: 'default-tenant',
    ...options,
  });

  // Test route
  app.get('/test', async (request) => {
    return {
      tenantId: request.tenantContext?.tenantId,
      tenantName: request.tenantContext?.tenant?.name,
      source: request.tenantContext?.source,
      resolved: request.tenantContext?.resolved,
    };
  });

  // Route requiring tenant
  app.get('/protected', { preHandler: requireTenantContext }, async (request) => {
    return {
      tenantId: request.tenantContext.tenantId,
    };
  });

  // Health check route (skip path)
  app.get('/health', async () => {
    return { status: 'ok' };
  });

  // Public API route (skip path)
  app.get('/api/public/info', async (request) => ({
    resolved: request.tenantContext?.resolved,
  }));

  // Routes for getTenantIdOrThrow tests
  app.get('/get-tenant-id', async (request) => {
    const tenantId = getTenantIdOrThrow(request);
    return { tenantId };
  });

  app.get('/get-tenant-id-fail', async (request) => {
    const tenantId = getTenantIdOrThrow(request);
    return { tenantId };
  });

  await app.ready();
  return app;
}

// ══════════════════════════════════════════════════════════════════════════════
// Tests
// ══════════════════════════════════════════════════════════════════════════════

describe('tenantResolverPlugin', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    vi.clearAllMocks();
  });

  describe('subdomain resolution', () => {
    it('resolves tenant from subdomain', async () => {
      app = await createTestApp();

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: {
          host: 'springfield-schools.aivo.ai',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.tenantId).toBe('tenant-123');
      expect(body.tenantName).toBe('Springfield Schools');
      expect(body.source).toBe('subdomain');
      expect(body.resolved).toBe(true);
    });

    it('returns null for unknown subdomain', async () => {
      app = await createTestApp();

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: {
          host: 'unknown-district.aivo.ai',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.tenantId).toBeNull();
      expect(body.resolved).toBe(false);
    });
  });

  describe('custom domain resolution', () => {
    it('resolves tenant from custom domain', async () => {
      app = await createTestApp();

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: {
          host: 'learning.riverside.edu',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.tenantId).toBe('tenant-456');
      expect(body.tenantName).toBe('Riverside Unified');
      expect(body.source).toBe('custom_domain');
    });
  });

  describe('default tenant resolution', () => {
    it('returns default tenant for app.aivo.ai', async () => {
      app = await createTestApp();

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: {
          host: 'app.aivo.ai',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.tenantId).toBe('default-tenant');
      expect(body.source).toBe('default');
    });

    it('returns default tenant for www.aivo.ai', async () => {
      app = await createTestApp();

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: {
          host: 'www.aivo.ai',
        },
      });

      const body = response.json();
      expect(body.tenantId).toBe('default-tenant');
      expect(body.source).toBe('default');
    });
  });

  describe('skip paths', () => {
    it('skips resolution for health check', async () => {
      app = await createTestApp();

      const response = await app.inject({
        method: 'GET',
        url: '/health',
        headers: {
          host: 'unknown.aivo.ai',
        },
      });

      // Should not return 404 even for unknown tenant
      expect(response.statusCode).not.toBe(404);
    });

    it('uses custom skip paths', async () => {
      app = await createTestApp({
        skipPaths: ['/api/public', '/health'],
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/public/info',
        headers: {
          host: 'unknown.aivo.ai',
        },
      });

      const body = response.json();
      expect(body.resolved).toBe(false);
    });
  });

  describe('requireTenant option', () => {
    it('returns 404 when tenant required but not found', async () => {
      app = await createTestApp({
        requireTenant: true,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: {
          host: 'unknown-district.aivo.ai',
        },
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(body.error).toBe('Tenant not found');
    });

    it('continues normally when tenant found', async () => {
      app = await createTestApp({
        requireTenant: true,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: {
          host: 'springfield-schools.aivo.ai',
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('requireTenantContext guard', () => {
    it('blocks requests without tenant', async () => {
      app = await createTestApp();

      const response = await app.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          host: 'unknown-district.aivo.ai',
        },
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(body.error).toBe('Tenant required');
    });

    it('allows requests with tenant', async () => {
      app = await createTestApp();

      const response = await app.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          host: 'springfield-schools.aivo.ai',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.tenantId).toBe('tenant-123');
    });
  });

  describe('custom hostname extraction', () => {
    it('uses custom getHostname function', async () => {
      app = await createTestApp({
        getHostname: (request) => {
          // Extract from X-Forwarded-Host header
          return (request.headers['x-forwarded-host'] as string) || request.hostname;
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: {
          host: 'proxy.internal',
          'x-forwarded-host': 'springfield-schools.aivo.ai',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.tenantId).toBe('tenant-123');
    });
  });

  describe('decorator availability', () => {
    it('decorates fastify instance with resolver', async () => {
      app = await createTestApp();

      expect(app.tenantResolver).toBeDefined();
      expect(typeof app.tenantResolver.resolveFromHost).toBe('function');
    });
  });

  describe('getTenantIdOrThrow', () => {
    it('returns tenant ID when available', async () => {
      app = await createTestApp();

      const response = await app.inject({
        method: 'GET',
        url: '/get-tenant-id',
        headers: {
          host: 'springfield-schools.aivo.ai',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().tenantId).toBe('tenant-123');
    });

    it('throws when tenant not available', async () => {
      app = await createTestApp();

      const response = await app.inject({
        method: 'GET',
        url: '/get-tenant-id-fail',
        headers: {
          host: 'unknown-district.aivo.ai',
        },
      });

      expect(response.statusCode).toBe(500);
    });
  });
});
