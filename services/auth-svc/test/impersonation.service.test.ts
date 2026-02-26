import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImpersonationService, ImpersonationError } from '../src/services/impersonation.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════════════════════

function makePrisma(overrides: Record<string, any> = {}) {
  return {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    impersonationSession: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
    ...overrides,
  } as any;
}

const adminUser = {
  id: 'admin-1',
  email: 'admin@example.com',
  firstName: 'Admin',
  lastName: 'User',
  tenantId: 'tenant-1',
  roles: [{ role: 'PLATFORM_ADMIN' }],
};

const targetUser = {
  id: 'target-1',
  email: 'student@example.com',
  firstName: 'Jane',
  lastName: 'Student',
  tenantId: 'tenant-1',
  status: 'ACTIVE',
  roles: [{ role: 'STUDENT' }],
  lastLoginAt: new Date(),
};

const baseRequest = {
  adminUserId: 'admin-1',
  targetUserId: 'target-1',
  targetTenantId: 'tenant-1',
  reason: 'Debugging slow lesson load for student',
  durationMinutes: 30,
  readOnly: true,
};

// Mock signImpersonationToken
vi.mock('../src/lib/jwt.js', () => ({
  signImpersonationToken: vi.fn().mockResolvedValue('mock-impersonation-jwt'),
}));

// ══════════════════════════════════════════════════════════════════════════════
// Tests
// ══════════════════════════════════════════════════════════════════════════════

describe('ImpersonationService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let svc: ImpersonationService;

  beforeEach(() => {
    prisma = makePrisma();
    svc = new ImpersonationService(prisma);
  });

  // ── startSession ──────────────────────────────────────────────────────

  describe('startSession', () => {
    it('should create a session with valid inputs', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(adminUser)
        .mockResolvedValueOnce(targetUser);
      prisma.impersonationSession.create.mockResolvedValue({
        id: 'sess-1',
        ...baseRequest,
        readOnly: true,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        revokedAt: null,
        createdAt: new Date(),
      });

      const result = await svc.startSession(baseRequest);

      expect(result.id).toBe('sess-1');
      expect(result.token).toBe('mock-impersonation-jwt');
      expect(result.readOnly).toBe(true);
      expect(prisma.impersonationSession.create).toHaveBeenCalledOnce();
    });

    it('should reject duration > 60 minutes', async () => {
      await expect(
        svc.startSession({ ...baseRequest, durationMinutes: 120 }),
      ).rejects.toThrow(ImpersonationError);
    });

    it('should reject duration < 1 minute', async () => {
      await expect(
        svc.startSession({ ...baseRequest, durationMinutes: 0 }),
      ).rejects.toThrow(ImpersonationError);
    });

    it('should reject reason shorter than 10 chars', async () => {
      await expect(
        svc.startSession({ ...baseRequest, reason: 'short' }),
      ).rejects.toThrow(ImpersonationError);
    });

    it('should reject if admin user not found', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);
      await expect(svc.startSession(baseRequest)).rejects.toThrow('Admin user not found');
    });

    it('should reject if admin lacks PLATFORM_ADMIN or SUPPORT role', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        ...adminUser,
        roles: [{ role: 'TEACHER' }],
      });
      await expect(svc.startSession(baseRequest)).rejects.toThrow('Insufficient permissions');
    });

    it('should reject if target user not found', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(adminUser)
        .mockResolvedValueOnce(null);
      await expect(svc.startSession(baseRequest)).rejects.toThrow('Target user not found');
    });

    it('should reject impersonating another PLATFORM_ADMIN', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(adminUser)
        .mockResolvedValueOnce({ ...targetUser, roles: [{ role: 'PLATFORM_ADMIN' }] });
      await expect(svc.startSession(baseRequest)).rejects.toThrow('Cannot impersonate platform administrators');
    });

    it('should reject tenant mismatch', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(adminUser)
        .mockResolvedValueOnce({ ...targetUser, tenantId: 'other-tenant' });
      await expect(svc.startSession(baseRequest)).rejects.toThrow('does not belong to the specified tenant');
    });
  });

  // ── revokeSession ─────────────────────────────────────────────────────

  describe('revokeSession', () => {
    it('should revoke an active session', async () => {
      prisma.impersonationSession.findUnique.mockResolvedValue({
        id: 'sess-1',
        revokedAt: null,
      });

      await svc.revokeSession('sess-1', 'admin-1', 'No longer needed');

      expect(prisma.impersonationSession.update).toHaveBeenCalledWith({
        where: { id: 'sess-1' },
        data: expect.objectContaining({ revokeReason: 'No longer needed' }),
      });
    });

    it('should throw if session not found', async () => {
      prisma.impersonationSession.findUnique.mockResolvedValue(null);
      await expect(svc.revokeSession('bad-id', 'admin-1')).rejects.toThrow('Session not found');
    });

    it('should throw if session already revoked', async () => {
      prisma.impersonationSession.findUnique.mockResolvedValue({
        id: 'sess-1',
        revokedAt: new Date(),
      });
      await expect(svc.revokeSession('sess-1', 'admin-1')).rejects.toThrow('already revoked');
    });
  });

  // ── validateSession ───────────────────────────────────────────────────

  describe('validateSession', () => {
    it('should return valid for active, non-expired session', async () => {
      prisma.impersonationSession.findUnique.mockResolvedValue({
        id: 'sess-1',
        adminUserId: 'admin-1',
        targetUserId: 'target-1',
        targetTenantId: 'tenant-1',
        reason: 'debugging',
        readOnly: true,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        revokedAt: null,
        createdAt: new Date(),
      });
      prisma.user.findUnique
        .mockResolvedValueOnce({ email: 'admin@example.com' })
        .mockResolvedValueOnce({ email: 'student@example.com' });

      const result = await svc.validateSession('sess-1');
      expect(result.valid).toBe(true);
      expect(result.session).toBeDefined();
    });

    it('should return invalid for revoked session', async () => {
      prisma.impersonationSession.findUnique.mockResolvedValue({
        id: 'sess-1',
        adminUserId: 'admin-1',
        targetUserId: 'target-1',
        targetTenantId: 'tenant-1',
        reason: 'debugging',
        readOnly: true,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        revokedAt: new Date(),
        createdAt: new Date(),
      });
      prisma.user.findUnique
        .mockResolvedValueOnce({ email: 'admin@example.com' })
        .mockResolvedValueOnce({ email: 'student@example.com' });

      const result = await svc.validateSession('sess-1');
      expect(result.valid).toBe(false);
    });

    it('should return invalid for expired session', async () => {
      prisma.impersonationSession.findUnique.mockResolvedValue({
        id: 'sess-1',
        adminUserId: 'admin-1',
        targetUserId: 'target-1',
        targetTenantId: 'tenant-1',
        reason: 'debugging',
        readOnly: true,
        expiresAt: new Date(Date.now() - 10 * 60 * 1000), // expired
        revokedAt: null,
        createdAt: new Date(),
      });
      prisma.user.findUnique
        .mockResolvedValueOnce({ email: 'admin@example.com' })
        .mockResolvedValueOnce({ email: 'student@example.com' });

      const result = await svc.validateSession('sess-1');
      expect(result.valid).toBe(false);
    });

    it('should return invalid for non-existent session', async () => {
      prisma.impersonationSession.findUnique.mockResolvedValue(null);
      const result = await svc.validateSession('no-such-sess');
      expect(result.valid).toBe(false);
    });
  });

  // ── searchUsers ───────────────────────────────────────────────────────

  describe('searchUsers', () => {
    it('should search by UUID', async () => {
      prisma.user.findMany.mockResolvedValue([
        { ...targetUser, lastLoginAt: new Date() },
      ]);

      const results = await svc.searchUsers('550e8400-e29b-41d4-a716-446655440000');
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '550e8400-e29b-41d4-a716-446655440000' },
        }),
      );
      expect(results).toHaveLength(1);
    });

    it('should search by name/email substring', async () => {
      prisma.user.findMany.mockResolvedValue([]);

      await svc.searchUsers('jane');
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: expect.arrayContaining([
              expect.objectContaining({ email: expect.any(Object) }),
              expect.objectContaining({ firstName: expect.any(Object) }),
            ]),
          },
        }),
      );
    });
  });
});
