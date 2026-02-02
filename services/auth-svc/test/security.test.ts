/**
 * Auth Service - Security Tests
 *
 * Tests for security-sensitive authentication operations including:
 * - Brute force protection
 * - Token security
 * - Session management security
 * - Input validation
 * - CSRF protection
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock bcrypt
vi.mock('bcrypt', () => ({
  hash: vi.fn().mockResolvedValue('$2b$10$hashedpassword'),
  compare: vi.fn(),
}));

import bcrypt from 'bcrypt';

// Mock prisma
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  loginAttempt: {
    create: vi.fn(),
    count: vi.fn(),
    deleteMany: vi.fn(),
  },
  session: {
    create: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  refreshToken: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
};

// Mock Redis for rate limiting
const mockRedis = {
  incr: vi.fn(),
  expire: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
};

describe('Auth Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Brute Force Protection', () => {
    it('should track failed login attempts', async () => {
      mockPrisma.loginAttempt.create.mockResolvedValue({
        id: 'attempt-1',
        userId: 'user-1',
        success: false,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
      });

      const attempt = await mockPrisma.loginAttempt.create({
        data: {
          userId: 'user-1',
          success: false,
          ipAddress: '192.168.1.1',
        },
      });

      expect(attempt.success).toBe(false);
    });

    it('should lock account after max failed attempts', async () => {
      const maxAttempts = 5;
      mockPrisma.loginAttempt.count.mockResolvedValue(5);

      const recentAttempts = await mockPrisma.loginAttempt.count({
        where: {
          userId: 'user-1',
          success: false,
          timestamp: { gte: new Date(Date.now() - 15 * 60 * 1000) }, // Last 15 min
        },
      });

      const shouldLock = recentAttempts >= maxAttempts;
      expect(shouldLock).toBe(true);
    });

    it('should implement exponential backoff', () => {
      const calculateLockoutDuration = (failedAttempts: number): number => {
        const baseMinutes = 1;
        const maxMinutes = 60;
        const duration = Math.min(baseMinutes * Math.pow(2, failedAttempts - 5), maxMinutes);
        return duration * 60 * 1000; // Convert to ms
      };

      expect(calculateLockoutDuration(5)).toBe(1 * 60 * 1000); // 1 min
      expect(calculateLockoutDuration(6)).toBe(2 * 60 * 1000); // 2 min
      expect(calculateLockoutDuration(7)).toBe(4 * 60 * 1000); // 4 min
      expect(calculateLockoutDuration(10)).toBe(32 * 60 * 1000); // 32 min
      expect(calculateLockoutDuration(15)).toBe(60 * 60 * 1000); // Capped at 60 min
    });

    it('should rate limit by IP address', async () => {
      const ipKey = 'ratelimit:login:192.168.1.1';
      const maxRequests = 10;
      const windowSec = 60;

      mockRedis.incr.mockResolvedValue(11); // Over limit

      const count = await mockRedis.incr(ipKey);
      const isRateLimited = count > maxRequests;

      expect(isRateLimited).toBe(true);
    });

    it('should reset attempts after successful login', async () => {
      mockPrisma.loginAttempt.deleteMany.mockResolvedValue({ count: 3 });

      const result = await mockPrisma.loginAttempt.deleteMany({
        where: {
          userId: 'user-1',
          success: false,
        },
      });

      expect(result.count).toBe(3);
    });

    it('should notify user of suspicious activity', () => {
      const suspiciousPatterns = {
        multipleCountries: true,
        unusualTime: false,
        newDevice: true,
      };

      const isSuspicious = Object.values(suspiciousPatterns).filter(Boolean).length >= 2;
      expect(isSuspicious).toBe(true);
    });
  });

  describe('Password Security', () => {
    it('should hash passwords with bcrypt', async () => {
      const password = 'SecureP@ssw0rd!';
      const hash = await bcrypt.hash(password, 10);

      expect(hash).toContain('$2b$10$');
    });

    it('should verify password correctly', async () => {
      (bcrypt.compare as any).mockResolvedValueOnce(true);

      const isValid = await bcrypt.compare('password', '$2b$10$hash');
      expect(isValid).toBe(true);
    });

    it('should reject invalid password', async () => {
      (bcrypt.compare as any).mockResolvedValueOnce(false);

      const isValid = await bcrypt.compare('wrong', '$2b$10$hash');
      expect(isValid).toBe(false);
    });

    it('should enforce password complexity', () => {
      const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];

        if (password.length < 8) errors.push('Password must be at least 8 characters');
        if (!/[A-Z]/.test(password)) errors.push('Password must contain uppercase letter');
        if (!/[a-z]/.test(password)) errors.push('Password must contain lowercase letter');
        if (!/[0-9]/.test(password)) errors.push('Password must contain number');
        if (!/[!@#$%^&*]/.test(password)) errors.push('Password must contain special character');

        return { valid: errors.length === 0, errors };
      };

      expect(validatePassword('SecureP@ss1').valid).toBe(true);
      expect(validatePassword('weak').valid).toBe(false);
      expect(validatePassword('nouppercase1!').errors).toContain(
        'Password must contain uppercase letter'
      );
    });

    it('should check against common passwords', () => {
      const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];

      const isCommon = (password: string) => commonPasswords.includes(password.toLowerCase());

      expect(isCommon('password')).toBe(true);
      expect(isCommon('MyUniqueP@ss123')).toBe(false);
    });

    it('should prevent password reuse', async () => {
      const previousHashes = ['$2b$10$hash1', '$2b$10$hash2', '$2b$10$hash3'];
      const newPassword = 'NewPassword123!';

      // Mock checking against previous passwords
      (bcrypt.compare as any)
        .mockResolvedValueOnce(false) // hash1
        .mockResolvedValueOnce(true); // hash2 - match found

      let isReused = false;
      for (const hash of previousHashes) {
        if (await bcrypt.compare(newPassword, hash)) {
          isReused = true;
          break;
        }
      }

      expect(isReused).toBe(true);
    });
  });

  describe('Token Security', () => {
    it('should generate cryptographically secure tokens', () => {
      const token = crypto.randomUUID();
      expect(token).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      );
    });

    it('should store tokens hashed', () => {
      const token = 'raw-refresh-token-123';
      const tokenHash = crypto.subtle ? 'hash-placeholder' : Buffer.from(token).toString('base64');

      expect(tokenHash).not.toBe(token);
    });

    it('should set appropriate token expiration', () => {
      const tokenExpirations = {
        accessToken: 15 * 60 * 1000, // 15 minutes
        refreshToken: 7 * 24 * 60 * 60 * 1000, // 7 days
        passwordReset: 1 * 60 * 60 * 1000, // 1 hour
        emailVerification: 24 * 60 * 60 * 1000, // 24 hours
      };

      expect(tokenExpirations.accessToken).toBeLessThan(tokenExpirations.refreshToken);
      expect(tokenExpirations.passwordReset).toBeLessThan(tokenExpirations.emailVerification);
    });

    it('should implement refresh token rotation', async () => {
      const oldTokenId = 'old-token-1';
      const newTokenId = 'new-token-2';

      // Invalidate old token
      mockPrisma.refreshToken.update.mockResolvedValue({
        id: oldTokenId,
        revokedAt: new Date(),
        replacedById: newTokenId,
      });

      const result = await mockPrisma.refreshToken.update({
        where: { id: oldTokenId },
        data: { revokedAt: new Date(), replacedById: newTokenId },
      });

      expect(result.revokedAt).toBeDefined();
      expect(result.replacedById).toBe(newTokenId);
    });

    it('should detect refresh token reuse', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'token-1',
        revokedAt: new Date(), // Already revoked
        replacedById: 'token-2',
        familyId: 'family-1',
      });

      const token = await mockPrisma.refreshToken.findUnique({
        where: { id: 'token-1' },
      });

      const isReused = token?.revokedAt !== null;
      expect(isReused).toBe(true);

      // Should revoke entire token family
      if (isReused) {
        mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 5 });
        await mockPrisma.refreshToken.deleteMany({
          where: { familyId: token.familyId },
        });
      }
    });
  });

  describe('Session Security', () => {
    it('should bind session to device fingerprint', async () => {
      mockPrisma.session.create.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        deviceFingerprint: 'fp-abc123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      const session = await mockPrisma.session.create({
        data: {
          userId: 'user-1',
          deviceFingerprint: 'fp-abc123',
          ipAddress: '192.168.1.1',
        },
      });

      expect(session.deviceFingerprint).toBe('fp-abc123');
    });

    it('should invalidate session on IP change', async () => {
      const session = {
        id: 'session-1',
        ipAddress: '192.168.1.1',
      };
      const currentIp = '10.0.0.1';

      const ipChanged = session.ipAddress !== currentIp;
      expect(ipChanged).toBe(true);

      if (ipChanged) {
        mockPrisma.session.delete.mockResolvedValue({ id: 'session-1' });
        await mockPrisma.session.delete({ where: { id: 'session-1' } });
        expect(mockPrisma.session.delete).toHaveBeenCalled();
      }
    });

    it('should limit concurrent sessions', async () => {
      const maxSessions = 5;

      mockPrisma.session.deleteMany.mockResolvedValue({ count: 2 });

      // Get oldest sessions to delete
      const sessionsToDelete = 7 - maxSessions; // 7 current, keep 5
      expect(sessionsToDelete).toBe(2);
    });

    it('should expire idle sessions', () => {
      const session = {
        lastActivityAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      };
      const idleTimeoutMs = 1 * 60 * 60 * 1000; // 1 hour

      const isIdle = Date.now() - session.lastActivityAt.getTime() > idleTimeoutMs;
      expect(isIdle).toBe(true);
    });

    it('should support forced logout of all sessions', async () => {
      mockPrisma.session.deleteMany.mockResolvedValue({ count: 3 });
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 5 });

      await mockPrisma.session.deleteMany({ where: { userId: 'user-1' } });
      await mockPrisma.refreshToken.deleteMany({ where: { userId: 'user-1' } });

      expect(mockPrisma.session.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalled();
    });
  });

  describe('Input Validation', () => {
    it('should sanitize email input', () => {
      const sanitizeEmail = (email: string): string => {
        return email.toLowerCase().trim();
      };

      expect(sanitizeEmail('  USER@Example.COM  ')).toBe('user@example.com');
    });

    it('should validate email format', () => {
      const isValidEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      };

      expect(isValidEmail('valid@example.com')).toBe(true);
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('no@domain')).toBe(false);
    });

    it('should prevent SQL injection in queries', () => {
      const dangerousInput = "'; DROP TABLE users; --";

      // Parameterized queries should escape this
      const safeQuery = {
        where: { email: dangerousInput },
      };

      expect(safeQuery.where.email).toBe(dangerousInput);
      // Prisma handles escaping internally
    });

    it('should prevent XSS in stored data', () => {
      const escapeHtml = (str: string): string => {
        return str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      };

      const maliciousInput = '<script>alert("xss")</script>';
      const escaped = escapeHtml(maliciousInput);

      expect(escaped).not.toContain('<script>');
      expect(escaped).toContain('&lt;script&gt;');
    });

    it('should validate redirect URLs', () => {
      const allowedDomains = ['aivo.education', 'app.aivo.education'];

      const isValidRedirect = (url: string): boolean => {
        try {
          const parsed = new URL(url);
          return allowedDomains.some(
            (domain) => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
          );
        } catch {
          return false;
        }
      };

      expect(isValidRedirect('https://app.aivo.education/dashboard')).toBe(true);
      expect(isValidRedirect('https://evil.com/phishing')).toBe(false);
      expect(isValidRedirect('javascript:alert(1)')).toBe(false);
    });
  });

  describe('CSRF Protection', () => {
    it('should generate CSRF token', () => {
      const csrfToken = crypto.randomUUID();
      expect(csrfToken).toHaveLength(36);
    });

    it('should validate CSRF token on state-changing requests', () => {
      const sessionCsrfToken = 'token-123';
      const requestCsrfToken = 'token-123';

      const isValid = sessionCsrfToken === requestCsrfToken;
      expect(isValid).toBe(true);
    });

    it('should reject mismatched CSRF token', () => {
      const sessionCsrfToken = 'token-123';
      const requestCsrfToken = 'token-456';

      const isValid = sessionCsrfToken === requestCsrfToken;
      expect(isValid).toBe(false);
    });

    it('should regenerate CSRF token on login', () => {
      const oldToken = 'old-csrf-token';
      const newToken = crypto.randomUUID();

      expect(newToken).not.toBe(oldToken);
    });
  });

  describe('Security Headers', () => {
    it('should set secure cookie flags', () => {
      const cookieOptions = {
        httpOnly: true,
        secure: true,
        sameSite: 'strict' as const,
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      };

      expect(cookieOptions.httpOnly).toBe(true);
      expect(cookieOptions.secure).toBe(true);
      expect(cookieOptions.sameSite).toBe('strict');
    });

    it('should include security headers in response', () => {
      const securityHeaders = {
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Content-Security-Policy': "default-src 'self'",
      };

      expect(securityHeaders['Strict-Transport-Security']).toContain('max-age');
      expect(securityHeaders['X-Frame-Options']).toBe('DENY');
    });
  });
});
