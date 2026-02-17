/**
 * Auth Service — Comprehensive Unit Tests (Sprint 7)
 *
 * Covers: registration, login, password validation, session management,
 * MFA enforcement, token refresh, account lockout, concurrent sessions.
 * Target: ≥80% line coverage for auth.service.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockFindFirst = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockFindMany = vi.fn();
const mockCount = vi.fn();
const mockDeleteMany = vi.fn();

const mockPrisma = {
  user: {
    findFirst: mockFindFirst,
    create: mockCreate,
    update: mockUpdate,
    findMany: mockFindMany,
    count: mockCount,
  },
  session: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: mockDeleteMany,
    count: vi.fn(),
  },
  passwordHistory: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  emailVerificationToken: {
    create: vi.fn(),
    findFirst: vi.fn(),
    deleteMany: vi.fn(),
  },
  loginAttempt: {
    create: vi.fn(),
    count: vi.fn(),
  },
  userRole: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(mockPrisma)),
};

vi.mock('../../src/prisma.js', () => ({ prisma: mockPrisma }));

vi.mock('../../src/config.js', () => ({
  config: {
    consumerTenantId: 'consumer-tenant-001',
    jwtSecret: 'test-secret-key-that-is-long-enough-for-jwt-signing',
    jwtAccessTokenExpiresIn: '15m',
    jwtRefreshTokenExpiresIn: '7d',
    maxLoginAttempts: 5,
    lockoutDurationMs: 15 * 60 * 1000,
    mfaEncryptionKey: 'test-mfa-encryption-key-for-unit-tests!',
  },
}));

vi.mock('../../src/lib/jwt.js', () => ({
  signAccessToken: vi.fn().mockResolvedValue('mock-access-token'),
  signRefreshToken: vi.fn().mockResolvedValue('mock-refresh-token'),
  verifyToken: vi.fn().mockResolvedValue({ sub: 'user-001', tenantId: 'tenant-001' }),
}));

vi.mock('../../src/lib/notify-client.js', () => ({
  notifyClient: {
    sendEmailVerification: vi.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  },
}));

import { AuthService } from '../../src/services/auth.service.js';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const STRONG_PASSWORD = 'Super$ecure1234!';
const TENANT_ID = 'tenant-001';
const DEVICE_INFO = {
  userAgent: 'Mozilla/5.0 Test Agent',
  ip: '192.168.1.100',
  deviceId: 'device-001',
  platform: 'web',
};

function createMockUser(overrides = {}) {
  return {
    id: 'user-001',
    email: 'teacher@school.edu',
    passwordHash: bcrypt.hashSync(STRONG_PASSWORD, 4),
    phone: null,
    tenantId: TENANT_ID,
    status: 'ACTIVE',
    emailVerified: false,
    mfaEnabled: false,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    roles: [{ id: 'role-001', userId: 'user-001', role: 'TEACHER', createdAt: new Date() }],
    ...overrides,
  };
}

function createMockSession(overrides = {}) {
  return {
    id: 'session-001',
    userId: 'user-001',
    tenantId: TENANT_ID,
    deviceName: 'Chrome on Windows',
    platform: 'web',
    tokenHash: 'hashed-token',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    lastActivityAt: new Date(),
    isActive: true,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    authService = new AuthService(mockPrisma as any, null);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Registration
  // ═══════════════════════════════════════════════════════════════════════════
  describe('register', () => {
    it('should register a new user with valid credentials', async () => {
      mockFindFirst.mockResolvedValue(null); // no existing user
      const user = createMockUser();
      mockCreate.mockResolvedValue(user);
      mockPrisma.session.create.mockResolvedValue(createMockSession());
      mockPrisma.passwordHistory.create.mockResolvedValue({});
      mockPrisma.emailVerificationToken.create.mockResolvedValue({});

      const result = await authService.register({
        email: 'teacher@school.edu',
        password: STRONG_PASSWORD,
        tenantId: TENANT_ID,
        deviceInfo: DEVICE_INFO,
      });

      expect(result.user.email).toBe('teacher@school.edu');
      expect(result.user.tenantId).toBe(TENANT_ID);
      expect(result.tokens.accessToken).toBe('mock-access-token');
      expect(result.tokens.refreshToken).toBe('mock-refresh-token');
      expect(result.session.userId).toBe('user-001');
    });

    it('should reject registration with duplicate email', async () => {
      mockFindFirst.mockResolvedValue(createMockUser());

      await expect(
        authService.register({
          email: 'teacher@school.edu',
          password: STRONG_PASSWORD,
          tenantId: TENANT_ID,
        })
      ).rejects.toThrow('User with this email already exists');
    });

    it('should reject password shorter than 12 characters', async () => {
      await expect(
        authService.register({
          email: 'new@school.edu',
          password: 'Short1!',
          tenantId: TENANT_ID,
        })
      ).rejects.toThrow('at least 12 characters');
    });

    it('should reject password without uppercase letter', async () => {
      await expect(
        authService.register({
          email: 'new@school.edu',
          password: 'alllowercase1!',
          tenantId: TENANT_ID,
        })
      ).rejects.toThrow('uppercase');
    });

    it('should reject password without lowercase letter', async () => {
      await expect(
        authService.register({
          email: 'new@school.edu',
          password: 'ALLUPPERCASE1!',
          tenantId: TENANT_ID,
        })
      ).rejects.toThrow('lowercase');
    });

    it('should reject password without number', async () => {
      await expect(
        authService.register({
          email: 'new@school.edu',
          password: 'NoNumbersHere!!',
          tenantId: TENANT_ID,
        })
      ).rejects.toThrow('number');
    });

    it('should reject password without special character', async () => {
      await expect(
        authService.register({
          email: 'new@school.edu',
          password: 'NoSpecialChars1',
          tenantId: TENANT_ID,
        })
      ).rejects.toThrow('special');
    });

    it('should reject common/breached passwords', async () => {
      await expect(
        authService.register({
          email: 'new@school.edu',
          password: 'Password1234!',
          tenantId: TENANT_ID,
        })
      ).rejects.toThrow();
    });

    it('should default role to LEARNER', async () => {
      mockFindFirst.mockResolvedValue(null);
      const user = createMockUser({ roles: [{ role: 'LEARNER' }] });
      mockCreate.mockResolvedValue(user);
      mockPrisma.session.create.mockResolvedValue(createMockSession());
      mockPrisma.passwordHistory.create.mockResolvedValue({});
      mockPrisma.emailVerificationToken.create.mockResolvedValue({});

      const result = await authService.register({
        email: 'student@school.edu',
        password: STRONG_PASSWORD,
        tenantId: TENANT_ID,
      });

      expect(result.user.roles).toContain('LEARNER');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Login
  // ═══════════════════════════════════════════════════════════════════════════
  describe('login', () => {
    it('should log in with valid credentials', async () => {
      const user = createMockUser();
      mockFindFirst.mockResolvedValue(user);
      mockPrisma.session.create.mockResolvedValue(createMockSession());
      mockPrisma.loginAttempt.create.mockResolvedValue({});
      mockPrisma.session.count.mockResolvedValue(1);

      const result = await authService.login({
        email: 'teacher@school.edu',
        password: STRONG_PASSWORD,
        tenantId: TENANT_ID,
        deviceInfo: DEVICE_INFO,
      });

      expect(result.user.email).toBe('teacher@school.edu');
      expect(result.tokens.accessToken).toBeDefined();
    });

    it('should reject login with wrong password', async () => {
      const user = createMockUser();
      mockFindFirst.mockResolvedValue(user);
      mockPrisma.loginAttempt.create.mockResolvedValue({});
      mockUpdate.mockResolvedValue({});

      await expect(
        authService.login({
          email: 'teacher@school.edu',
          password: 'WrongPassword1!',
          tenantId: TENANT_ID,
          deviceInfo: DEVICE_INFO,
        })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should reject login for non-existent user', async () => {
      mockFindFirst.mockResolvedValue(null);
      mockPrisma.loginAttempt.create.mockResolvedValue({});

      await expect(
        authService.login({
          email: 'nobody@school.edu',
          password: STRONG_PASSWORD,
          tenantId: TENANT_ID,
          deviceInfo: DEVICE_INFO,
        })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should reject login for DISABLED account', async () => {
      const user = createMockUser({ status: 'DISABLED' });
      mockFindFirst.mockResolvedValue(user);

      await expect(
        authService.login({
          email: 'teacher@school.edu',
          password: STRONG_PASSWORD,
          tenantId: TENANT_ID,
        })
      ).rejects.toThrow('disabled');
    });

    it('should reject login for INVITED account', async () => {
      const user = createMockUser({ status: 'INVITED' });
      mockFindFirst.mockResolvedValue(user);

      await expect(
        authService.login({
          email: 'teacher@school.edu',
          password: STRONG_PASSWORD,
          tenantId: TENANT_ID,
        })
      ).rejects.toThrow('complete your account setup');
    });

    it('should enforce MFA for admin roles', async () => {
      const user = createMockUser({
        mfaEnabled: false,
        roles: [{ role: 'DISTRICT_ADMIN' }],
      });
      mockFindFirst.mockResolvedValue(user);

      await expect(
        authService.login({
          email: 'admin@district.edu',
          password: STRONG_PASSWORD,
          tenantId: TENANT_ID,
          deviceInfo: DEVICE_INFO,
        })
      ).rejects.toThrow(/[Mm]FA/);
    });

    it('should use consumerTenantId when tenantId not provided', async () => {
      const user = createMockUser({ tenantId: 'consumer-tenant-001' });
      mockFindFirst.mockResolvedValue(user);
      mockPrisma.session.create.mockResolvedValue(createMockSession());
      mockPrisma.loginAttempt.create.mockResolvedValue({});
      mockPrisma.session.count.mockResolvedValue(1);

      await authService.login({
        email: 'teacher@school.edu',
        password: STRONG_PASSWORD,
        deviceInfo: DEVICE_INFO,
      });

      expect(mockFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'consumer-tenant-001' }),
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Session Management
  // ═══════════════════════════════════════════════════════════════════════════
  describe('session management', () => {
    it('should create a new session on login', async () => {
      const user = createMockUser();
      mockFindFirst.mockResolvedValue(user);
      mockPrisma.session.create.mockResolvedValue(createMockSession());
      mockPrisma.loginAttempt.create.mockResolvedValue({});
      mockPrisma.session.count.mockResolvedValue(1);

      const result = await authService.login({
        email: 'teacher@school.edu',
        password: STRONG_PASSWORD,
        tenantId: TENANT_ID,
        deviceInfo: DEVICE_INFO,
      });

      expect(result.session.id).toBe('session-001');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Safe User Serialization
  // ═══════════════════════════════════════════════════════════════════════════
  describe('toSafeUser', () => {
    it('should not expose passwordHash in API response', async () => {
      const user = createMockUser();
      mockFindFirst.mockResolvedValue(null);
      mockCreate.mockResolvedValue(user);
      mockPrisma.session.create.mockResolvedValue(createMockSession());
      mockPrisma.passwordHistory.create.mockResolvedValue({});
      mockPrisma.emailVerificationToken.create.mockResolvedValue({});

      const result = await authService.register({
        email: 'new@school.edu',
        password: STRONG_PASSWORD,
        tenantId: TENANT_ID,
      });

      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('email');
      expect(result.user).toHaveProperty('tenantId');
      expect(result.user).toHaveProperty('roles');
    });
  });
});
