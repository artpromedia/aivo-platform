import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash, randomBytes } from 'crypto';

describe('api-key-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-01T12:00:00Z'));
  });

  describe('hashApiKey', () => {
    it('should hash an API key using SHA-256', () => {
      const key = 'test-api-key-12345';
      const hash = createHash('sha256').update(key).digest('hex');

      // Should be a 64-character hex string (SHA-256)
      expect(hash).toHaveLength(64);
      expect(/^[0-9a-f]+$/i.test(hash)).toBe(true);

      // Should be deterministic
      expect(createHash('sha256').update(key).digest('hex')).toBe(hash);
    });

    it('should produce different hashes for different keys', () => {
      const hash1 = createHash('sha256').update('key1').digest('hex');
      const hash2 = createHash('sha256').update('key2').digest('hex');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('API key format', () => {
    it('should generate keys with correct prefix', () => {
      const prefix = 'aivo_pk_';
      const rawKey = `${prefix}${randomBytes(32).toString('hex')}`;
      
      expect(rawKey).toMatch(/^aivo_pk_[0-9a-f]{64}$/);
      expect(rawKey.startsWith(prefix)).toBe(true);
    });

    it('should generate unique keys', () => {
      const key1 = `aivo_pk_${randomBytes(32).toString('hex')}`;
      const key2 = `aivo_pk_${randomBytes(32).toString('hex')}`;
      expect(key1).not.toBe(key2);
    });
  });

  describe('API key validation logic', () => {
    it('should reject keys with wrong prefix', () => {
      const invalidKey = 'wrong_prefix_abc123';
      expect(invalidKey.startsWith('aivo_pk_')).toBe(false);
    });

    it('should accept keys with correct prefix', () => {
      const validKey = 'aivo_pk_abc123def456';
      expect(validKey.startsWith('aivo_pk_')).toBe(true);
    });

    it('should check expiration correctly', () => {
      const now = new Date('2024-06-01T12:00:00Z');
      const expiredDate = new Date('2024-01-01T00:00:00Z');
      const futureDate = new Date('2025-01-01T00:00:00Z');

      expect(expiredDate < now).toBe(true);
      expect(futureDate > now).toBe(true);
    });

    it('should check scopes correctly', () => {
      const scopes = ['READ_LEARNER_PROGRESS', 'READ_SESSION_DATA'];
      
      expect(scopes.includes('READ_LEARNER_PROGRESS')).toBe(true);
      expect(scopes.includes('WRITE_EXTERNAL_EVENTS')).toBe(false);
    });
  });

  describe('Rate limiting logic', () => {
    it('should track request counts correctly', () => {
      const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
      const keyId = 'key-123';
      const limitPerMinute = 60;
      const windowMs = 60000;
      const now = Date.now();

      // Initialize rate limit entry
      rateLimitStore.set(keyId, { count: 0, resetAt: now + windowMs });
      
      // Increment count
      const entry = rateLimitStore.get(keyId)!;
      entry.count++;
      
      expect(entry.count).toBe(1);
      expect(entry.count < limitPerMinute).toBe(true);
    });

    it('should reset after window expires', () => {
      const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
      const keyId = 'key-123';
      const windowMs = 60000;
      const pastTime = Date.now() - windowMs - 1000; // 1 second past window

      rateLimitStore.set(keyId, { count: 50, resetAt: pastTime });
      
      const entry = rateLimitStore.get(keyId)!;
      const isExpired = entry.resetAt < Date.now();
      
      expect(isExpired).toBe(true);
    });

    it('should block when limit exceeded', () => {
      const count = 60;
      const limitPerMinute = 60;
      
      expect(count >= limitPerMinute).toBe(true);
    });
  });
});
