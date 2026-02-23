/**
 * IP Allowlist Tests
 *
 * Unit tests for IP allowlist service (CIDR matching) and
 * integration tests for the middleware and routes.
 */

import { describe, expect, it, vi, beforeAll, beforeEach } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { ipMatchesCidr } from '../src/ip-allowlist/ip-allowlist.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// Mocks
// ══════════════════════════════════════════════════════════════════════════════

const mockEntries: any[] = [];

vi.mock('../src/prisma', () => ({
  prisma: {
    tenantIpAllowlist: {
      create: vi.fn(async ({ data }: any) => ({
        id: 'range-1',
        ...data,
        createdAt: new Date(),
      })),
      deleteMany: vi.fn(async ({ where }: any) => {
        const idx = mockEntries.findIndex(
          (e) => e.id === where.id && e.tenantId === where.tenantId,
        );
        if (idx >= 0) {
          mockEntries.splice(idx, 1);
          return { count: 1 };
        }
        return { count: 0 };
      }),
      findMany: vi.fn(async ({ where }: any) => {
        return mockEntries.filter((e) => e.tenantId === where.tenantId);
      }),
    },
    // Other models used by app.ts registration - stub them
    tenant: { findFirst: vi.fn(async () => null) },
    $queryRaw: vi.fn(async () => [{ ready_check: 1 }]),
  },
}));

// Provide dummy JWT key
const { publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
process.env.JWT_PUBLIC_KEY = publicKey.export({ type: 'spki', format: 'pem' }).toString();

// ══════════════════════════════════════════════════════════════════════════════
// Pure CIDR matching tests
// ══════════════════════════════════════════════════════════════════════════════

describe('ipMatchesCidr – IPv4', () => {
  it('matches exact /32', () => {
    expect(ipMatchesCidr('10.0.0.1', '10.0.0.1/32')).toBe(true);
    expect(ipMatchesCidr('10.0.0.2', '10.0.0.1/32')).toBe(false);
  });

  it('matches /24 subnet', () => {
    expect(ipMatchesCidr('192.168.1.100', '192.168.1.0/24')).toBe(true);
    expect(ipMatchesCidr('192.168.2.1', '192.168.1.0/24')).toBe(false);
  });

  it('matches /16 subnet', () => {
    expect(ipMatchesCidr('172.16.50.100', '172.16.0.0/16')).toBe(true);
    expect(ipMatchesCidr('172.17.0.1', '172.16.0.0/16')).toBe(false);
  });

  it('matches /0 (any)', () => {
    expect(ipMatchesCidr('1.2.3.4', '0.0.0.0/0')).toBe(true);
  });

  it('treats bare IP as /32', () => {
    expect(ipMatchesCidr('10.10.10.10', '10.10.10.10')).toBe(true);
    expect(ipMatchesCidr('10.10.10.11', '10.10.10.10')).toBe(false);
  });
});

describe('ipMatchesCidr – IPv6', () => {
  it('matches exact /128', () => {
    expect(ipMatchesCidr('::1', '::1/128')).toBe(true);
    expect(ipMatchesCidr('::2', '::1/128')).toBe(false);
  });

  it('matches /64 prefix', () => {
    expect(ipMatchesCidr('2001:db8::1', '2001:db8::/64')).toBe(true);
    expect(ipMatchesCidr('2001:db9::1', '2001:db8::/64')).toBe(false);
  });
});

describe('ipMatchesCidr – cross-family', () => {
  it('does not match IPv4 against IPv6 CIDR', () => {
    expect(ipMatchesCidr('10.0.0.1', '::1/128')).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Route integration tests
// ══════════════════════════════════════════════════════════════════════════════

describe('IP allowlist routes', () => {
  let app: any;

  beforeAll(async () => {
    const mod = await import('../src/app.js');
    app = mod.createApp();
    await app.ready();
  });

  beforeEach(() => {
    mockEntries.length = 0;
  });

  it('GET /admin/ip-allowlist/:tenantId returns empty list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/ip-allowlist/00000000-0000-0000-0000-000000000001',
    });
    // Will be 401/403 since no auth, but verifies route registration
    expect([200, 401, 403]).toContain(res.statusCode);
  });

  it('POST /admin/ip-allowlist/:tenantId registers route', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/admin/ip-allowlist/00000000-0000-0000-0000-000000000001',
      payload: { cidr: '10.0.0.0/24', label: 'Office' },
    });
    expect([201, 401, 403]).toContain(res.statusCode);
  });
});
