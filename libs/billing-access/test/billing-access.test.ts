import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BillingAccessClient,
  createBillingAccessHook,
  createBillingAccessMiddleware,
} from '../src/index.js';
import type { SubscriptionAccessInfo } from '../src/index.js';

// =============================================================================
// Helpers
// =============================================================================

const BILLING_URL = 'http://billing-svc:4060';

function makeAccessInfo(overrides: Partial<SubscriptionAccessInfo> = {}): SubscriptionAccessInfo {
  return {
    hasActiveSubscription: true,
    status: 'active',
    limitedMode: false,
    activeSkus: ['BASE'],
    learnerSkus: {},
    ...overrides,
  };
}

function mockFetch(data: SubscriptionAccessInfo | null, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  });
}

// =============================================================================
// Tests
// =============================================================================

describe('BillingAccessClient', () => {
  let client: BillingAccessClient;

  beforeEach(() => {
    client = new BillingAccessClient({ billingServiceUrl: BILLING_URL });
    vi.restoreAllMocks();
  });

  describe('canStartSession', () => {
    it('allows when subscription is active and learner has BASE', async () => {
      const info = makeAccessInfo({ activeSkus: ['BASE'] });
      vi.stubGlobal('fetch', mockFetch(info));

      const result = await client.canStartSession({ tenantId: 't1', learnerId: 'l1' });
      expect(result.allowed).toBe(true);
      expect(result.limitedMode).toBe(false);
    });

    it('allows when learner has BASE via learnerSkus', async () => {
      const info = makeAccessInfo({
        activeSkus: [],
        learnerSkus: { l1: ['BASE'] },
      });
      vi.stubGlobal('fetch', mockFetch(info));

      const result = await client.canStartSession({ tenantId: 't1', learnerId: 'l1' });
      expect(result.allowed).toBe(true);
    });

    it('denies when no active subscription', async () => {
      const info = makeAccessInfo({
        hasActiveSubscription: false,
        status: null,
        activeSkus: [],
      });
      vi.stubGlobal('fetch', mockFetch(info));

      const result = await client.canStartSession({ tenantId: 't1', learnerId: 'l1' });
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/subscribe/i);
    });

    it('denies when in limited mode', async () => {
      const info = makeAccessInfo({
        limitedMode: true,
        status: 'past_due',
      });
      vi.stubGlobal('fetch', mockFetch(info));

      const result = await client.canStartSession({ tenantId: 't1', learnerId: 'l1' });
      expect(result.allowed).toBe(false);
      expect(result.limitedMode).toBe(true);
      expect(result.reason).toMatch(/past due/i);
    });

    it('denies when learner lacks BASE SKU', async () => {
      const info = makeAccessInfo({
        activeSkus: ['ADDON_SEL'],
        learnerSkus: { l1: ['ADDON_SEL'] },
      });
      vi.stubGlobal('fetch', mockFetch(info));

      const result = await client.canStartSession({ tenantId: 't1', learnerId: 'l1' });
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/does not have access/i);
    });

    it('fails open on fetch error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));

      const result = await client.canStartSession({ tenantId: 't1', learnerId: 'l1' });
      expect(result.allowed).toBe(true);
    });
  });

  describe('hasAddon', () => {
    it('returns true when learner has the addon SKU', async () => {
      const info = makeAccessInfo({
        learnerSkus: { l1: ['BASE', 'ADDON_SEL'] },
      });
      vi.stubGlobal('fetch', mockFetch(info));

      const result = await client.hasAddon({ tenantId: 't1', learnerId: 'l1', sku: 'ADDON_SEL' });
      expect(result.hasAddon).toBe(true);
    });

    it('returns true when addon is in activeSkus', async () => {
      const info = makeAccessInfo({
        activeSkus: ['BASE', 'ADDON_SEL'],
      });
      vi.stubGlobal('fetch', mockFetch(info));

      const result = await client.hasAddon({ tenantId: 't1', learnerId: 'l1', sku: 'ADDON_SEL' });
      expect(result.hasAddon).toBe(true);
    });

    it('returns false when addon is absent', async () => {
      const info = makeAccessInfo({
        activeSkus: ['BASE'],
        learnerSkus: { l1: ['BASE'] },
      });
      vi.stubGlobal('fetch', mockFetch(info));

      const result = await client.hasAddon({ tenantId: 't1', learnerId: 'l1', sku: 'ADDON_SEL' });
      expect(result.hasAddon).toBe(false);
    });

    it('reports isTrialing when status is trialing', async () => {
      const info = makeAccessInfo({
        status: 'trialing',
        activeSkus: ['BASE', 'ADDON_SEL'],
      });
      vi.stubGlobal('fetch', mockFetch(info));

      const result = await client.hasAddon({ tenantId: 't1', learnerId: 'l1', sku: 'ADDON_SEL' });
      expect(result.hasAddon).toBe(true);
      expect(result.isTrialing).toBe(true);
    });

    it('returns false on error (fail open)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));

      const result = await client.hasAddon({ tenantId: 't1', learnerId: 'l1', sku: 'ADDON_SEL' });
      expect(result.hasAddon).toBe(false);
    });
  });

  describe('isLimitedMode', () => {
    it('returns true when tenant is in limited mode', async () => {
      const info = makeAccessInfo({ limitedMode: true });
      vi.stubGlobal('fetch', mockFetch(info));

      expect(await client.isLimitedMode({ tenantId: 't1' })).toBe(true);
    });

    it('returns false when tenant is active', async () => {
      const info = makeAccessInfo({ limitedMode: false });
      vi.stubGlobal('fetch', mockFetch(info));

      expect(await client.isLimitedMode({ tenantId: 't1' })).toBe(false);
    });

    it('returns false on error (fail open)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fail')));

      expect(await client.isLimitedMode({ tenantId: 't1' })).toBe(false);
    });
  });

  describe('caching', () => {
    it('uses cached value on second call', async () => {
      const fetchMock = mockFetch(makeAccessInfo());
      vi.stubGlobal('fetch', fetchMock);

      await client.canStartSession({ tenantId: 't1', learnerId: 'l1' });
      await client.canStartSession({ tenantId: 't1', learnerId: 'l1' });

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('invalidateCache forces re-fetch', async () => {
      const fetchMock = mockFetch(makeAccessInfo());
      vi.stubGlobal('fetch', fetchMock);

      await client.canStartSession({ tenantId: 't1', learnerId: 'l1' });
      client.invalidateCache('t1');
      await client.canStartSession({ tenantId: 't1', learnerId: 'l1' });

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('clearCache forces re-fetch for all tenants', async () => {
      const fetchMock = mockFetch(makeAccessInfo());
      vi.stubGlobal('fetch', fetchMock);

      await client.canStartSession({ tenantId: 't1', learnerId: 'l1' });
      await client.canStartSession({ tenantId: 't2', learnerId: 'l2' });
      client.clearCache();
      await client.canStartSession({ tenantId: 't1', learnerId: 'l1' });

      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
  });

  describe('getSubscriptionAccessInfo', () => {
    it('returns no subscription for 404', async () => {
      vi.stubGlobal('fetch', mockFetch(null, 404));

      const info = await client.getSubscriptionAccessInfo('t1');
      expect(info.hasActiveSubscription).toBe(false);
      expect(info.activeSkus).toEqual([]);
    });

    it('throws on non-404 error status', async () => {
      vi.stubGlobal('fetch', mockFetch(null, 500));

      await expect(client.getSubscriptionAccessInfo('t1')).rejects.toThrow(
        /billing service error/i
      );
    });
  });
});

describe('createBillingAccessHook (Fastify)', () => {
  let client: BillingAccessClient;

  beforeEach(() => {
    client = new BillingAccessClient({ billingServiceUrl: BILLING_URL });
    vi.restoreAllMocks();
  });

  it('returns 400 when x-tenant-id is missing', async () => {
    const hook = createBillingAccessHook(client);
    const sendFn = vi.fn();
    const codeFn = vi.fn().mockReturnValue({ send: sendFn });
    const request = { headers: {} };

    await hook(request, { code: codeFn });

    expect(codeFn).toHaveBeenCalledWith(400);
    expect(sendFn).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('tenant') })
    );
  });

  it('returns 402 when learner session not allowed', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch(makeAccessInfo({ hasActiveSubscription: false, status: null, activeSkus: [] }))
    );

    const hook = createBillingAccessHook(client);
    const sendFn = vi.fn();
    const codeFn = vi.fn().mockReturnValue({ send: sendFn });

    await hook({ headers: { 'x-tenant-id': 't1', 'x-learner-id': 'l1' } }, { code: codeFn });

    expect(codeFn).toHaveBeenCalledWith(402);
    expect(sendFn).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'SUBSCRIPTION_REQUIRED' })
    );
  });

  it('returns 402 when tenant is in limited mode (no learner)', async () => {
    vi.stubGlobal('fetch', mockFetch(makeAccessInfo({ limitedMode: true })));

    const hook = createBillingAccessHook(client);
    const sendFn = vi.fn();
    const codeFn = vi.fn().mockReturnValue({ send: sendFn });

    await hook({ headers: { 'x-tenant-id': 't1' } }, { code: codeFn });

    expect(codeFn).toHaveBeenCalledWith(402);
    expect(sendFn).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'SUBSCRIPTION_PAST_DUE' })
    );
  });

  it('does not reply when access is allowed', async () => {
    vi.stubGlobal('fetch', mockFetch(makeAccessInfo()));

    const hook = createBillingAccessHook(client);
    const codeFn = vi.fn();

    await hook({ headers: { 'x-tenant-id': 't1', 'x-learner-id': 'l1' } }, { code: codeFn });

    expect(codeFn).not.toHaveBeenCalled();
  });
});

describe('createBillingAccessMiddleware (Express)', () => {
  let client: BillingAccessClient;

  beforeEach(() => {
    client = new BillingAccessClient({ billingServiceUrl: BILLING_URL });
    vi.restoreAllMocks();
  });

  it('returns 400 when x-tenant-id is missing', async () => {
    const mw = createBillingAccessMiddleware(client);
    const jsonFn = vi.fn();
    const statusFn = vi.fn().mockReturnValue({ json: jsonFn });
    const next = vi.fn();

    await mw({ headers: {} }, { status: statusFn }, next);

    expect(statusFn).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when access is allowed', async () => {
    vi.stubGlobal('fetch', mockFetch(makeAccessInfo()));

    const mw = createBillingAccessMiddleware(client);
    const next = vi.fn();
    const statusFn = vi.fn();

    await mw(
      { headers: { 'x-tenant-id': 't1', 'x-learner-id': 'l1' } },
      { status: statusFn },
      next
    );

    expect(next).toHaveBeenCalled();
    expect(statusFn).not.toHaveBeenCalled();
  });

  it('returns 402 when subscription is required', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch(makeAccessInfo({ hasActiveSubscription: false, status: null, activeSkus: [] }))
    );

    const mw = createBillingAccessMiddleware(client);
    const jsonFn = vi.fn();
    const statusFn = vi.fn().mockReturnValue({ json: jsonFn });
    const next = vi.fn();

    await mw(
      { headers: { 'x-tenant-id': 't1', 'x-learner-id': 'l1' } },
      { status: statusFn },
      next
    );

    expect(statusFn).toHaveBeenCalledWith(402);
    expect(jsonFn).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'SUBSCRIPTION_REQUIRED' })
    );
    expect(next).not.toHaveBeenCalled();
  });
});
