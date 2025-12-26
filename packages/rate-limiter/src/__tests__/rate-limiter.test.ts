/**
 * Rate Limiter Tests
 *
 * Comprehensive test suite for the rate limiting library.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RateLimiter, defaultTiers, defaultRules } from '../rate-limiter';
import { MemoryStore } from '../stores/memory-store';
import { RateLimitContext } from '../types';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
    rateLimiter = new RateLimiter({
      store,
      defaultAlgorithm: 'sliding-window',
      tiers: defaultTiers,
      rules: defaultRules,
      failOpen: false,
    });
  });

  afterEach(async () => {
    await store.close();
  });

  describe('check', () => {
    it('should allow requests within limits', async () => {
      const context: RateLimitContext = {
        userId: 'user-123',
        ip: '192.168.1.1',
        endpoint: '/api/v1/users',
        method: 'GET',
      };

      const result = await rateLimiter.check(context);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
      expect(result.headers).toBeDefined();
      expect(result.headers['X-RateLimit-Remaining']).toBeDefined();
    });

    it('should deny requests when limit is exceeded', async () => {
      const context: RateLimitContext = {
        userId: 'user-123',
        ip: '192.168.1.1',
        endpoint: '/api/v1/auth/login',
        method: 'POST',
      };

      // Login has a limit of 5 per minute
      // Consume all 5 requests
      for (let i = 0; i < 5; i++) {
        await rateLimiter.consume(context);
      }

      // Next request should be denied
      const result = await rateLimiter.consume(context);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should bypass rate limiting for internal requests', async () => {
      const context: RateLimitContext = {
        userId: 'service-account',
        ip: '10.0.0.1',
        endpoint: '/api/v1/internal/health',
        method: 'GET',
        isInternal: true,
      };

      const result = await rateLimiter.check(context);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(Infinity);
    });

    it('should bypass rate limiting for bypass IPs', async () => {
      rateLimiter.addBypassIP('10.0.0.100');

      const context: RateLimitContext = {
        ip: '10.0.0.100',
        endpoint: '/api/v1/heavy-operation',
        method: 'POST',
      };

      const result = await rateLimiter.check(context);

      expect(result.allowed).toBe(true);
      expect(result.key).toBe('bypass');
    });
  });

  describe('consume', () => {
    it('should decrement remaining count', async () => {
      const context: RateLimitContext = {
        userId: 'user-456',
        ip: '192.168.1.2',
        endpoint: '/api/v1/content',
        method: 'GET',
      };

      const result1 = await rateLimiter.consume(context);
      const result2 = await rateLimiter.consume(context);

      expect(result2.remaining).toBeLessThan(result1.remaining);
    });

    it('should support custom cost', async () => {
      const context: RateLimitContext = {
        userId: 'user-789',
        ip: '192.168.1.3',
        endpoint: '/api/v1/content',
        method: 'GET',
      };

      const result1 = await rateLimiter.consume(context);
      const result2 = await rateLimiter.consume(context, 5); // Cost of 5

      expect(result1.remaining - result2.remaining).toBeGreaterThanOrEqual(5);
    });
  });

  describe('rule matching', () => {
    it('should match login endpoint rule', async () => {
      const context: RateLimitContext = {
        ip: '192.168.1.4',
        endpoint: '/api/v1/auth/login',
        method: 'POST',
      };

      const result = await rateLimiter.check(context);

      expect(result.rule?.id).toBe('auth-login');
    });

    it('should match upload endpoint rule', async () => {
      const context: RateLimitContext = {
        userId: 'user-upload',
        tenantId: 'tenant-1',
        endpoint: '/api/v1/upload/files',
        method: 'POST',
      };

      const result = await rateLimiter.check(context);

      expect(result.rule?.id).toBe('file-upload');
    });

    it('should match AI endpoint rule', async () => {
      const context: RateLimitContext = {
        userId: 'user-ai',
        tenantId: 'tenant-1',
        endpoint: '/api/v1/ai/generate',
        method: 'POST',
      };

      const result = await rateLimiter.check(context);

      expect(result.rule?.id).toBe('ai-generate');
    });

    it('should use default API rule for unmatched endpoints', async () => {
      const context: RateLimitContext = {
        userId: 'user-default',
        endpoint: '/api/v1/some-endpoint',
        method: 'GET',
      };

      const result = await rateLimiter.check(context);

      expect(result.rule?.id).toBe('api-default');
    });
  });

  describe('tiers', () => {
    it('should apply tier-specific limits', async () => {
      const freeContext: RateLimitContext = {
        userId: 'free-user',
        tier: 'free',
        endpoint: '/api/v1/data',
        method: 'GET',
      };

      const enterpriseContext: RateLimitContext = {
        userId: 'enterprise-user',
        tier: 'enterprise',
        endpoint: '/api/v1/data',
        method: 'GET',
      };

      const freeResult = await rateLimiter.check(freeContext);
      const enterpriseResult = await rateLimiter.check(enterpriseContext);

      // Enterprise should have higher limits
      expect(enterpriseResult.limit).toBeGreaterThan(freeResult.limit);
    });
  });

  describe('headers', () => {
    it('should include standard rate limit headers', async () => {
      const context: RateLimitContext = {
        userId: 'user-headers',
        endpoint: '/api/v1/content',
        method: 'GET',
      };

      const result = await rateLimiter.check(context);

      expect(result.headers).toBeDefined();
      expect(result.headers['X-RateLimit-Limit']).toBeDefined();
      expect(result.headers['X-RateLimit-Remaining']).toBeDefined();
      expect(result.headers['X-RateLimit-Reset']).toBeDefined();
    });

    it('should include Retry-After when rate limited', async () => {
      const context: RateLimitContext = {
        ip: '192.168.1.100',
        endpoint: '/api/v1/auth/login',
        method: 'POST',
      };

      // Exhaust limit
      for (let i = 0; i < 6; i++) {
        await rateLimiter.consume(context);
      }

      const result = await rateLimiter.check(context);

      expect(result.allowed).toBe(false);
      expect(result.headers['Retry-After']).toBeDefined();
    });
  });

  describe('rule management', () => {
    it('should add custom rules', async () => {
      rateLimiter.addRule({
        id: 'custom-rule',
        match: { path: '/api/v1/custom/*' },
        limits: { limit: 5, windowSeconds: 60 },
        algorithm: 'fixed-window',
        priority: 150,
        scope: ['user'],
      });

      const context: RateLimitContext = {
        userId: 'custom-user',
        endpoint: '/api/v1/custom/endpoint',
        method: 'GET',
      };

      const result = await rateLimiter.check(context);

      expect(result.rule?.id).toBe('custom-rule');
    });

    it('should remove rules', async () => {
      const removed = rateLimiter.removeRule('auth-login');
      expect(removed).toBe(true);

      const rules = rateLimiter.getRules();
      expect(rules.find((r) => r.id === 'auth-login')).toBeUndefined();
    });
  });

  describe('bypass management', () => {
    it('should add and remove bypass IPs', async () => {
      rateLimiter.addBypassIP('10.0.0.200');

      const context: RateLimitContext = {
        ip: '10.0.0.200',
        endpoint: '/api/v1/test',
        method: 'GET',
      };

      let result = await rateLimiter.check(context);
      expect(result.key).toBe('bypass');

      rateLimiter.removeBypassIP('10.0.0.200');

      result = await rateLimiter.check(context);
      expect(result.key).not.toBe('bypass');
    });

    it('should add and remove bypass API keys', async () => {
      rateLimiter.addBypassApiKey('super-secret-key');

      const context: RateLimitContext = {
        apiKey: 'super-secret-key',
        endpoint: '/api/v1/test',
        method: 'GET',
      };

      let result = await rateLimiter.check(context);
      expect(result.key).toBe('bypass');

      rateLimiter.removeBypassApiKey('super-secret-key');

      result = await rateLimiter.check(context);
      expect(result.key).not.toBe('bypass');
    });
  });

  describe('reset', () => {
    it('should reset rate limit for a key', async () => {
      const context: RateLimitContext = {
        userId: 'reset-user',
        endpoint: '/api/v1/content',
        method: 'GET',
      };

      // Consume some requests
      await rateLimiter.consume(context);
      await rateLimiter.consume(context);
      await rateLimiter.consume(context);

      const beforeReset = await rateLimiter.check(context);

      // Reset
      await rateLimiter.reset(beforeReset.key);

      const afterReset = await rateLimiter.check(context);

      expect(afterReset.remaining).toBeGreaterThan(beforeReset.remaining);
    });
  });
});
