/**
 * Custom Domains Tests
 *
 * Unit tests for the CustomDomainService and route registration.
 */

import { describe, expect, it, vi, beforeAll, beforeEach } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';

// ══════════════════════════════════════════════════════════════════════════════
// Mocks
// ══════════════════════════════════════════════════════════════════════════════

const mockDomains: any[] = [];

vi.mock('../src/prisma', () => ({
  prisma: {
    tenantCustomDomain: {
      create: vi.fn(async ({ data }: any) => ({
        id: 'domain-1',
        ...data,
        status: 'PENDING_VERIFICATION',
        verifiedAt: null,
        createdAt: new Date(),
      })),
      findMany: vi.fn(async ({ where }: any) => {
        return mockDomains.filter((d) => {
          if (where.tenantId && d.tenantId !== where.tenantId) return false;
          if (where.status && d.status !== where.status) return false;
          return true;
        });
      }),
      findFirst: vi.fn(async ({ where }: any) => {
        return (
          mockDomains.find((d) => {
            if (where.id && d.id !== where.id) return false;
            if (where.tenantId && d.tenantId !== where.tenantId) return false;
            if (where.domain && d.domain !== where.domain) return false;
            return true;
          }) ?? null
        );
      }),
      deleteMany: vi.fn(async ({ where }: any) => {
        const idx = mockDomains.findIndex(
          (d) => d.id === where.id && d.tenantId === where.tenantId,
        );
        if (idx >= 0) {
          mockDomains.splice(idx, 1);
          return { count: 1 };
        }
        return { count: 0 };
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const d = mockDomains.find((d) => d.id === where.id);
        if (d) Object.assign(d, data);
        return d;
      }),
    },
    tenantIpAllowlist: {
      findMany: vi.fn(async () => []),
      create: vi.fn(async ({ data }: any) => ({ id: 'ip-1', ...data })),
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    tenantFeatureFlag: {
      findMany: vi.fn(async () => []),
      upsert: vi.fn(async ({ create }: any) => ({ id: 'flag-1', ...create })),
    },
    tenant: { findFirst: vi.fn(async () => null) },
    $queryRaw: vi.fn(async () => [{ ready_check: 1 }]),
  },
}));

// Provide dummy JWT key
const { publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
process.env.JWT_PUBLIC_KEY = publicKey.export({ type: 'spki', format: 'pem' }).toString();

// ══════════════════════════════════════════════════════════════════════════════
// Service unit tests
// ══════════════════════════════════════════════════════════════════════════════

describe('CustomDomainService', () => {
  let service: any;

  beforeAll(async () => {
    const mod = await import('../src/custom-domains/custom-domain.service.js');
    service = new mod.CustomDomainService();
  });

  beforeEach(() => {
    mockDomains.length = 0;
  });

  it('addDomain returns entry with verification token', async () => {
    const entry = await service.addDomain({
      tenantId: 'tenant-1',
      domain: 'learn.example.com',
    });
    expect(entry.id).toBe('domain-1');
    expect(entry.verificationToken).toBeTruthy();
    expect(entry.domain).toBe('learn.example.com');
  });

  it('listDomains returns array', async () => {
    const list = await service.listDomains('tenant-1');
    expect(Array.isArray(list)).toBe(true);
  });

  it('removeDomain returns false for non-existent domain', async () => {
    const removed = await service.removeDomain('tenant-1', 'does-not-exist');
    expect(removed).toBe(false);
  });

  it('resolveDomainToTenant returns null when no match', async () => {
    const result = await service.resolveDomainToTenant('unknown.example.com');
    expect(result).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Route registration tests
// ══════════════════════════════════════════════════════════════════════════════

describe('Custom domain routes', () => {
  let app: any;

  beforeAll(async () => {
    const mod = await import('../src/app.js');
    app = mod.createApp();
    await app.ready();
  });

  it('GET /admin/custom-domains/:tenantId route registered', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/custom-domains/00000000-0000-0000-0000-000000000001',
    });
    expect([200, 401, 403]).toContain(res.statusCode);
  });
});
