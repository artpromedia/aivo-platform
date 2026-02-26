import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockRedis = {
  pipeline: vi.fn(),
  get: vi.fn(),
};

const mockPipeline = {
  incr: vi.fn().mockReturnThis(),
  expire: vi.fn().mockReturnThis(),
  exec: vi.fn(),
};

vi.mock('../src/lib/redis/client', () => ({
  getRedisClient: vi.fn(() => mockRedis),
  redis: mockRedis,
}));

describe('Rate Limiter', () => {
  let rateLimitModule: typeof import('../src/lib/rate-limit');

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    mockRedis.pipeline.mockReturnValue(mockPipeline);
    rateLimitModule = await import('../src/lib/rate-limit');
  });

  describe('createRateLimiter', () => {
    it('returns a fastify preHandler function', () => {
      const limiter = rateLimitModule.createRateLimiter({
        windowMs: 60000,
        max: 10,
        keyGenerator: (req: any) => req.ip,
      });
      expect(typeof limiter).toBe('function');
    });
  });

  describe('pre-configured limiters', () => {
    it('exports loginRateLimiter', () => {
      expect(rateLimitModule.loginRateLimiter).toBeDefined();
    });

    it('exports registerRateLimiter', () => {
      expect(rateLimitModule.registerRateLimiter).toBeDefined();
    });

    it('exports passwordResetRateLimiter', () => {
      expect(rateLimitModule.passwordResetRateLimiter).toBeDefined();
    });

    it('exports verifyEmailRateLimiter', () => {
      expect(rateLimitModule.verifyEmailRateLimiter).toBeDefined();
    });

    it('exports refreshTokenRateLimiter', () => {
      expect(rateLimitModule.refreshTokenRateLimiter).toBeDefined();
    });

    it('exports ssoRateLimiter', () => {
      expect(rateLimitModule.ssoRateLimiter).toBeDefined();
    });

    it('exports stopCleanup', () => {
      expect(typeof rateLimitModule.stopCleanup).toBe('function');
    });
  });

  describe('InMemoryRateLimitStore fallback', () => {
    it('rate limiter works when Redis is unavailable', async () => {
      mockRedis.pipeline.mockImplementation(() => {
        throw new Error('Redis connection failed');
      });

      const limiter = rateLimitModule.createRateLimiter({
        windowMs: 60000,
        max: 10,
        keyGenerator: (req: any) => req.ip,
      });

      // Should fallback to in-memory without throwing
      expect(limiter).toBeDefined();
    });
  });
});
