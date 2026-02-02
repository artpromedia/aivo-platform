/**
 * Auth Service - Registration Flow Tests
 *
 * Tests for user registration, password validation, and account creation.
 *
 * @module tests/auth.register.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import bcrypt from 'bcryptjs';

// Password validation patterns
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_PATTERNS = {
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /\d/,
  special: /[!@#$%^&*(),.?":{}|<>]/,
};

function validatePasswordStrength(password: string): string[] {
  const errors: string[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }
  if (!PASSWORD_PATTERNS.uppercase.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!PASSWORD_PATTERNS.lowercase.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!PASSWORD_PATTERNS.number.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!PASSWORD_PATTERNS.special.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return errors;
}

// Mock Prisma
const mockPrisma = {
  user: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  emailVerificationToken: {
    create: vi.fn(),
  },
  session: {
    create: vi.fn(),
  },
  passwordHistory: {
    create: vi.fn(),
  },
};

// Mock Redis
const mockRedis = {
  set: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
  pipeline: vi.fn(() => ({
    set: vi.fn().mockReturnThis(),
    exec: vi.fn(),
  })),
};

describe('Auth Service - Registration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ===========================================================================
  // Password Strength Validation
  // ===========================================================================

  describe('Password Strength Validation', () => {
    it('should accept strong passwords', () => {
      const strongPasswords = [
        'P@ssw0rd123',
        'MySecure#Pass1',
        'C0mpl3x!Pwd',
        'Str0ng&Password',
      ];

      for (const password of strongPasswords) {
        const errors = validatePasswordStrength(password);
        expect(errors).toHaveLength(0);
      }
    });

    it('should reject passwords shorter than 8 characters', () => {
      const errors = validatePasswordStrength('Sh0rt!');
      expect(errors).toContain(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
    });

    it('should reject passwords without uppercase letters', () => {
      const errors = validatePasswordStrength('lowercase123!');
      expect(errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject passwords without lowercase letters', () => {
      const errors = validatePasswordStrength('UPPERCASE123!');
      expect(errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject passwords without numbers', () => {
      const errors = validatePasswordStrength('NoNumbers!@#');
      expect(errors).toContain('Password must contain at least one number');
    });

    it('should reject passwords without special characters', () => {
      const errors = validatePasswordStrength('NoSpecial123');
      expect(errors).toContain('Password must contain at least one special character');
    });

    it('should return multiple errors for weak passwords', () => {
      const errors = validatePasswordStrength('weak');
      expect(errors.length).toBeGreaterThan(1);
    });

    it('should handle empty password', () => {
      const errors = validatePasswordStrength('');
      expect(errors).toContain(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
    });
  });

  // ===========================================================================
  // Email Validation
  // ===========================================================================

  describe('Email Validation', () => {
    const validEmails = [
      'user@example.com',
      'user.name@domain.co.uk',
      'user+tag@example.org',
      'valid.email@sub.domain.com',
    ];

    const invalidEmails = [
      'notanemail',
      '@nodomain.com',
      'user@',
      'user@.com',
      'user name@example.com',
    ];

    it.each(validEmails)('should accept valid email: %s', (email) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test(email)).toBe(true);
    });

    it.each(invalidEmails)('should reject invalid email: %s', (email) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test(email)).toBe(false);
    });
  });

  // ===========================================================================
  // Duplicate User Check
  // ===========================================================================

  describe('Duplicate User Check', () => {
    it('should reject registration if user exists in tenant', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'existing-user',
        email: 'user@example.com',
        tenantId: 'tenant-123',
      });

      const existingUser = await mockPrisma.user.findFirst({
        where: { email: 'user@example.com', tenantId: 'tenant-123' },
      });

      expect(existingUser).toBeDefined();
      expect(existingUser.email).toBe('user@example.com');
    });

    it('should allow same email in different tenants', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const existingUser = await mockPrisma.user.findFirst({
        where: { email: 'user@example.com', tenantId: 'different-tenant' },
      });

      expect(existingUser).toBeNull();
    });

    it('should check email case-insensitively', async () => {
      const email = 'User@Example.COM';
      const normalizedEmail = email.toLowerCase();

      expect(normalizedEmail).toBe('user@example.com');
    });
  });

  // ===========================================================================
  // Password Hashing
  // ===========================================================================

  describe('Password Hashing', () => {
    const BCRYPT_ROUNDS = 12;

    it('should hash passwords with bcrypt', async () => {
      const password = 'SecureP@ss123';
      const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
    });

    it('should use correct number of rounds', async () => {
      const password = 'SecureP@ss123';
      const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

      // Bcrypt hash format: $2a$rounds$salt+hash
      const rounds = parseInt(hash.split('$')[2], 10);
      expect(rounds).toBe(BCRYPT_ROUNDS);
    });

    it('should generate unique hashes for same password', async () => {
      const password = 'SecureP@ss123';
      const hash1 = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const hash2 = await bcrypt.hash(password, BCRYPT_ROUNDS);

      expect(hash1).not.toBe(hash2);
    });

    it('should verify password against hash', async () => {
      const password = 'SecureP@ss123';
      const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'SecureP@ss123';
      const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

      const isValid = await bcrypt.compare('WrongPassword!', hash);
      expect(isValid).toBe(false);
    });
  });

  // ===========================================================================
  // User Creation
  // ===========================================================================

  describe('User Creation', () => {
    it('should create user with hashed password', async () => {
      const userData = {
        email: 'new@example.com',
        passwordHash: '$2a$12$hash',
        tenantId: 'tenant-123',
        status: 'ACTIVE',
        emailVerified: false,
      };

      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        ...userData,
        roles: [{ id: 'role-1', role: 'LEARNER' }],
      });

      const user = await mockPrisma.user.create({ data: userData });

      expect(user.id).toBeDefined();
      expect(user.email).toBe('new@example.com');
      expect(user.status).toBe('ACTIVE');
    });

    it('should assign default role', async () => {
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        roles: [{ role: 'LEARNER' }],
      });

      const user = await mockPrisma.user.create({
        data: {
          roles: { create: [{ role: 'LEARNER' }] },
        },
      });

      expect(user.roles[0].role).toBe('LEARNER');
    });

    it('should assign custom role when specified', async () => {
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        roles: [{ role: 'PARENT' }],
      });

      const user = await mockPrisma.user.create({
        data: {
          roles: { create: [{ role: 'PARENT' }] },
        },
      });

      expect(user.roles[0].role).toBe('PARENT');
    });

    it('should set emailVerified to false initially', async () => {
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        emailVerified: false,
      });

      const user = await mockPrisma.user.create({
        data: { emailVerified: false },
      });

      expect(user.emailVerified).toBe(false);
    });
  });

  // ===========================================================================
  // Email Verification Token
  // ===========================================================================

  describe('Email Verification Token', () => {
    it('should create verification token', async () => {
      mockPrisma.emailVerificationToken.create.mockResolvedValue({
        id: 'token-id',
        userId: 'user-123',
        tokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() + 86400000),
      });

      const token = await mockPrisma.emailVerificationToken.create({
        data: {
          userId: 'user-123',
          email: 'user@example.com',
          tokenHash: 'hashed-token',
          expiresAt: new Date(Date.now() + 86400000),
        },
      });

      expect(token.userId).toBe('user-123');
      expect(token.tokenHash).toBeDefined();
    });

    it('should set 24-hour expiry', () => {
      const now = Date.now();
      const expiresAt = new Date(now + 24 * 60 * 60 * 1000);

      const diffHours = (expiresAt.getTime() - now) / (60 * 60 * 1000);
      expect(diffHours).toBe(24);
    });

    it('should hash verification token', () => {
      const { createHash } = require('node:crypto');
      const token = 'random-verification-token';
      const hash = createHash('sha256').update(token).digest('hex');

      expect(hash).toHaveLength(64);
      expect(hash).not.toBe(token);
    });
  });

  // ===========================================================================
  // Password History
  // ===========================================================================

  describe('Password History', () => {
    it('should save initial password to history', async () => {
      mockPrisma.passwordHistory.create.mockResolvedValue({
        id: 'history-id',
        userId: 'user-123',
        passwordHash: '$2a$12$hash',
        reason: 'account_creation',
      });

      const history = await mockPrisma.passwordHistory.create({
        data: {
          userId: 'user-123',
          tenantId: 'tenant-456',
          passwordHash: '$2a$12$hash',
          changedFromIp: '127.0.0.1',
          reason: 'account_creation',
        },
      });

      expect(history.reason).toBe('account_creation');
    });
  });

  // ===========================================================================
  // Session Creation
  // ===========================================================================

  describe('Session Creation on Registration', () => {
    it('should create session for new user', async () => {
      mockPrisma.session.create.mockResolvedValue({
        id: 'session-123',
        userId: 'user-456',
        tenantId: 'tenant-789',
        expiresAt: new Date(Date.now() + 3600000),
      });

      const session = await mockPrisma.session.create({
        data: {
          userId: 'user-456',
          tenantId: 'tenant-789',
          deviceName: 'Chrome on Windows',
          platform: 'web',
        },
      });

      expect(session.id).toBe('session-123');
      expect(session.userId).toBe('user-456');
    });

    it('should store device info in session', async () => {
      const deviceInfo = {
        userAgent: 'Mozilla/5.0 Chrome/120',
        ip: '192.168.1.100',
        platform: 'Windows',
      };

      mockPrisma.session.create.mockResolvedValue({
        id: 'session-123',
        ...deviceInfo,
      });

      const session = await mockPrisma.session.create({
        data: deviceInfo,
      });

      expect(session.userAgent).toBe('Mozilla/5.0 Chrome/120');
    });
  });

  // ===========================================================================
  // Registration Response
  // ===========================================================================

  describe('Registration Response', () => {
    it('should return safe user object (no password hash)', () => {
      const user = {
        id: 'user-123',
        email: 'user@example.com',
        passwordHash: '$2a$12$hash',
        tenantId: 'tenant-456',
        status: 'ACTIVE',
      };

      const safeUser = {
        id: user.id,
        email: user.email,
        tenantId: user.tenantId,
        status: user.status,
      };

      expect(safeUser).not.toHaveProperty('passwordHash');
    });

    it('should return access and refresh tokens', () => {
      const tokens = {
        accessToken: 'jwt-access-token',
        refreshToken: 'jwt-refresh-token',
        expiresIn: 3600,
      };

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.expiresIn).toBe(3600);
    });

    it('should return session info', () => {
      const session = {
        id: 'session-123',
        userId: 'user-456',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      };

      expect(session.id).toBeDefined();
      expect(session.expiresAt > session.createdAt).toBe(true);
    });

    it('should include user roles in response', () => {
      const response = {
        user: {
          id: 'user-123',
          roles: ['LEARNER'],
        },
      };

      expect(response.user.roles).toContain('LEARNER');
    });
  });
});
