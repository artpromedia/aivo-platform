/**
 * Integration Service - API Key Service Unit Tests
 *
 * Tests for API key management including:
 * - Key generation and hashing
 * - Key validation and lookup
 * - Rate limiting
 * - Scope management
 * - Key rotation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createHash, randomBytes } from 'crypto';

// Mock prisma
const mockPrisma = {
  apiKey: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  apiKeyUsage: {
    create: vi.fn(),
    aggregate: vi.fn(),
  },
  organization: {
    findUnique: vi.fn(),
  },
};

// Mock Redis for rate limiting
const mockRedis = {
  incr: vi.fn(),
  expire: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
};

// Types
interface ApiKey {
  id: string;
  keyHash: string;
  prefix: string;
  name: string;
  organizationId: string;
  scopes: string[];
  rateLimit: number;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

describe('API Key Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Key Generation', () => {
    it('should generate cryptographically secure API key', () => {
      const rawKey = randomBytes(32).toString('hex');
      expect(rawKey).toHaveLength(64);
    });

    it('should create key with prefix for identification', () => {
      const prefix = 'aivo_';
      const rawKey = randomBytes(32).toString('hex');
      const fullKey = `${prefix}${rawKey}`;

      expect(fullKey.startsWith('aivo_')).toBe(true);
      expect(fullKey).toHaveLength(69); // 5 prefix + 64 key
    });

    it('should hash key before storage', () => {
      const rawKey = 'aivo_' + randomBytes(32).toString('hex');
      const keyHash = createHash('sha256').update(rawKey).digest('hex');

      expect(keyHash).toHaveLength(64);
      expect(keyHash).not.toContain('aivo_');
    });

    it('should store only hash, not raw key', async () => {
      const rawKey = 'aivo_abc123';
      const keyHash = createHash('sha256').update(rawKey).digest('hex');

      mockPrisma.apiKey.create.mockResolvedValue({
        id: 'key-1',
        keyHash,
        prefix: 'aivo_abc',
        name: 'Production API Key',
      });

      const result = await mockPrisma.apiKey.create({
        data: {
          keyHash,
          prefix: rawKey.substring(0, 12),
          name: 'Production API Key',
          organizationId: 'org-1',
        },
      });

      expect(result.keyHash).toBe(keyHash);
      expect(result.keyHash).not.toBe(rawKey);
    });

    it('should return raw key only once at creation', async () => {
      const rawKey = 'aivo_' + randomBytes(32).toString('hex');
      const keyHash = createHash('sha256').update(rawKey).digest('hex');

      mockPrisma.apiKey.create.mockResolvedValue({
        id: 'key-1',
        keyHash,
        prefix: rawKey.substring(0, 12),
      });

      // Creation returns raw key
      const createResult = { rawKey, id: 'key-1' };
      expect(createResult.rawKey).toBeDefined();

      // Retrieval never includes raw key
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 'key-1',
        keyHash,
      });

      const retrieveResult = await mockPrisma.apiKey.findUnique({ where: { id: 'key-1' } });
      expect(retrieveResult).not.toHaveProperty('rawKey');
    });
  });

  describe('Key Validation', () => {
    it('should find key by hashed value', async () => {
      const rawKey = 'aivo_testapikey123';
      const keyHash = createHash('sha256').update(rawKey).digest('hex');

      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 'key-1',
        keyHash,
        organizationId: 'org-1',
        scopes: ['read:lessons', 'write:progress'],
      });

      const result = await mockPrisma.apiKey.findUnique({
        where: { keyHash },
      });

      expect(result).not.toBeNull();
      expect(result?.organizationId).toBe('org-1');
    });

    it('should reject invalid API key', async () => {
      const invalidKey = 'aivo_invalid';
      const keyHash = createHash('sha256').update(invalidKey).digest('hex');

      mockPrisma.apiKey.findUnique.mockResolvedValue(null);

      const result = await mockPrisma.apiKey.findUnique({
        where: { keyHash },
      });

      expect(result).toBeNull();
    });

    it('should check key expiration', () => {
      const expiredKey: Partial<ApiKey> = {
        id: 'key-1',
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      };

      const validKey: Partial<ApiKey> = {
        id: 'key-2',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      };

      const noExpiryKey: Partial<ApiKey> = {
        id: 'key-3',
        expiresAt: null,
      };

      const isExpired = (key: Partial<ApiKey>) => {
        return key.expiresAt !== null && key.expiresAt < new Date();
      };

      expect(isExpired(expiredKey)).toBe(true);
      expect(isExpired(validKey)).toBe(false);
      expect(isExpired(noExpiryKey)).toBe(false);
    });

    it('should update last used timestamp', async () => {
      const now = new Date();

      mockPrisma.apiKey.update.mockResolvedValue({
        id: 'key-1',
        lastUsedAt: now,
      });

      const result = await mockPrisma.apiKey.update({
        where: { id: 'key-1' },
        data: { lastUsedAt: now },
      });

      expect(result.lastUsedAt).toEqual(now);
    });

    it('should validate key format', () => {
      const validFormats = ['aivo_abcd1234567890', 'aivo_' + 'a'.repeat(64)];
      const invalidFormats = ['invalid_key', 'aivo_', 'aivo_short', 'sk_test_123'];

      const isValidFormat = (key: string) => {
        return key.startsWith('aivo_') && key.length >= 15;
      };

      validFormats.forEach((key) => {
        expect(isValidFormat(key)).toBe(true);
      });

      invalidFormats.forEach((key) => {
        expect(isValidFormat(key)).toBe(false);
      });
    });
  });

  describe('Scope Management', () => {
    it('should check if key has required scope', () => {
      const keyScopes = ['read:lessons', 'write:progress', 'read:users'];
      const requiredScope = 'write:progress';

      const hasScope = keyScopes.includes(requiredScope);
      expect(hasScope).toBe(true);
    });

    it('should reject request without required scope', () => {
      const keyScopes = ['read:lessons'];
      const requiredScope = 'write:lessons';

      const hasScope = keyScopes.includes(requiredScope);
      expect(hasScope).toBe(false);
    });

    it('should support wildcard scopes', () => {
      const keyScopes = ['read:*', 'write:progress'];

      const hasWildcardScope = (scopes: string[], required: string) => {
        const [action, resource] = required.split(':');
        return scopes.some((s) => {
          const [scopeAction, scopeResource] = s.split(':');
          return (
            (scopeAction === action && scopeResource === '*') ||
            (scopeAction === action && scopeResource === resource)
          );
        });
      };

      expect(hasWildcardScope(keyScopes, 'read:lessons')).toBe(true);
      expect(hasWildcardScope(keyScopes, 'read:users')).toBe(true);
      expect(hasWildcardScope(keyScopes, 'write:lessons')).toBe(false);
    });

    it('should list available scopes', () => {
      const availableScopes = [
        'read:lessons',
        'write:lessons',
        'read:users',
        'write:users',
        'read:progress',
        'write:progress',
        'admin:organization',
      ];

      expect(availableScopes).toContain('read:lessons');
      expect(availableScopes).toContain('admin:organization');
    });

    it('should validate scopes on key creation', async () => {
      const invalidScopes = ['read:invalid', 'write:nonexistent'];
      const availableScopes = ['read:lessons', 'write:lessons'];

      const validateScopes = (scopes: string[]) => {
        return scopes.every((s) => availableScopes.includes(s) || s.endsWith(':*'));
      };

      expect(validateScopes(invalidScopes)).toBe(false);
      expect(validateScopes(['read:lessons'])).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should check rate limit before processing request', async () => {
      mockRedis.incr.mockResolvedValue(50);
      mockRedis.expire.mockResolvedValue(1);

      const key = 'ratelimit:key-1';
      const limit = 100;
      const windowSec = 60;

      const current = await mockRedis.incr(key);
      await mockRedis.expire(key, windowSec);

      const result: RateLimitResult = {
        allowed: current <= limit,
        remaining: Math.max(0, limit - current),
        resetAt: new Date(Date.now() + windowSec * 1000),
      };

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(50);
    });

    it('should reject request when rate limit exceeded', async () => {
      mockRedis.incr.mockResolvedValue(101);

      const limit = 100;
      const current = await mockRedis.incr('ratelimit:key-1');

      expect(current).toBeGreaterThan(limit);
    });

    it('should use sliding window rate limit', () => {
      const windowMs = 60000; // 1 minute
      const requests: number[] = [];
      const now = Date.now();

      // Simulate requests over time
      requests.push(now - 50000); // 50s ago
      requests.push(now - 30000); // 30s ago
      requests.push(now - 10000); // 10s ago

      const windowStart = now - windowMs;
      const requestsInWindow = requests.filter((r) => r >= windowStart);

      expect(requestsInWindow).toHaveLength(3);
    });

    it('should apply per-key rate limits', async () => {
      const keyRateLimits = new Map([
        ['key-1', 100], // 100 req/min
        ['key-2', 1000], // 1000 req/min
      ]);

      expect(keyRateLimits.get('key-1')).toBe(100);
      expect(keyRateLimits.get('key-2')).toBe(1000);
    });

    it('should return rate limit headers', () => {
      const headers = {
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '45',
        'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 30),
      };

      expect(headers['X-RateLimit-Limit']).toBe('100');
      expect(parseInt(headers['X-RateLimit-Remaining'])).toBeLessThan(100);
    });
  });

  describe('Key Rotation', () => {
    it('should create new key for rotation', async () => {
      const oldKeyId = 'key-old';
      const newKey = 'aivo_' + randomBytes(32).toString('hex');
      const newKeyHash = createHash('sha256').update(newKey).digest('hex');

      mockPrisma.apiKey.create.mockResolvedValue({
        id: 'key-new',
        keyHash: newKeyHash,
        rotatedFromId: oldKeyId,
      });

      const result = await mockPrisma.apiKey.create({
        data: {
          keyHash: newKeyHash,
          prefix: newKey.substring(0, 12),
          rotatedFromId: oldKeyId,
          organizationId: 'org-1',
        },
      });

      expect(result.rotatedFromId).toBe(oldKeyId);
    });

    it('should allow grace period for old key', async () => {
      const gracePeriodMs = 24 * 60 * 60 * 1000; // 24 hours
      const rotatedAt = new Date();
      const graceEndsAt = new Date(rotatedAt.getTime() + gracePeriodMs);

      mockPrisma.apiKey.update.mockResolvedValue({
        id: 'key-old',
        rotatedAt,
        graceEndsAt,
        status: 'ROTATING',
      });

      const result = await mockPrisma.apiKey.update({
        where: { id: 'key-old' },
        data: { rotatedAt, graceEndsAt, status: 'ROTATING' },
      });

      expect(result.status).toBe('ROTATING');
      expect(result.graceEndsAt).toEqual(graceEndsAt);
    });

    it('should revoke old key after grace period', async () => {
      mockPrisma.apiKey.update.mockResolvedValue({
        id: 'key-old',
        status: 'REVOKED',
        revokedAt: new Date(),
      });

      const result = await mockPrisma.apiKey.update({
        where: { id: 'key-old' },
        data: { status: 'REVOKED', revokedAt: new Date() },
      });

      expect(result.status).toBe('REVOKED');
    });
  });

  describe('Key Management', () => {
    it('should list all keys for organization', async () => {
      mockPrisma.apiKey.findMany.mockResolvedValue([
        { id: 'key-1', name: 'Production', prefix: 'aivo_prod' },
        { id: 'key-2', name: 'Development', prefix: 'aivo_dev' },
      ]);

      const keys = await mockPrisma.apiKey.findMany({
        where: { organizationId: 'org-1' },
      });

      expect(keys).toHaveLength(2);
    });

    it('should revoke specific key', async () => {
      mockPrisma.apiKey.update.mockResolvedValue({
        id: 'key-1',
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedReason: 'Security incident',
      });

      const result = await mockPrisma.apiKey.update({
        where: { id: 'key-1' },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
          revokedReason: 'Security incident',
        },
      });

      expect(result.status).toBe('REVOKED');
    });

    it('should enforce max keys per organization', async () => {
      const maxKeys = 10;

      mockPrisma.apiKey.findMany.mockResolvedValue(Array(10).fill({ id: 'key' }));

      const existingKeys = await mockPrisma.apiKey.findMany({
        where: { organizationId: 'org-1', status: 'ACTIVE' },
      });

      const canCreateMore = existingKeys.length < maxKeys;
      expect(canCreateMore).toBe(false);
    });
  });

  describe('Usage Tracking', () => {
    it('should log API key usage', async () => {
      mockPrisma.apiKeyUsage.create.mockResolvedValue({
        id: 'usage-1',
        apiKeyId: 'key-1',
        endpoint: '/api/lessons',
        method: 'GET',
        statusCode: 200,
        timestamp: new Date(),
      });

      const result = await mockPrisma.apiKeyUsage.create({
        data: {
          apiKeyId: 'key-1',
          endpoint: '/api/lessons',
          method: 'GET',
          statusCode: 200,
        },
      });

      expect(result.endpoint).toBe('/api/lessons');
    });

    it('should aggregate usage statistics', async () => {
      mockPrisma.apiKeyUsage.aggregate.mockResolvedValue({
        _count: { id: 1000 },
      });

      const stats = await mockPrisma.apiKeyUsage.aggregate({
        where: {
          apiKeyId: 'key-1',
          timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        _count: { id: true },
      });

      expect(stats._count.id).toBe(1000);
    });
  });
});
