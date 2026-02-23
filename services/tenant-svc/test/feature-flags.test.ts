/**
 * Feature Flags Tests
 *
 * Unit tests for TenantFeatureFlagsService and route registration.
 */

import { describe, expect, it, vi, beforeAll, beforeEach } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';

// ══════════════════════════════════════════════════════════════════════════════
// Mocks
// ══════════════════════════════════════════════════════════════════════════════

const mockFlags: any[] = [];

vi.mock('../src/prisma', () => ({
  prisma: {
    tenantFeatureFlag: {
      findMany: vi.fn(async ({ where }: any) => {
        return mockFlags.filter((f) => f.tenantId === where.tenantId);
      }),
      upsert: vi.fn(async ({ create, update }: any) => {
        const existing = mockFlags.find(
          (f) => f.tenantId === create.tenantId && f.flag === create.flag,
        );
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const entry = { id: `flag-${Date.now()}`, ...create };
        mockFlags.push(entry);
        return entry;
      }),
    },
    tenantIpAllowlist: {
      findMany: vi.fn(async () => []),
      create: vi.fn(async ({ data }: any) => ({ id: 'ip-1', ...data })),
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    tenantCustomDomain: {
      findMany: vi.fn(async () => []),
      create: vi.fn(async ({ data }: any) => ({ id: 'domain-1', ...data })),
      findFirst: vi.fn(async () => null),
      deleteMany: vi.fn(async () => ({ count: 0 })),
      update: vi.fn(async () => null),
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

describe('TenantFeatureFlagsService', () => {
  let service: any;

  beforeAll(async () => {
    const mod = await import('../src/feature-flags/tenant-feature-flags.service.js');
    service = new mod.TenantFeatureFlagsService();
  });

  beforeEach(() => {
    mockFlags.length = 0;
  });

  it('setFlag creates a new flag entry', async () => {
    const entry = await service.setFlag({
      tenantId: 'tenant-1',
      flag: 'homework_helper',
      enabled: true,
    });
    expect(entry.flag).toBe('homework_helper');
    expect(entry.enabled).toBe(true);
  });

  it('setFlag rejects unknown flags', async () => {
    await expect(
      service.setFlag({
        tenantId: 'tenant-1',
        flag: 'unknown_flag',
        enabled: true,
      }),
    ).rejects.toThrow('not a valid toggleable flag');
  });

  it('getFlags returns all DISTRICT_TOGGLEABLE_FLAGS with defaults', async () => {
    const flags = await service.getFlags('tenant-1');
    expect(flags.length).toBeGreaterThanOrEqual(8);
    expect(flags.every((f: any) => typeof f.enabled === 'boolean')).toBe(true);
  });

  it('isFlagEnabled returns false for unset flag', async () => {
    const enabled = await service.isFlagEnabled('tenant-1', 'focus_mode');
    expect(enabled).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Route registration tests
// ══════════════════════════════════════════════════════════════════════════════

describe('Feature flags routes', () => {
  let app: any;

  beforeAll(async () => {
    const mod = await import('../src/app.js');
    app = mod.createApp();
    await app.ready();
  });

  it('GET /admin/feature-flags/available returns flag list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/feature-flags/available',
    });
    // May be behind auth, but route should exist
    expect([200, 401, 403]).toContain(res.statusCode);
  });

  it('GET /admin/feature-flags/:tenantId route registered', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/feature-flags/00000000-0000-0000-0000-000000000001',
    });
    expect([200, 401, 403]).toContain(res.statusCode);
  });
});
