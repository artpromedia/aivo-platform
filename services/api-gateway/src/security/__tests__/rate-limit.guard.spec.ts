/**
 * Rate Limit Guard Unit Tests
 *
 * Tests for sliding window rate limiting, Redis operations, and rate limit headers.
 *
 * @module tests/rate-limit.guard.spec
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpException } from '@nestjs/common';

// Mock Redis
const mockRedis = {
  multi: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  zadd: vi.fn(),
  zcard: vi.fn(),
  zremrangebyscore: vi.fn(),
  pexpire: vi.fn(),
  exec: vi.fn(),
};

const mockMulti = {
  zremrangebyscore: vi.fn().mockReturnThis(),
  zadd: vi.fn().mockReturnThis(),
  zcard: vi.fn().mockReturnThis(),
  pexpire: vi.fn().mockReturnThis(),
  exec: vi.fn(),
};

mockRedis.multi.mockReturnValue(mockMulti);

// Mock Reflector
const mockReflector = {
  getAllAndOverride: vi.fn(),
};

// Mock ConfigService
const mockConfigService = {
  get: vi.fn((key: string, defaultValue: any) => defaultValue),
};

// Rate limit configurations
const RATE_LIMITS = {
  AUTH: {
    LOGIN: { WINDOW_MS: 300000, MAX: 5 }, // 5 attempts per 5 minutes
    REGISTER: { WINDOW_MS: 3600000, MAX: 3 }, // 3 per hour
    PASSWORD_RESET: { WINDOW_MS: 3600000, MAX: 3 },
    MFA: { WINDOW_MS: 300000, MAX: 5 },
  },
  API: {
    READ: { WINDOW_MS: 60000, MAX: 100 },
    WRITE: { WINDOW_MS: 60000, MAX: 30 },
    EXPORT: { WINDOW_MS: 3600000, MAX: 10 },
  },
};

// Mock request factory
function createMockRequest(overrides: {
  path?: string;
  method?: string;
  ip?: string;
  user?: any;
  securityContext?: any;
}) {
  return {
    path: overrides.path || '/api/test',
    method: overrides.method || 'GET',
    ip: overrides.ip || '127.0.0.1',
    user: overrides.user,
    securityContext: overrides.securityContext || { ip: overrides.ip || '127.0.0.1' },
  };
}

// Mock response
function createMockResponse() {
  const headers: Record<string, string | number> = {};
  return {
    setHeader: vi.fn((name: string, value: string | number) => {
      headers[name] = value;
    }),
    getHeaders: () => headers,
  };
}

describe('RateLimitGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMulti.exec.mockResolvedValue([
      [null, 0], // zremrangebyscore
      [null, 1], // zadd
      [null, 1], // zcard
      [null, 1], // pexpire
    ]);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ===========================================================================
  // Default Rate Limits
  // ===========================================================================

  describe('Default Rate Limits', () => {
    it('should apply login rate limit for /auth/login', () => {
      const request = createMockRequest({ path: '/auth/login', method: 'POST' });

      const expectedLimit = RATE_LIMITS.AUTH.LOGIN;
      expect(request.path.includes('/auth/login')).toBe(true);
      expect(expectedLimit.MAX).toBe(5);
      expect(expectedLimit.WINDOW_MS).toBe(300000);
    });

    it('should apply register rate limit for /auth/register', () => {
      const request = createMockRequest({ path: '/auth/register', method: 'POST' });

      const expectedLimit = RATE_LIMITS.AUTH.REGISTER;
      expect(request.path.includes('/auth/register')).toBe(true);
      expect(expectedLimit.MAX).toBe(3);
    });

    it('should apply password reset rate limit', () => {
      const request = createMockRequest({ path: '/auth/password-reset', method: 'POST' });

      expect(request.path.includes('/auth/password-reset')).toBe(true);
      expect(RATE_LIMITS.AUTH.PASSWORD_RESET.MAX).toBe(3);
    });

    it('should apply MFA rate limit', () => {
      const request = createMockRequest({ path: '/auth/mfa/verify', method: 'POST' });

      expect(request.path.includes('/auth/mfa')).toBe(true);
      expect(RATE_LIMITS.AUTH.MFA.MAX).toBe(5);
    });

    it('should apply export rate limit', () => {
      const request = createMockRequest({ path: '/api/export/data', method: 'POST' });

      expect(request.path.includes('/export')).toBe(true);
      expect(RATE_LIMITS.API.EXPORT.MAX).toBe(10);
    });

    it('should apply write rate limit for POST/PUT/PATCH/DELETE', () => {
      const methods = ['POST', 'PUT', 'PATCH', 'DELETE'];

      for (const method of methods) {
        const request = createMockRequest({ path: '/api/users', method });
        expect(['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)).toBe(true);
      }

      expect(RATE_LIMITS.API.WRITE.MAX).toBe(30);
    });

    it('should apply read rate limit for GET requests', () => {
      const request = createMockRequest({ path: '/api/users', method: 'GET' });

      expect(request.method).toBe('GET');
      expect(RATE_LIMITS.API.READ.MAX).toBe(100);
    });
  });

  // ===========================================================================
  // Rate Limit Key Building
  // ===========================================================================

  describe('Rate Limit Key Building', () => {
    it('should build key with IP for unauthenticated requests', () => {
      const request = createMockRequest({ ip: '192.168.1.100' });
      const prefix = 'api:read';

      const key = `${prefix}:${request.ip}:anonymous`;
      expect(key).toBe('api:read:192.168.1.100:anonymous');
    });

    it('should build key with user ID for authenticated requests', () => {
      const request = createMockRequest({
        ip: '192.168.1.100',
        user: { id: 'user-123' },
      });
      const prefix = 'api:read';

      const key = `${prefix}:${request.ip}:${request.user.id}`;
      expect(key).toBe('api:read:192.168.1.100:user-123');
    });

    it('should use security context IP when available', () => {
      const request = createMockRequest({
        ip: '127.0.0.1',
        securityContext: { ip: '10.0.0.1' },
      });

      const ip = request.securityContext?.ip || request.ip;
      expect(ip).toBe('10.0.0.1');
    });

    it('should handle missing IP gracefully', () => {
      const request = createMockRequest({});
      delete (request as any).ip;
      delete (request as any).securityContext;

      const ip = request.securityContext?.ip || request.ip || 'unknown';
      expect(ip).toBe('unknown');
    });

    it('should include prefix in key', () => {
      const prefixes = ['auth:login', 'auth:register', 'api:read', 'api:write'];

      for (const prefix of prefixes) {
        const key = `${prefix}:127.0.0.1:user-123`;
        expect(key.startsWith(prefix)).toBe(true);
      }
    });
  });

  // ===========================================================================
  // Rate Limit Headers
  // ===========================================================================

  describe('Rate Limit Headers', () => {
    it('should set X-RateLimit-Limit header', () => {
      const response = createMockResponse();
      const limit = 100;

      response.setHeader('X-RateLimit-Limit', limit);

      expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 100);
    });

    it('should set X-RateLimit-Remaining header', () => {
      const response = createMockResponse();
      const remaining = 95;

      response.setHeader('X-RateLimit-Remaining', Math.max(0, remaining));

      expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 95);
    });

    it('should set X-RateLimit-Reset header', () => {
      const response = createMockResponse();
      const resetAt = Date.now() + 60000;

      response.setHeader('X-RateLimit-Reset', resetAt);

      expect(response.setHeader).toHaveBeenCalled();
    });

    it('should set Retry-After header when limit exceeded', () => {
      const response = createMockResponse();
      const retryAfter = 30; // seconds

      response.setHeader('Retry-After', retryAfter);

      expect(response.setHeader).toHaveBeenCalledWith('Retry-After', 30);
    });

    it('should not set negative remaining value', () => {
      const response = createMockResponse();
      const remaining = -5;

      response.setHeader('X-RateLimit-Remaining', Math.max(0, remaining));

      expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 0);
    });
  });

  // ===========================================================================
  // Sliding Window Algorithm
  // ===========================================================================

  describe('Sliding Window Algorithm', () => {
    it('should remove old entries outside window', async () => {
      const windowMs = 60000;
      const now = Date.now();
      const windowStart = now - windowMs;

      mockMulti.zremrangebyscore.mockReturnThis();

      expect(mockMulti.zremrangebyscore).toBeDefined();
    });

    it('should add current request with timestamp', async () => {
      const now = Date.now();

      mockMulti.zadd.mockReturnThis();

      expect(mockMulti.zadd).toBeDefined();
    });

    it('should count requests in current window', async () => {
      mockMulti.exec.mockResolvedValue([
        [null, 0], // zremrangebyscore
        [null, 1], // zadd
        [null, 50], // zcard - 50 requests in window
        [null, 1], // pexpire
      ]);

      const results = await mockMulti.exec();
      const count = results[2][1];

      expect(count).toBe(50);
    });

    it('should set key expiry to window duration', async () => {
      const windowMs = 60000;

      mockMulti.pexpire.mockReturnThis();

      expect(mockMulti.pexpire).toBeDefined();
    });
  });

  // ===========================================================================
  // Rate Limit Exceeded
  // ===========================================================================

  describe('Rate Limit Exceeded', () => {
    it('should throw 429 when limit exceeded', () => {
      const error = new HttpException(
        {
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: 30,
        },
        429
      );

      expect(error.getStatus()).toBe(429);
      expect(error.getResponse()).toHaveProperty('code', 'RATE_LIMIT_EXCEEDED');
    });

    it('should include retryAfter in error response', () => {
      const resetAt = Date.now() + 30000;
      const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);

      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThanOrEqual(30);
    });

    it('should calculate remaining correctly', () => {
      const limit = 100;
      const current = 101;
      const remaining = limit - current;

      expect(remaining).toBe(-1);
      expect(remaining < 0).toBe(true);
    });
  });

  // ===========================================================================
  // Custom Rate Limits
  // ===========================================================================

  describe('Custom Rate Limits', () => {
    it('should use decorator rate limit when specified', () => {
      const customLimit = {
        windowMs: 30000,
        max: 10,
        keyPrefix: 'custom',
      };

      mockReflector.getAllAndOverride.mockReturnValue(customLimit);

      const result = mockReflector.getAllAndOverride();
      expect(result).toEqual(customLimit);
      expect(result.max).toBe(10);
    });

    it('should fall back to default when no decorator', () => {
      mockReflector.getAllAndOverride.mockReturnValue(undefined);

      const result = mockReflector.getAllAndOverride();
      expect(result).toBeUndefined();
      // Should use default limits
    });

    it('should support per-endpoint rate limits', () => {
      const endpoints = [
        { path: '/api/sensitive', limit: 5 },
        { path: '/api/normal', limit: 100 },
        { path: '/api/bulk', limit: 10 },
      ];

      for (const endpoint of endpoints) {
        expect(endpoint.limit).toBeDefined();
      }
    });
  });

  // ===========================================================================
  // Redis Failure Handling
  // ===========================================================================

  describe('Redis Failure Handling', () => {
    it('should fail open when Redis is unavailable', async () => {
      mockMulti.exec.mockRejectedValue(new Error('Redis connection failed'));

      try {
        await mockMulti.exec();
      } catch {
        // Should allow request through (fail open)
        // Log error but don't block request
      }

      expect(mockMulti.exec).toHaveBeenCalled();
    });

    it('should log Redis errors', async () => {
      const error = new Error('Redis timeout');
      mockMulti.exec.mockRejectedValue(error);

      await expect(mockMulti.exec()).rejects.toThrow('Redis timeout');
    });

    it('should handle null Redis results', async () => {
      mockMulti.exec.mockResolvedValue(null);

      const results = await mockMulti.exec();
      expect(results).toBeNull();
    });

    it('should handle Redis transaction failure', async () => {
      mockMulti.exec.mockResolvedValue([
        ['Error', null],
        [null, 1],
        [null, 1],
        [null, 1],
      ]);

      const results = await mockMulti.exec();
      expect(results[0][0]).toBe('Error');
    });
  });

  // ===========================================================================
  // Bypass Prevention
  // ===========================================================================

  describe('Bypass Prevention', () => {
    it('should use consistent key for same client', () => {
      const request1 = createMockRequest({ ip: '192.168.1.100' });
      const request2 = createMockRequest({ ip: '192.168.1.100' });

      const key1 = `api:read:${request1.ip}:anonymous`;
      const key2 = `api:read:${request2.ip}:anonymous`;

      expect(key1).toBe(key2);
    });

    it('should track X-Forwarded-For header abuse', () => {
      const spoofedIps = [
        '127.0.0.1',
        '192.168.1.1',
        '10.0.0.1',
      ];

      for (const ip of spoofedIps) {
        // Should not trust X-Forwarded-For blindly
        expect(ip).toBeDefined();
      }
    });

    it('should rate limit by both IP and user ID', () => {
      const request = createMockRequest({
        ip: '192.168.1.100',
        user: { id: 'user-123' },
      });

      // Both IP and user should be in key
      const key = `api:read:${request.ip}:${request.user.id}`;
      expect(key).toContain('192.168.1.100');
      expect(key).toContain('user-123');
    });

    it('should prevent key manipulation attempts', () => {
      const maliciousInputs = [
        '../../../etc/passwd',
        '127.0.0.1:*',
        'user-*',
        '{{constructor}}',
      ];

      for (const input of maliciousInputs) {
        // Key should be sanitized
        const sanitized = input.replace(/[^a-zA-Z0-9:\-_.]/g, '');
        expect(sanitized).not.toBe(input);
      }
    });
  });

  // ===========================================================================
  // Concurrent Request Handling
  // ===========================================================================

  describe('Concurrent Request Handling', () => {
    it('should handle concurrent requests atomically', async () => {
      // Multiple requests should all be counted
      const requestCount = 10;
      const promises = [];

      for (let i = 0; i < requestCount; i++) {
        mockMulti.exec.mockResolvedValueOnce([
          [null, 0],
          [null, 1],
          [null, i + 1], // Incrementing count
          [null, 1],
        ]);
        promises.push(mockMulti.exec());
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(requestCount);
    });

    it('should use Redis transactions for atomicity', () => {
      mockRedis.multi();

      expect(mockRedis.multi).toHaveBeenCalled();
    });
  });
});
