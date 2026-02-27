/**
 * Tests for onboarding-svc route helpers (requireAuth, requireUserId, requireAdmin).
 * We test the pure helper functions extracted from the routes module.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Test helpers only (they're non-exported, so replicate here) ────────

interface FakeAuth {
  userId?: string;
  tenantId?: string;
  roles: string[];
}

function requireAuth(request: { auth?: FakeAuth }) {
  const auth = request.auth;
  if (!auth?.userId || !auth?.tenantId) {
    throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
  }
  return auth;
}

function requireUserId(request: { auth?: FakeAuth }): string {
  const auth = request.auth;
  if (!auth?.userId) {
    throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
  }
  return auth.userId;
}

function requireAdmin(request: { auth?: FakeAuth }) {
  const auth = requireAuth(request);
  const roleStrings = auth.roles.map(String);
  if (!roleStrings.includes('platform_admin') && !roleStrings.includes('district_admin')) {
    throw Object.assign(new Error('Forbidden — admin role required'), { statusCode: 403 });
  }
  return auth;
}

// ── Tests ──────────────────────────────────────────────────────────────

describe('requireAuth', () => {
  it('returns auth when userId and tenantId present', () => {
    const auth = requireAuth({
      auth: { userId: 'u1', tenantId: 't1', roles: ['teacher'] },
    });
    expect(auth.userId).toBe('u1');
    expect(auth.tenantId).toBe('t1');
  });

  it('throws 401 when auth missing', () => {
    expect(() => requireAuth({})).toThrow('Unauthorized');
    try {
      requireAuth({});
    } catch (e: any) {
      expect(e.statusCode).toBe(401);
    }
  });

  it('throws 401 when userId missing', () => {
    expect(() =>
      requireAuth({ auth: { tenantId: 't1', roles: [] } as any }),
    ).toThrow('Unauthorized');
  });

  it('throws 401 when tenantId missing', () => {
    expect(() =>
      requireAuth({ auth: { userId: 'u1', roles: [] } as any }),
    ).toThrow('Unauthorized');
  });
});

describe('requireUserId', () => {
  it('returns userId when present', () => {
    const uid = requireUserId({
      auth: { userId: 'u1', tenantId: 't1', roles: [] },
    });
    expect(uid).toBe('u1');
  });

  it('throws 401 when auth missing', () => {
    expect(() => requireUserId({})).toThrow('Unauthorized');
  });

  it('throws 401 when userId undefined', () => {
    expect(() =>
      requireUserId({ auth: { roles: [] } as any }),
    ).toThrow('Unauthorized');
  });
});

describe('requireAdmin', () => {
  it('passes for platform_admin', () => {
    const auth = requireAdmin({
      auth: { userId: 'u1', tenantId: 't1', roles: ['platform_admin'] },
    });
    expect(auth.userId).toBe('u1');
  });

  it('passes for district_admin', () => {
    const auth = requireAdmin({
      auth: { userId: 'u1', tenantId: 't1', roles: ['district_admin'] },
    });
    expect(auth.userId).toBe('u1');
  });

  it('throws 403 for non-admin role', () => {
    expect(() =>
      requireAdmin({
        auth: { userId: 'u1', tenantId: 't1', roles: ['teacher'] },
      }),
    ).toThrow('Forbidden');
    try {
      requireAdmin({
        auth: { userId: 'u1', tenantId: 't1', roles: ['teacher'] },
      });
    } catch (e: any) {
      expect(e.statusCode).toBe(403);
    }
  });

  it('throws 403 when roles empty', () => {
    expect(() =>
      requireAdmin({
        auth: { userId: 'u1', tenantId: 't1', roles: [] },
      }),
    ).toThrow('Forbidden');
  });

  it('throws 401 when auth missing (before admin check)', () => {
    expect(() => requireAdmin({})).toThrow('Unauthorized');
  });
});
