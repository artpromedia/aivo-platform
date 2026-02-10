import { describe, it, expect } from 'vitest';
import {
  isAuthenticated,
  hasRole,
  hasAnyRole,
  hasAllRoles,
  hasPermission,
  hasAnyPermission,
  sameTenant,
  isOwner,
  ownerOrRole,
  allGuards,
  anyGuard,
  isPlatformAdmin,
  isDistrictAdmin,
  isTeacher,
  isParent,
  isLearner,
  hasVerifiedEmail,
} from '../src/auth/guards.js';

/**
 * Helper to create a mock AuthenticatedRequest
 */
function mockReq(user?: {
  sub?: string;
  roles?: string[];
  permissions?: string[];
  tenantId?: string;
}): any {
  return { user: user ?? undefined } as any;
}

describe('auth guards', () => {
  describe('isAuthenticated', () => {
    it('returns true when user exists', () => {
      expect(isAuthenticated(mockReq({ sub: 'u1' }))).toBe(true);
    });

    it('returns false when user is missing', () => {
      expect(isAuthenticated(mockReq())).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('returns true when user has the role', () => {
      const guard = hasRole('TEACHER');
      expect(guard(mockReq({ roles: ['TEACHER', 'PARENT'] }))).toBe(true);
    });

    it('returns false when user lacks the role', () => {
      const guard = hasRole('PLATFORM_ADMIN');
      expect(guard(mockReq({ roles: ['TEACHER'] }))).toBe(false);
    });

    it('returns false when roles is undefined', () => {
      const guard = hasRole('TEACHER');
      expect(guard(mockReq({ sub: 'u1' }))).toBe(false);
    });
  });

  describe('hasAnyRole', () => {
    it('returns true when user has one of the roles', () => {
      const guard = hasAnyRole('ADMIN', 'TEACHER');
      expect(guard(mockReq({ roles: ['TEACHER'] }))).toBe(true);
    });

    it('returns false when user has none of the roles', () => {
      const guard = hasAnyRole('ADMIN', 'PLATFORM_ADMIN');
      expect(guard(mockReq({ roles: ['LEARNER'] }))).toBe(false);
    });
  });

  describe('hasAllRoles', () => {
    it('returns true when user has all roles', () => {
      const guard = hasAllRoles('TEACHER', 'PARENT');
      expect(guard(mockReq({ roles: ['TEACHER', 'PARENT', 'ADMIN'] }))).toBe(true);
    });

    it('returns false when user is missing one role', () => {
      const guard = hasAllRoles('TEACHER', 'ADMIN');
      expect(guard(mockReq({ roles: ['TEACHER'] }))).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('returns true for direct permission match', () => {
      const guard = hasPermission('lessons:create');
      expect(guard(mockReq({ permissions: ['lessons:create', 'lessons:read'] }))).toBe(true);
    });

    it('returns true for wildcard * permission', () => {
      const guard = hasPermission('anything:here');
      expect(guard(mockReq({ permissions: ['*'] }))).toBe(true);
    });

    it('returns true for resource wildcard', () => {
      const guard = hasPermission('lessons:delete');
      expect(guard(mockReq({ permissions: ['lessons:*'] }))).toBe(true);
    });

    it('returns false for non-matching permission', () => {
      const guard = hasPermission('admin:manage');
      expect(guard(mockReq({ permissions: ['lessons:read'] }))).toBe(false);
    });

    it('returns false when no permissions', () => {
      const guard = hasPermission('lessons:read');
      expect(guard(mockReq({ sub: 'u1' }))).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('returns true when user has one of the permissions', () => {
      const guard = hasAnyPermission('lessons:read', 'admin:manage');
      expect(guard(mockReq({ permissions: ['lessons:read'] }))).toBe(true);
    });

    it('returns false when user has none', () => {
      const guard = hasAnyPermission('admin:manage', 'admin:delete');
      expect(guard(mockReq({ permissions: ['lessons:read'] }))).toBe(false);
    });
  });

  describe('sameTenant', () => {
    it('allows when tenant matches', () => {
      const guard = sameTenant((req) => req.headers?.['x-tenant-id'] as string);
      const req = mockReq({ tenantId: 'tenant-1' });
      req.headers = { 'x-tenant-id': 'tenant-1' };
      expect(guard(req)).toBe(true);
    });

    it('allows platform admin for any tenant', () => {
      const guard = sameTenant(() => 'other-tenant');
      expect(guard(mockReq({ tenantId: 'my-tenant', roles: ['PLATFORM_ADMIN'] }))).toBe(true);
    });

    it('denies when tenant does not match', () => {
      const guard = sameTenant(() => 'other-tenant');
      expect(guard(mockReq({ tenantId: 'my-tenant', roles: ['TEACHER'] }))).toBe(false);
    });

    it('allows when no resource tenant', () => {
      const guard = sameTenant(() => undefined);
      expect(guard(mockReq({ tenantId: 'my-tenant' }))).toBe(true);
    });
  });

  describe('isOwner', () => {
    it('returns true when user sub matches owner', () => {
      const guard = isOwner(() => 'user-abc');
      expect(guard(mockReq({ sub: 'user-abc' }))).toBe(true);
    });

    it('returns false when user sub does not match', () => {
      const guard = isOwner(() => 'user-other');
      expect(guard(mockReq({ sub: 'user-abc' }))).toBe(false);
    });

    it('returns false when ownerId is undefined', () => {
      const guard = isOwner(() => undefined);
      expect(guard(mockReq({ sub: 'user-abc' }))).toBe(false);
    });
  });

  describe('ownerOrRole', () => {
    it('allows owner', async () => {
      const guard = ownerOrRole(() => 'user-1', 'ADMIN');
      expect(await guard(mockReq({ sub: 'user-1' }))).toBe(true);
    });

    it('allows role', async () => {
      const guard = ownerOrRole(() => 'user-2', 'ADMIN');
      expect(await guard(mockReq({ sub: 'user-1', roles: ['ADMIN'] }))).toBe(true);
    });

    it('denies when neither owner nor role', async () => {
      const guard = ownerOrRole(() => 'user-2', 'ADMIN');
      expect(await guard(mockReq({ sub: 'user-1', roles: ['LEARNER'] }))).toBe(false);
    });
  });

  describe('allGuards', () => {
    it('passes when all guards pass', async () => {
      const combined = allGuards(isAuthenticated, hasRole('TEACHER'));
      expect(await combined(mockReq({ sub: 'u1', roles: ['TEACHER'] }))).toBe(true);
    });

    it('fails when any guard fails', async () => {
      const combined = allGuards(isAuthenticated, hasRole('ADMIN'));
      expect(await combined(mockReq({ sub: 'u1', roles: ['TEACHER'] }))).toBe(false);
    });
  });

  describe('anyGuard', () => {
    it('passes when any guard passes', async () => {
      const combined = anyGuard(hasRole('ADMIN'), hasRole('TEACHER'));
      expect(await combined(mockReq({ roles: ['TEACHER'] }))).toBe(true);
    });

    it('fails when all guards fail', async () => {
      const combined = anyGuard(hasRole('ADMIN'), hasRole('PLATFORM_ADMIN'));
      expect(await combined(mockReq({ roles: ['TEACHER'] }))).toBe(false);
    });
  });

  describe('role preset guards', () => {
    it('isPlatformAdmin requires PLATFORM_ADMIN role', () => {
      expect(isPlatformAdmin(mockReq({ roles: ['PLATFORM_ADMIN'] }))).toBe(true);
      expect(isPlatformAdmin(mockReq({ roles: ['TEACHER'] }))).toBe(false);
    });

    it('isDistrictAdmin allows DISTRICT_ADMIN or PLATFORM_ADMIN', async () => {
      expect(await isDistrictAdmin(mockReq({ roles: ['DISTRICT_ADMIN'] }))).toBe(true);
      expect(await isDistrictAdmin(mockReq({ roles: ['PLATFORM_ADMIN'] }))).toBe(true);
      expect(await isDistrictAdmin(mockReq({ roles: ['TEACHER'] }))).toBe(false);
    });

    it('isTeacher allows TEACHER, DISTRICT_ADMIN, or PLATFORM_ADMIN', async () => {
      expect(await isTeacher(mockReq({ roles: ['TEACHER'] }))).toBe(true);
      expect(await isTeacher(mockReq({ roles: ['PLATFORM_ADMIN'] }))).toBe(true);
      expect(await isTeacher(mockReq({ roles: ['LEARNER'] }))).toBe(false);
    });

    it('isParent requires PARENT role', () => {
      expect(isParent(mockReq({ roles: ['PARENT'] }))).toBe(true);
      expect(isParent(mockReq({ roles: ['TEACHER'] }))).toBe(false);
    });

    it('isLearner requires LEARNER role', () => {
      expect(isLearner(mockReq({ roles: ['LEARNER'] }))).toBe(true);
      expect(isLearner(mockReq({ roles: ['TEACHER'] }))).toBe(false);
    });
  });

  describe('hasVerifiedEmail', () => {
    it('always returns true (stub)', () => {
      expect(hasVerifiedEmail(mockReq({ sub: 'u1' }))).toBe(true);
    });
  });
});
