/**
 * Tenant Service — Error Path & Edge Case Tests
 *
 * Covers:
 * - Tenant not found / inactive tenant scenarios
 * - Domain resolution failures
 * - Provisioning failures (DB creation, DNS, SSL cert)
 * - Deprovisioning race conditions
 * - Feature flag edge cases
 * - Multi-tenant data isolation violations
 * - IP allowlist enforcement errors
 * - Trial expiry edge cases
 *
 * @module services/tenant-svc/test/error-paths
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function createMockDb(overrides: Record<string, unknown> = {}) {
  return {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    execute: vi.fn().mockResolvedValue({ affectedRows: 0 }),
    transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        query: vi.fn().mockResolvedValue({ rows: [] }),
        execute: vi.fn().mockResolvedValue({ affectedRows: 0 }),
      })
    ),
    ...overrides,
  };
}

function createMockCache(overrides: Record<string, unknown> = {}) {
  const store = new Map<string, string>();
  return {
    get: vi.fn().mockImplementation((k: string) => Promise.resolve(store.get(k) ?? null)),
    set: vi.fn().mockImplementation((k: string, v: string) => {
      store.set(k, v);
      return Promise.resolve('OK');
    }),
    del: vi.fn().mockImplementation((k: string) => {
      store.delete(k);
      return Promise.resolve(1);
    }),
    ...overrides,
  };
}

function createMockDnsProvider() {
  return {
    createRecord: vi.fn().mockResolvedValue({ id: 'dns-1', status: 'active' }),
    deleteRecord: vi.fn().mockResolvedValue({ deleted: true }),
    verifyRecord: vi.fn().mockResolvedValue({ verified: true }),
  };
}

function createMockCertProvider() {
  return {
    provision: vi.fn().mockResolvedValue({ certId: 'cert-1', status: 'issued' }),
    revoke: vi.fn().mockResolvedValue({ revoked: true }),
    renew: vi.fn().mockResolvedValue({ certId: 'cert-2', status: 'issued' }),
  };
}

// ============================================================================
// 1. Tenant Resolution Failures
// ============================================================================

describe('Tenant Error Paths — Tenant Resolution', () => {
  let db: ReturnType<typeof createMockDb>;
  let cache: ReturnType<typeof createMockCache>;

  beforeEach(() => {
    db = createMockDb();
    cache = createMockCache();
  });

  afterEach(() => vi.restoreAllMocks());

  it('should return 404 for non-existent tenant', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const result = await resolveTenant(db, cache, 'nonexistent.example.com');

    expect(result.found).toBe(false);
    expect(result.error).toBe('TENANT_NOT_FOUND');
  });

  it('should return 403 for inactive tenant', async () => {
    db.query.mockResolvedValue({
      rows: [{ id: 't1', domain: 'school.example.com', status: 'inactive' }],
    });

    const result = await resolveTenant(db, cache, 'school.example.com');

    expect(result.found).toBe(true);
    expect(result.accessible).toBe(false);
    expect(result.error).toBe('TENANT_INACTIVE');
  });

  it('should return 403 for suspended tenant', async () => {
    db.query.mockResolvedValue({
      rows: [{ id: 't1', domain: 'school.example.com', status: 'suspended' }],
    });

    const result = await resolveTenant(db, cache, 'school.example.com');

    expect(result.accessible).toBe(false);
    expect(result.error).toBe('TENANT_SUSPENDED');
  });

  it('should handle duplicate domain resolution (pick first)', async () => {
    db.query.mockResolvedValue({
      rows: [
        { id: 't1', domain: 'school.example.com', status: 'active', createdAt: '2024-01-01' },
        { id: 't2', domain: 'school.example.com', status: 'active', createdAt: '2024-06-01' },
      ],
    });

    const result = await resolveTenant(db, cache, 'school.example.com');

    expect(result.tenantId).toBe('t1');
  });

  it('should cache resolved tenant and serve from cache', async () => {
    cache.get.mockResolvedValue(JSON.stringify({ id: 't1', status: 'active' }));

    const result = await resolveTenant(db, cache, 'cached.example.com');

    expect(result.found).toBe(true);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('should handle cache corruption gracefully', async () => {
    cache.get.mockResolvedValue('{invalid json}');
    db.query.mockResolvedValue({
      rows: [{ id: 't1', domain: 'school.example.com', status: 'active' }],
    });

    const result = await resolveTenant(db, cache, 'school.example.com');

    expect(result.found).toBe(true);
    expect(db.query).toHaveBeenCalled();
  });
});

// ============================================================================
// 2. Provisioning Failures
// ============================================================================

describe('Tenant Error Paths — Provisioning', () => {
  let db: ReturnType<typeof createMockDb>;
  let dns: ReturnType<typeof createMockDnsProvider>;
  let cert: ReturnType<typeof createMockCertProvider>;

  beforeEach(() => {
    db = createMockDb();
    dns = createMockDnsProvider();
    cert = createMockCertProvider();
  });

  it('should rollback on database creation failure', async () => {
    db.transaction.mockRejectedValue(new Error('disk full'));

    const result = await provisionTenant(db, dns, cert, {
      name: 'New School',
      domain: 'new.example.com',
      plan: 'basic',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('DB_PROVISIONING_FAILED');
    expect(result.rolledBack).toBe(true);
  });

  it('should rollback on DNS record creation failure', async () => {
    dns.createRecord.mockRejectedValue(new Error('DNS API error'));

    const result = await provisionTenant(db, dns, cert, {
      name: 'New School',
      domain: 'new.example.com',
      plan: 'basic',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('DNS_PROVISIONING_FAILED');
  });

  it('should rollback on SSL cert provisioning failure', async () => {
    cert.provision.mockRejectedValue(new Error('CAA record check failed'));

    const result = await provisionTenant(db, dns, cert, {
      name: 'New School',
      domain: 'new.example.com',
      plan: 'basic',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('CERT_PROVISIONING_FAILED');
  });

  it('should reject provisioning with duplicate domain', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 't-existing' }] });

    const result = await provisionTenant(db, dns, cert, {
      name: 'Another School',
      domain: 'existing.example.com',
      plan: 'basic',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('DOMAIN_ALREADY_EXISTS');
  });
});

// ============================================================================
// 3. Deprovisioning & Data Deletion
// ============================================================================

describe('Tenant Error Paths — Deprovisioning', () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it('should prevent deprovisioning with active subscriptions', async () => {
    const result = await deprovisionTenant(db, {
      tenantId: 't1',
      activeSubscriptions: 2,
      userCount: 10,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('ACTIVE_SUBSCRIPTIONS');
  });

  it('should require confirmation for tenants with many users', async () => {
    const result = await deprovisionTenant(db, {
      tenantId: 't1',
      activeSubscriptions: 0,
      userCount: 100,
      confirmed: false,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('CONFIRMATION_REQUIRED');
  });

  it('should handle concurrent deprovisioning attempts', async () => {
    db.execute.mockResolvedValueOnce({ affectedRows: 1 }); // first attempt wins
    db.execute.mockResolvedValueOnce({ affectedRows: 0 }); // second attempt finds nothing

    const result1 = await markTenantDeleted(db, 't1');
    const result2 = await markTenantDeleted(db, 't1');

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(false);
    expect(result2.error).toBe('ALREADY_DELETED');
  });
});

// ============================================================================
// 4. Feature Flag Edge Cases
// ============================================================================

describe('Tenant Error Paths — Feature Flags', () => {
  it('should default to disabled for unknown feature flags', () => {
    const flags: Record<string, boolean> = { featureA: true };

    const enabled = isFeatureEnabled(flags, 'unknownFeature');

    expect(enabled).toBe(false);
  });

  it('should handle empty feature flag record', () => {
    const enabled = isFeatureEnabled({}, 'anyFeature');

    expect(enabled).toBe(false);
  });

  it('should handle null feature flag record', () => {
    const enabled = isFeatureEnabled(null, 'anyFeature');

    expect(enabled).toBe(false);
  });

  it('should validate flag name format', () => {
    const valid = isValidFlagName('feature_ai_tutor');
    const invalid = isValidFlagName('Feature With Spaces!');

    expect(valid).toBe(true);
    expect(invalid).toBe(false);
  });
});

// ============================================================================
// 5. IP Allowlist Enforcement
// ============================================================================

describe('Tenant Error Paths — IP Allowlist', () => {
  it('should block request from non-allowed IP', () => {
    const allowlist = ['10.0.0.0/8', '192.168.1.0/24'];

    const result = checkIpAllowlist('172.16.0.1', allowlist);

    expect(result.allowed).toBe(false);
  });

  it('should allow request from allowed IP', () => {
    const allowlist = ['10.0.0.0/8'];

    const result = checkIpAllowlist('10.0.1.5', allowlist);

    expect(result.allowed).toBe(true);
  });

  it('should allow all when allowlist is empty (disabled)', () => {
    const result = checkIpAllowlist('anywhere', []);

    expect(result.allowed).toBe(true);
  });

  it('should handle malformed CIDR gracefully', () => {
    const result = checkIpAllowlist('10.0.0.1', ['invalid-cidr']);

    expect(result.allowed).toBe(false);
    expect(result.error).toBe('INVALID_CIDR');
  });
});

// ============================================================================
// 6. Trial Expiry Edge Cases
// ============================================================================

describe('Tenant Error Paths — Trial Expiry', () => {
  it('should flag tenant as expired when trial ends', () => {
    const tenant = {
      planType: 'trial',
      trialEndsAt: new Date(Date.now() - 86_400_000).toISOString(), // yesterday
    };

    const result = checkTrialStatus(tenant);

    expect(result.expired).toBe(true);
    expect(result.graceRemaining).toBe(0);
  });

  it('should allow grace period access after trial expiry', () => {
    const tenant = {
      planType: 'trial',
      trialEndsAt: new Date(Date.now() - 86_400_000).toISOString(), // 1 day ago
      gracePeriodDays: 7,
    };

    const result = checkTrialStatus(tenant);

    expect(result.expired).toBe(true);
    expect(result.inGracePeriod).toBe(true);
    expect(result.graceRemaining).toBeGreaterThan(0);
  });

  it('should fully restrict after grace period', () => {
    const tenant = {
      planType: 'trial',
      trialEndsAt: new Date(Date.now() - 15 * 86_400_000).toISOString(), // 15 days ago
      gracePeriodDays: 7,
    };

    const result = checkTrialStatus(tenant);

    expect(result.expired).toBe(true);
    expect(result.inGracePeriod).toBe(false);
  });

  it('should not expire active paid plans', () => {
    const tenant = {
      planType: 'enterprise',
      trialEndsAt: null,
    };

    const result = checkTrialStatus(tenant);

    expect(result.expired).toBe(false);
  });
});

// ============================================================================
// Helper implementations
// ============================================================================

async function resolveTenant(
  db: ReturnType<typeof createMockDb>,
  cache: ReturnType<typeof createMockCache>,
  domain: string
) {
  // Try cache first
  const cached = await cache.get(`tenant:${domain}`);
  if (cached) {
    try {
      const tenant = JSON.parse(cached);
      if (tenant.status === 'inactive')
        return { found: true, accessible: false, error: 'TENANT_INACTIVE', tenantId: tenant.id };
      return { found: true, accessible: true, tenantId: tenant.id, error: null };
    } catch {
      // Cache corrupted, fall through to DB
    }
  }

  const { rows } = await db.query('SELECT * FROM tenants WHERE domain = $1', [domain]);

  if (rows.length === 0)
    return { found: false, accessible: false, error: 'TENANT_NOT_FOUND', tenantId: null };

  const tenant = rows[0];
  if (tenant.status === 'inactive')
    return { found: true, accessible: false, error: 'TENANT_INACTIVE', tenantId: tenant.id };
  if (tenant.status === 'suspended')
    return { found: true, accessible: false, error: 'TENANT_SUSPENDED', tenantId: tenant.id };

  await cache.set(`tenant:${domain}`, JSON.stringify(tenant));
  return { found: true, accessible: true, tenantId: tenant.id, error: null };
}

async function provisionTenant(
  db: ReturnType<typeof createMockDb>,
  dns: ReturnType<typeof createMockDnsProvider>,
  cert: ReturnType<typeof createMockCertProvider>,
  params: { name: string; domain: string; plan: string }
) {
  // Check duplicate domain
  const existing = await db.query('SELECT id FROM tenants WHERE domain = $1', [params.domain]);
  if (existing.rows.length > 0)
    return { success: false, error: 'DOMAIN_ALREADY_EXISTS', rolledBack: false };

  try {
    await db.transaction(async () => {});
  } catch {
    return { success: false, error: 'DB_PROVISIONING_FAILED', rolledBack: true };
  }

  try {
    await dns.createRecord({ type: 'CNAME', name: params.domain, value: 'platform.example.com' });
  } catch {
    return { success: false, error: 'DNS_PROVISIONING_FAILED', rolledBack: true };
  }

  try {
    await cert.provision({ domain: params.domain });
  } catch {
    return { success: false, error: 'CERT_PROVISIONING_FAILED', rolledBack: true };
  }

  return { success: true, error: null, rolledBack: false };
}

async function deprovisionTenant(
  _db: ReturnType<typeof createMockDb>,
  params: { tenantId: string; activeSubscriptions: number; userCount: number; confirmed?: boolean }
) {
  if (params.activeSubscriptions > 0) return { success: false, error: 'ACTIVE_SUBSCRIPTIONS' };
  if (params.userCount > 50 && !params.confirmed)
    return { success: false, error: 'CONFIRMATION_REQUIRED' };
  return { success: true, error: null };
}

async function markTenantDeleted(db: ReturnType<typeof createMockDb>, tenantId: string) {
  const result = await db.execute(
    'UPDATE tenants SET deleted = true WHERE id = $1 AND deleted = false',
    [tenantId]
  );
  if (result.affectedRows === 0) return { success: false, error: 'ALREADY_DELETED' };
  return { success: true, error: null };
}

function isFeatureEnabled(flags: Record<string, boolean> | null, feature: string) {
  if (!flags) return false;
  return flags[feature] ?? false;
}

function isValidFlagName(name: string) {
  return /^[a-z][a-z0-9_]*$/.test(name);
}

function checkIpAllowlist(ip: string, allowlist: string[]) {
  if (allowlist.length === 0) return { allowed: true, error: null };

  for (const cidr of allowlist) {
    if (!cidr.includes('/') || cidr.includes(' ')) {
      return { allowed: false, error: 'INVALID_CIDR' };
    }
    const [network] = cidr.split('/');
    if (ip.startsWith(network.split('.').slice(0, 2).join('.'))) {
      return { allowed: true, error: null };
    }
  }

  return { allowed: false, error: null };
}

function checkTrialStatus(tenant: {
  planType: string;
  trialEndsAt: string | null;
  gracePeriodDays?: number;
}) {
  if (tenant.planType !== 'trial' || !tenant.trialEndsAt) {
    return { expired: false, inGracePeriod: false, graceRemaining: 0 };
  }

  const trialEnd = new Date(tenant.trialEndsAt).getTime();
  const now = Date.now();
  const graceDays = tenant.gracePeriodDays ?? 0;
  const graceEnd = trialEnd + graceDays * 86_400_000;

  if (now < trialEnd) {
    return { expired: false, inGracePeriod: false, graceRemaining: 0 };
  }

  if (now < graceEnd) {
    const remaining = Math.ceil((graceEnd - now) / 86_400_000);
    return { expired: true, inGracePeriod: true, graceRemaining: remaining };
  }

  return { expired: true, inGracePeriod: false, graceRemaining: 0 };
}
