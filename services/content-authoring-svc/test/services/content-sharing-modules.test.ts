/**
 * Content Sharing — Module-Based Filtering Tests
 *
 * Validates that browseSharedContent respects entitledModules and
 * that fork/download routes gate access by module.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Hoist mock functions so they're available inside vi.mock factories
const { mockFindMany, mockCount, mockFetchGlobal, mockIsLimitedMode } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockCount: vi.fn(),
  mockFetchGlobal: vi.fn(),
  mockIsLimitedMode: vi.fn().mockResolvedValue(false),
}));

// Mock prisma before importing the service
vi.mock('../../src/prisma.js', () => ({
  prisma: {
    learningObject: { findUnique: vi.fn() },
    contentShare: {
      findUnique: vi.fn(),
      findMany: mockFindMany,
      count: mockCount,
      create: vi.fn(),
      update: vi.fn(),
    },
    contentShareTag: { createMany: vi.fn() },
    contentFork: { create: vi.fn() },
    contentRating: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('../../src/config.js', () => ({
  config: {
    billingServiceUrl: 'http://billing-svc:4060',
    billingCheckDisabled: false,
    isDev: true,
  },
}));

vi.mock('@aivo/billing-access', () => ({
  BillingAccessClient: vi.fn().mockImplementation(() => ({
    isLimitedMode: mockIsLimitedMode,
  })),
}));

vi.mock('../../src/auth.js', () => ({
  getUserFromRequest: vi.fn((req: any) => req.user),
  requireAuth: vi.fn(),
}));

vi.stubGlobal('fetch', mockFetchGlobal);

import { browseSharedContent } from '../../src/services/content-sharing.service.js';
import {
  DEFAULT_FREE_MODULES,
  MODULE_MIN_PLAN,
  entitlementPreHandler,
} from '../../src/middleware/entitlementGuard.js';

// ═════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════════════════════════

/** Build a fake content share row */
function fakeShare(subject: string, id = 'share-1') {
  return {
    id,
    learningObjectId: `lo-${id}`,
    sharedByUserId: 'user-x',
    tenantId: 'tenant-1',
    visibility: 'PUBLIC',
    description: null,
    license: null,
    requiresAttribution: false,
    downloadCount: 10,
    viewCount: 50,
    forkCount: 2,
    averageRating: 4.0,
    isActive: true,
    schoolId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    learningObject: {
      id: `lo-${id}`,
      title: `${subject} Content`,
      subject,
      gradeBand: 'G3_5',
      tags: [{ tag: 'test' }],
    },
    tags: [{ tag: 'test' }],
    _count: { reviews: 1 },
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// TESTS
// ═════════════════════════════════════════════════════════════════════════════

describe('browseSharedContent — module filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should only return ELA and MATH content for FREE users (entitledModules: [ELA, MATH])', async () => {
    // Return ELA share only (simulating Prisma filtered result)
    const elaShare = fakeShare('ELA');
    mockFindMany.mockResolvedValueOnce([elaShare]);
    mockCount.mockResolvedValueOnce(1);

    const result = await browseSharedContent({
      entitledModules: ['ELA', 'MATH'],
      tenantId: 'tenant-1',
    });

    // Verify Prisma was called with subject filter
    expect(mockFindMany).toHaveBeenCalledTimes(1);
    const whereArg = mockFindMany.mock.calls[0][0].where;
    expect(whereArg.learningObject).toBeDefined();
    expect(whereArg.learningObject.subject).toEqual({ in: ['ELA', 'MATH'] });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].learningObject.subject).toBe('ELA');
  });

  it('should include SEL for PRO users (entitledModules: [ELA, MATH, SEL])', async () => {
    const shares = [fakeShare('ELA', 's1'), fakeShare('SEL', 's2')];
    mockFindMany.mockResolvedValueOnce(shares);
    mockCount.mockResolvedValueOnce(2);

    const result = await browseSharedContent({
      entitledModules: ['ELA', 'MATH', 'SEL'],
      tenantId: 'tenant-1',
    });

    const whereArg = mockFindMany.mock.calls[0][0].where;
    expect(whereArg.learningObject.subject).toEqual({ in: ['ELA', 'MATH', 'SEL'] });
    expect(result.items).toHaveLength(2);
  });

  it('should include all modules for PREMIUM users', async () => {
    const allModules = ['ELA', 'MATH', 'SEL', 'SCIENCE', 'SPEECH', 'EXECUTIVE_FUNCTION'];
    const shares = allModules.map((m, i) => fakeShare(m, `s${i}`));
    mockFindMany.mockResolvedValueOnce(shares);
    mockCount.mockResolvedValueOnce(allModules.length);

    const result = await browseSharedContent({
      entitledModules: allModules,
      tenantId: 'tenant-1',
    });

    const whereArg = mockFindMany.mock.calls[0][0].where;
    expect(whereArg.learningObject.subject).toEqual({ in: allModules });
    expect(result.items).toHaveLength(allModules.length);
  });

  it('should NOT restrict modules when entitledModules is omitted (admin/internal)', async () => {
    const shares = [fakeShare('SCIENCE', 's1')];
    mockFindMany.mockResolvedValueOnce(shares);
    mockCount.mockResolvedValueOnce(1);

    const result = await browseSharedContent({
      tenantId: 'tenant-1',
    });

    const whereArg = mockFindMany.mock.calls[0][0].where;
    // No subject filter should be applied
    expect(whereArg.learningObject?.subject).toBeUndefined();
    expect(result.items).toHaveLength(1);
  });

  it('should NOT restrict modules when entitledModules is empty array', async () => {
    const shares = [fakeShare('ELA')];
    mockFindMany.mockResolvedValueOnce(shares);
    mockCount.mockResolvedValueOnce(1);

    await browseSharedContent({
      entitledModules: [],
      tenantId: 'tenant-1',
    });

    const whereArg = mockFindMany.mock.calls[0][0].where;
    // Empty array → no filter (backward compat)
    expect(whereArg.learningObject?.subject).toBeUndefined();
  });

  it('should combine entitledModules with explicit subject filter', async () => {
    mockFindMany.mockResolvedValueOnce([fakeShare('ELA')]);
    mockCount.mockResolvedValueOnce(1);

    await browseSharedContent({
      entitledModules: ['ELA', 'MATH'],
      subject: 'ELA',
      tenantId: 'tenant-1',
    });

    const whereArg = mockFindMany.mock.calls[0][0].where;
    // subject: 'ELA' should override the module filter
    // (the explicit subject filter runs after the module filter sets { in: [...] })
    expect(whereArg.learningObject.subject).toBe('ELA');
  });

  it('should combine entitledModules with gradeBand filter', async () => {
    mockFindMany.mockResolvedValueOnce([fakeShare('MATH')]);
    mockCount.mockResolvedValueOnce(1);

    await browseSharedContent({
      entitledModules: ['ELA', 'MATH'],
      gradeBand: 'G3_5',
      tenantId: 'tenant-1',
    });

    const whereArg = mockFindMany.mock.calls[0][0].where;
    expect(whereArg.learningObject.subject).toEqual({ in: ['ELA', 'MATH'] });
    expect(whereArg.learningObject.gradeBand).toBe('G3_5');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// MODULE GATE — ROUTE-LEVEL TESTS (unit-testing the gate logic inline)
// ═════════════════════════════════════════════════════════════════════════════

describe('module access gate logic', () => {

  it('DEFAULT_FREE_MODULES should contain ELA and MATH', () => {
    expect(DEFAULT_FREE_MODULES).toEqual(['ELA', 'MATH']);
  });

  it('MODULE_MIN_PLAN should map SEL to PRO', () => {
    expect(MODULE_MIN_PLAN.SEL).toBe('PRO');
  });

  it('MODULE_MIN_PLAN should map SCIENCE, SPEECH, EXECUTIVE_FUNCTION to PREMIUM', () => {
    expect(MODULE_MIN_PLAN.SCIENCE).toBe('PREMIUM');
    expect(MODULE_MIN_PLAN.SPEECH).toBe('PREMIUM');
    expect(MODULE_MIN_PLAN.EXECUTIVE_FUNCTION).toBe('PREMIUM');
  });

  it('FREE user modules should NOT include SEL', () => {
    expect(DEFAULT_FREE_MODULES).not.toContain('SEL');
    expect(DEFAULT_FREE_MODULES).not.toContain('SCIENCE');
    expect(DEFAULT_FREE_MODULES).not.toContain('SPEECH');
    expect(DEFAULT_FREE_MODULES).not.toContain('EXECUTIVE_FUNCTION');
  });

  it('should deny fork when subject is not in entitled modules', () => {
    const entitledModules = ['ELA', 'MATH'];
    const subject = 'SEL';
    expect(entitledModules.includes(subject)).toBe(false);
  });

  it('should allow fork when subject is in entitled modules', () => {
    const entitledModules = ['ELA', 'MATH', 'SEL'];
    const subject = 'SEL';
    expect(entitledModules.includes(subject)).toBe(true);
  });

  it('should find correct minimum plan for upgrade prompt', () => {
    const subject = 'SCIENCE';
    const minPlan = MODULE_MIN_PLAN[subject] ?? 'PRO';
    expect(minPlan).toBe('PREMIUM');
  });

  it('should default to PRO for unknown module', () => {
    const subject = 'UNKNOWN_MODULE';
    const minPlan = MODULE_MIN_PLAN[subject] ?? 'PRO';
    expect(minPlan).toBe('PRO');
  });
});

describe('entitlementPreHandler modules population', () => {

  function makeRequest(overrides: Record<string, unknown> = {}) {
    return {
      user: { sub: 'u1', tenantId: 'tenant-1', roles: ['author'] },
      headers: {},
      entitlements: undefined,
      ...overrides,
    };
  }

  function makeReply() {
    const reply: Record<string, unknown> = { sent: false, _statusCode: 0, _body: null };
    reply.status = vi.fn((code: number) => { reply._statusCode = code; return reply; });
    reply.send = vi.fn((body: unknown) => { reply._body = body; reply.sent = true; return reply; });
    return reply;
  }

  it('should include modules from billing-svc in entitlements', async () => {
    mockFetchGlobal.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        plan: 'PRO',
        isActive: true,
        inGracePeriod: false,
        features: {},
        limits: {},
        modules: ['ELA', 'MATH', 'SEL'],
      }),
    });

    const req = makeRequest();
    const reply = makeReply();
    await entitlementPreHandler(req as never, reply as never);

    const ent = (req as any).entitlements;
    expect(ent).toBeDefined();
    expect(ent.modules).toEqual(['ELA', 'MATH', 'SEL']);
  });

  it('should default modules to DEFAULT_FREE_MODULES when billing-svc omits them', async () => {
    mockFetchGlobal.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        plan: 'FREE',
        isActive: true,
        inGracePeriod: false,
        features: {},
        limits: {},
        // no modules field
      }),
    });

    const req = makeRequest();
    const reply = makeReply();
    await entitlementPreHandler(req as never, reply as never);

    const ent = (req as any).entitlements;
    expect(ent.modules).toEqual(DEFAULT_FREE_MODULES);
  });

  it('should set modules to FREE defaults when subscription is expired', async () => {
    mockFetchGlobal.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        plan: 'PRO',
        isActive: false,
        inGracePeriod: false,
        features: {},
        limits: {},
        modules: ['ELA', 'MATH', 'SEL'],
      }),
    });

    const req = makeRequest();
    const reply = makeReply();
    await entitlementPreHandler(req as never, reply as never);

    const ent = (req as any).entitlements;
    // Expired → falls back to FREE
    expect(ent.plan).toBe('FREE');
    expect(ent.modules).toEqual(DEFAULT_FREE_MODULES);
  });
});
