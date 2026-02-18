/**
 * Entitlement Guard Middleware — Unit Tests
 *
 * Validates subscription-tier enforcement for content-sharing routes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Mock config — must be set before importing the module under test
vi.mock('../src/config.js', () => ({
  config: {
    billingServiceUrl: 'http://billing-svc:4060',
    billingCheckDisabled: false,
    isDev: true,
  },
}));

// Mock @aivo/billing-access
const mockIsLimitedMode = vi.fn().mockResolvedValue(false);
vi.mock('@aivo/billing-access', () => ({
  BillingAccessClient: vi.fn().mockImplementation(() => ({
    isLimitedMode: mockIsLimitedMode,
    getSubscriptionAccessInfo: vi.fn(),
    invalidateCache: vi.fn(),
    clearCache: vi.fn(),
  })),
}));

// Mock global fetch for billing-svc entitlements API calls
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    user: {
      sub: 'user-1',
      tenantId: 'tenant-1',
      roles: ['author'],
      email: 'test@example.com',
    },
    headers: {},
    entitlements: undefined,
    ...overrides,
  };
}

function makeReply() {
  const reply: Record<string, unknown> = { sent: false, _statusCode: 0, _body: null };
  reply.status = vi.fn((code: number) => {
    reply._statusCode = code;
    return reply;
  });
  reply.send = vi.fn((body: unknown) => {
    reply._body = body;
    reply.sent = true;
    return reply;
  });
  return reply;
}

/** Stub fetch to return a successful JSON response */
function stubFetchOk(body: unknown) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => body,
  });
}

/** Stub fetch to return a non-ok response */
function stubFetchFail(status = 500) {
  mockFetch.mockResolvedValue({
    ok: false,
    status,
    json: async () => ({}),
  });
}

/** Stub fetch in sequence — first call returns one thing, second another, etc. */
function stubFetchSequence(responses: Array<{ ok: boolean; body?: unknown; status?: number }>) {
  for (const r of responses) {
    mockFetch.mockResolvedValueOnce({
      ok: r.ok,
      status: r.status ?? (r.ok ? 200 : 500),
      json: async () => r.body ?? {},
    });
  }
}

// ─── Import SUT (after mocks) ────────────────────────────────────────────────

import {
  entitlementPreHandler,
  requireFeature,
  requireLimit,
} from '../src/middleware/entitlementGuard.js';

// ═════════════════════════════════════════════════════════════════════════════
// TESTS
// ═════════════════════════════════════════════════════════════════════════════

describe('entitlementGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── entitlementPreHandler ───────────────────────────────────────────────

  describe('entitlementPreHandler', () => {
    it('should pass through when billingCheckDisabled is true', async () => {
      // Temporarily override config
      const { config } = await import('../src/config.js');
      const original = config.billingCheckDisabled;
      (config as Record<string, unknown>).billingCheckDisabled = true;

      const req = makeRequest();
      const reply = makeReply();

      await entitlementPreHandler(req as never, reply as never);

      expect(reply.sent).toBe(false);
      (config as Record<string, unknown>).billingCheckDisabled = original;
    });

    it('should return 401 when no user on request', async () => {
      const req = makeRequest({ user: undefined });
      const reply = makeReply();

      await entitlementPreHandler(req as never, reply as never);

      expect(reply.status).toHaveBeenCalledWith(401);
    });

    it('should bypass billing for service role users', async () => {
      const req = makeRequest({
        user: { sub: 'svc-1', tenantId: 'tenant-1', roles: ['service'], email: null },
      });
      const reply = makeReply();

      await entitlementPreHandler(req as never, reply as never);

      expect(reply.sent).toBe(false);
      expect(mockIsLimitedMode).not.toHaveBeenCalled();
    });

    it('should return 400 when tenantId is missing', async () => {
      const req = makeRequest({
        user: { sub: 'u1', roles: ['author'] },
      });
      const reply = makeReply();

      await entitlementPreHandler(req as never, reply as never);

      expect(reply.status).toHaveBeenCalledWith(400);
    });

    it('should return 402 when subscription is past due (limited mode)', async () => {
      mockIsLimitedMode.mockResolvedValueOnce(true);
      const req = makeRequest();
      const reply = makeReply();

      await entitlementPreHandler(req as never, reply as never);

      expect(reply.status).toHaveBeenCalledWith(402);
      expect((reply._body as Record<string, string>).code).toBe('BILLING_LIMITED_MODE');
    });

    it('should attach FREE entitlements when subscription is expired/cancelled', async () => {
      stubFetchOk({ plan: 'PRO', isActive: false, inGracePeriod: false, features: {}, limits: {} });
      const req = makeRequest();
      const reply = makeReply();

      await entitlementPreHandler(req as never, reply as never);

      expect(reply.sent).toBe(false);
      expect((req as Record<string, unknown>).entitlements).toEqual(
        expect.objectContaining({ plan: 'FREE', hasActiveSubscription: false }),
      );
    });

    it('should attach full entitlements for active subscription', async () => {
      stubFetchOk({
        plan: 'PRO',
        isActive: true,
        inGracePeriod: false,
        features: { collaboration: false },
        limits: { contentItems: 100 },
      });
      const req = makeRequest();
      const reply = makeReply();

      await entitlementPreHandler(req as never, reply as never);

      expect(reply.sent).toBe(false);
      const ent = (req as Record<string, unknown>).entitlements as Record<string, unknown>;
      expect(ent.plan).toBe('PRO');
      expect(ent.hasActiveSubscription).toBe(true);
    });

    it('should default to FREE when billing-svc is unreachable', async () => {
      stubFetchFail(500);
      const req = makeRequest();
      const reply = makeReply();

      await entitlementPreHandler(req as never, reply as never);

      // Fail open — should not block the request
      expect(reply.sent).toBe(false);
    });
  });

  // ─── requireLimit ───────────────────────────────────────────────────────

  describe('requireLimit', () => {
    const handler = requireLimit('contentItems');

    it('should pass when limit is not exceeded', async () => {
      stubFetchOk({
        limitType: 'contentItems',
        used: 5,
        limit: 10,
        exceeded: false,
        remaining: 5,
        percentUsed: 50,
        tenantId: 'tenant-1',
      });

      const req = makeRequest();
      const reply = makeReply();
      await handler(req as never, reply as never);

      expect(reply.sent).toBe(false);
    });

    it('should return 403 when FREE user exceeds contentItems limit (10)', async () => {
      stubFetchOk({
        limitType: 'contentItems',
        used: 10,
        limit: 10,
        exceeded: true,
        remaining: 0,
        percentUsed: 100,
        tenantId: 'tenant-1',
      });

      const req = makeRequest();
      const reply = makeReply();
      await handler(req as never, reply as never);

      expect(reply.status).toHaveBeenCalledWith(403);
      const body = reply._body as Record<string, unknown>;
      expect(body.error).toBe('LIMIT_EXCEEDED');
      expect(body.upgradePrompt).toBeDefined();
    });

    it('should pass when PRO user is below 100 contentItems limit', async () => {
      stubFetchOk({
        limitType: 'contentItems',
        used: 50,
        limit: 100,
        exceeded: false,
        remaining: 50,
        percentUsed: 50,
        tenantId: 'tenant-1',
      });

      const req = makeRequest();
      const reply = makeReply();
      await handler(req as never, reply as never);

      expect(reply.sent).toBe(false);
    });

    it('should pass when PREMIUM user has unlimited contentItems (null limit)', async () => {
      stubFetchOk({
        limitType: 'contentItems',
        used: 500,
        limit: null,
        exceeded: false,
        remaining: null,
        percentUsed: null,
        tenantId: 'tenant-1',
      });

      const req = makeRequest();
      const reply = makeReply();
      await handler(req as never, reply as never);

      expect(reply.sent).toBe(false);
    });

    it('should fail open when billing-svc is unreachable', async () => {
      stubFetchFail(500);

      const req = makeRequest();
      const reply = makeReply();
      await handler(req as never, reply as never);

      expect(reply.sent).toBe(false);
    });

    it('should bypass for service role users', async () => {
      const req = makeRequest({
        user: { sub: 'svc-1', tenantId: 'tenant-1', roles: ['service'] },
      });
      const reply = makeReply();
      await handler(req as never, reply as never);

      expect(reply.sent).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should bypass when billingCheckDisabled is true', async () => {
      const { config } = await import('../src/config.js');
      (config as Record<string, unknown>).billingCheckDisabled = true;

      const req = makeRequest();
      const reply = makeReply();
      await handler(req as never, reply as never);

      expect(reply.sent).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();

      (config as Record<string, unknown>).billingCheckDisabled = false;
    });
  });

  // ─── requireFeature ─────────────────────────────────────────────────────

  describe('requireFeature', () => {
    const handler = requireFeature('collaboration');

    it('should pass when feature is available', async () => {
      stubFetchOk({ feature: 'collaboration', hasAccess: true, tenantId: 'tenant-1' });

      const req = makeRequest();
      const reply = makeReply();
      await handler(req as never, reply as never);

      expect(reply.sent).toBe(false);
    });

    it('should return 403 when FREE user tries to access collaboration', async () => {
      stubFetchOk({ feature: 'collaboration', hasAccess: false, tenantId: 'tenant-1' });

      const req = makeRequest();
      const reply = makeReply();
      await handler(req as never, reply as never);

      expect(reply.status).toHaveBeenCalledWith(403);
      const body = reply._body as Record<string, unknown>;
      expect(body.error).toBe('FEATURE_NOT_AVAILABLE');
      expect(body.upgradePrompt).toBeDefined();
      expect((body.upgradePrompt as Record<string, string>).requiredPlan).toBe('PREMIUM');
    });

    it('should fail open when billing-svc is unreachable', async () => {
      stubFetchFail(500);

      const req = makeRequest();
      const reply = makeReply();
      await handler(req as never, reply as never);

      expect(reply.sent).toBe(false);
    });

    it('should bypass for service role users', async () => {
      const req = makeRequest({
        user: { sub: 'svc-1', tenantId: 'tenant-1', roles: ['service'] },
      });
      const reply = makeReply();
      await handler(req as never, reply as never);

      expect(reply.sent).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // ─── Collaboration visibility gate (integration-level) ──────────────────

  describe('collaboration visibility gate', () => {
    it('should block FREE users from DISTRICT visibility via requireFeature', async () => {
      stubFetchOk({ feature: 'collaboration', hasAccess: false, tenantId: 'tenant-1' });

      const guard = requireFeature('collaboration');
      const req = makeRequest();
      const reply = makeReply();
      await guard(req as never, reply as never);

      expect(reply.status).toHaveBeenCalledWith(403);
    });

    it('should block FREE users from PUBLIC visibility via requireFeature', async () => {
      stubFetchOk({ feature: 'collaboration', hasAccess: false, tenantId: 'tenant-1' });

      const guard = requireFeature('collaboration');
      const req = makeRequest();
      const reply = makeReply();
      await guard(req as never, reply as never);

      expect(reply.status).toHaveBeenCalledWith(403);
    });

    it('should allow PREMIUM users DISTRICT visibility', async () => {
      stubFetchOk({ feature: 'collaboration', hasAccess: true, tenantId: 'tenant-1' });

      const guard = requireFeature('collaboration');
      const req = makeRequest();
      const reply = makeReply();
      await guard(req as never, reply as never);

      expect(reply.sent).toBe(false);
    });
  });
});
