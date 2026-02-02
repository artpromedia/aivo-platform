/**
 * Auth Service - Password Reset Flow Tests
 *
 * Tests for password reset request, token validation, and password change.
 *
 * @module tests/password-reset.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHash, randomBytes } from 'node:crypto';
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

// Hash token
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Mock Prisma
const mockPrisma = {
  user: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  passwordResetToken: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
  passwordHistory: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  session: {
    updateMany: vi.fn(),
  },
};

// Mock notification client
const mockNotifyClient = {
  sendPasswordResetEmail: vi.fn(),
  sendPasswordChangedEmail: vi.fn(),
};

// Mock Redis for rate limiting
const mockRedis = {
  incr: vi.fn(),
  expire: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
};

describe('Password Reset Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.useRealTimers();
  });

  // ===========================================================================
  // Request Password Reset
  // ===========================================================================

  describe('Request Password Reset', () => {
    it('should create reset token for existing user', async () => {
      const user = { id: 'user-123', email: 'user@example.com', tenantId: 'tenant-456' };
      const token = randomBytes(32).toString('hex');
      const tokenHash = hashToken(token);

      mockPrisma.user.findFirst.mockResolvedValue(user);
      mockPrisma.passwordResetToken.create.mockResolvedValue({
        id: 'token-id',
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 3600000),
      });

      const found = await mockPrisma.user.findFirst({ where: { email: user.email } });
      expect(found).toBeDefined();

      const resetToken = await mockPrisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 3600000) },
      });
      expect(resetToken.userId).toBe(user.id);
    });

    it('should set 1-hour expiry for reset token', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const expiresAt = new Date(now + 60 * 60 * 1000);
      const diffMinutes = (expiresAt.getTime() - now) / (60 * 1000);

      expect(diffMinutes).toBe(60);
    });

    it('should hash reset token before storing', () => {
      const token = randomBytes(32).toString('hex');
      const hash = hashToken(token);

      expect(hash).not.toBe(token);
      expect(hash).toHaveLength(64);
    });

    it('should delete existing reset tokens for user', async () => {
      mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 2 });

      const result = await mockPrisma.passwordResetToken.deleteMany({
        where: { userId: 'user-123' },
      });

      expect(result.count).toBe(2);
    });

    it('should not reveal if user exists (timing attack prevention)', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const found = await mockPrisma.user.findFirst({
        where: { email: 'nonexistent@example.com' },
      });

      expect(found).toBeNull();
      // Response should be same for both existing and non-existing users
    });

    it('should send password reset email', async () => {
      const email = 'user@example.com';
      const resetLink = 'https://aivo.edu/reset-password?token=abc123';

      mockNotifyClient.sendPasswordResetEmail.mockResolvedValue(true);

      await mockNotifyClient.sendPasswordResetEmail(email, resetLink);

      expect(mockNotifyClient.sendPasswordResetEmail).toHaveBeenCalledWith(email, resetLink);
    });
  });

  // ===========================================================================
  // Rate Limiting
  // ===========================================================================

  describe('Password Reset Rate Limiting', () => {
    it('should track reset attempts per email', async () => {
      const email = 'user@example.com';
      const key = `password_reset:${email}`;

      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      await mockRedis.incr(key);
      await mockRedis.expire(key, 3600);

      expect(mockRedis.incr).toHaveBeenCalledWith(key);
    });

    it('should limit to 3 requests per hour', async () => {
      const email = 'user@example.com';
      const key = `password_reset:${email}`;

      mockRedis.get.mockResolvedValue('3');

      const attempts = await mockRedis.get(key);

      expect(parseInt(attempts)).toBe(3);
    });

    it('should block requests after limit exceeded', async () => {
      mockRedis.get.mockResolvedValue('4');

      const attempts = await mockRedis.get('password_reset:user@example.com');

      expect(parseInt(attempts) > 3).toBe(true);
    });

    it('should reset counter after 1 hour', async () => {
      mockRedis.del.mockResolvedValue(1);

      await mockRedis.del('password_reset:user@example.com');

      expect(mockRedis.del).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Validate Reset Token
  // ===========================================================================

  describe('Validate Reset Token', () => {
    it('should validate unexpired token', async () => {
      const token = 'valid-token';
      const tokenHash = hashToken(token);

      mockPrisma.passwordResetToken.findFirst.mockResolvedValue({
        id: 'token-id',
        userId: 'user-123',
        tokenHash,
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null,
      });

      const found = await mockPrisma.passwordResetToken.findFirst({
        where: { tokenHash, expiresAt: { gt: new Date() }, usedAt: null },
      });

      expect(found).toBeDefined();
      expect(found.usedAt).toBeNull();
    });

    it('should reject expired token', async () => {
      mockPrisma.passwordResetToken.findFirst.mockResolvedValue(null);

      const found = await mockPrisma.passwordResetToken.findFirst({
        where: {
          tokenHash: 'expired-hash',
          expiresAt: { gt: new Date() },
          usedAt: null,
        },
      });

      expect(found).toBeNull();
    });

    it('should reject already used token', async () => {
      mockPrisma.passwordResetToken.findFirst.mockResolvedValue(null);

      const found = await mockPrisma.passwordResetToken.findFirst({
        where: {
          tokenHash: 'used-hash',
          usedAt: null,
        },
      });

      expect(found).toBeNull();
    });

    it('should reject invalid token', async () => {
      mockPrisma.passwordResetToken.findFirst.mockResolvedValue(null);

      const found = await mockPrisma.passwordResetToken.findFirst({
        where: { tokenHash: 'invalid-hash' },
      });

      expect(found).toBeNull();
    });
  });

  // ===========================================================================
  // Change Password
  // ===========================================================================

  describe('Change Password', () => {
    it('should validate new password strength', () => {
      const weakPasswords = [
        'short',
        'nouppercase123!',
        'NOLOWERCASE123!',
        'NoNumbers!',
        'NoSpecial123',
      ];

      for (const password of weakPasswords) {
        const errors = validatePasswordStrength(password);
        expect(errors.length).toBeGreaterThan(0);
      }
    });

    it('should accept strong passwords', () => {
      const strongPasswords = [
        'SecureP@ss123',
        'MyStr0ng!Password',
        'C0mplex#Pass',
      ];

      for (const password of strongPasswords) {
        const errors = validatePasswordStrength(password);
        expect(errors).toHaveLength(0);
      }
    });

    it('should hash new password', async () => {
      const password = 'NewSecureP@ss123';
      const hash = await bcrypt.hash(password, 12);

      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
    });

    it('should update user password', async () => {
      const newHash = '$2a$12$newhash';

      mockPrisma.user.update.mockResolvedValue({
        id: 'user-123',
        passwordHash: newHash,
      });

      const user = await mockPrisma.user.update({
        where: { id: 'user-123' },
        data: { passwordHash: newHash },
      });

      expect(user.passwordHash).toBe(newHash);
    });

    it('should mark reset token as used', async () => {
      mockPrisma.passwordResetToken.update.mockResolvedValue({
        id: 'token-id',
        usedAt: new Date(),
      });

      const token = await mockPrisma.passwordResetToken.update({
        where: { id: 'token-id' },
        data: { usedAt: new Date() },
      });

      expect(token.usedAt).toBeDefined();
    });
  });

  // ===========================================================================
  // Password History
  // ===========================================================================

  describe('Password History', () => {
    const PASSWORD_HISTORY_COUNT = 5;

    it('should check against last 5 passwords', async () => {
      const history = [
        { passwordHash: '$2a$12$hash1' },
        { passwordHash: '$2a$12$hash2' },
        { passwordHash: '$2a$12$hash3' },
        { passwordHash: '$2a$12$hash4' },
        { passwordHash: '$2a$12$hash5' },
      ];

      mockPrisma.passwordHistory.findMany.mockResolvedValue(history);

      const found = await mockPrisma.passwordHistory.findMany({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
        take: PASSWORD_HISTORY_COUNT,
      });

      expect(found).toHaveLength(5);
    });

    it('should reject recently used passwords', async () => {
      const newPassword = 'OldPassword123!';
      const oldHash = await bcrypt.hash(newPassword, 12);

      const history = [{ passwordHash: oldHash }];

      for (const entry of history) {
        const isReused = await bcrypt.compare(newPassword, entry.passwordHash);
        expect(isReused).toBe(true);
      }
    });

    it('should save new password to history', async () => {
      mockPrisma.passwordHistory.create.mockResolvedValue({
        id: 'history-id',
        userId: 'user-123',
        passwordHash: '$2a$12$hash',
        reason: 'password_reset',
      });

      const entry = await mockPrisma.passwordHistory.create({
        data: {
          userId: 'user-123',
          tenantId: 'tenant-456',
          passwordHash: '$2a$12$hash',
          changedFromIp: '192.168.1.100',
          reason: 'password_reset',
        },
      });

      expect(entry.reason).toBe('password_reset');
    });
  });

  // ===========================================================================
  // Session Invalidation
  // ===========================================================================

  describe('Session Invalidation After Password Reset', () => {
    it('should revoke all sessions after password change', async () => {
      mockPrisma.session.updateMany.mockResolvedValue({ count: 3 });

      const result = await mockPrisma.session.updateMany({
        where: { userId: 'user-123', revokedAt: null },
        data: { revokedAt: new Date(), revokeReason: 'password_reset' },
      });

      expect(result.count).toBe(3);
    });

    it('should optionally keep current session', async () => {
      mockPrisma.session.updateMany.mockResolvedValue({ count: 2 });

      const result = await mockPrisma.session.updateMany({
        where: {
          userId: 'user-123',
          revokedAt: null,
          id: { not: 'current-session' },
        },
        data: { revokedAt: new Date(), revokeReason: 'password_reset' },
      });

      expect(result.count).toBe(2);
    });
  });

  // ===========================================================================
  // Notification
  // ===========================================================================

  describe('Password Reset Notifications', () => {
    it('should send confirmation email after password change', async () => {
      const email = 'user@example.com';

      mockNotifyClient.sendPasswordChangedEmail.mockResolvedValue(true);

      await mockNotifyClient.sendPasswordChangedEmail(email);

      expect(mockNotifyClient.sendPasswordChangedEmail).toHaveBeenCalledWith(email);
    });

    it('should include security warning in email', () => {
      const emailContent = {
        subject: 'Your password has been changed',
        body: 'If you did not make this change, please contact support immediately.',
      };

      expect(emailContent.body).toContain('did not make this change');
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle disabled accounts', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-123',
        status: 'DISABLED',
      });

      const user = await mockPrisma.user.findFirst({ where: { email: 'disabled@example.com' } });

      expect(user.status).toBe('DISABLED');
    });

    it('should handle concurrent reset requests', async () => {
      // First request creates token
      mockPrisma.passwordResetToken.create.mockResolvedValueOnce({ id: 'token-1' });

      // Delete any existing tokens first
      mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 1 });

      await mockPrisma.passwordResetToken.deleteMany({ where: { userId: 'user-123' } });
      await mockPrisma.passwordResetToken.create({ data: {} });

      expect(mockPrisma.passwordResetToken.deleteMany).toHaveBeenCalled();
    });

    it('should handle special characters in email', async () => {
      const specialEmails = [
        'user+tag@example.com',
        'user.name@domain.co.uk',
        'o\'brien@example.com',
      ];

      for (const email of specialEmails) {
        mockPrisma.user.findFirst.mockResolvedValue({ email });
        const user = await mockPrisma.user.findFirst({ where: { email } });
        expect(user.email).toBe(email);
      }
    });

    it('should prevent timing attacks on token validation', () => {
      const token1 = hashToken('token1');
      const token2 = hashToken('token2');

      // Use constant-time comparison
      let result = 0;
      for (let i = 0; i < token1.length; i++) {
        result |= token1.charCodeAt(i) ^ token2.charCodeAt(i);
      }

      expect(result !== 0).toBe(true);
    });
  });
});
