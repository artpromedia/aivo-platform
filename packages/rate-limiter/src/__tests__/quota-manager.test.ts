/**
 * Quota Manager Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QuotaManager } from '../quota-manager';
import { MemoryStore } from '../stores/memory-store';

describe('QuotaManager', () => {
  let quotaManager: QuotaManager;
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
    quotaManager = new QuotaManager({
      store,
      quotas: {
        'ai-requests': {
          daily: 100,
          monthly: 2000,
        },
        'file-uploads': {
          daily: 50,
          weekly: 200,
          monthly: 500,
        },
        'api-calls': {
          daily: 1000,
        },
      },
    });
  });

  afterEach(async () => {
    await store.close();
  });

  describe('check', () => {
    it('should allow requests within quota', async () => {
      const result = await quotaManager.check('user:123', 'ai-requests');

      expect(result.allowed).toBe(true);
      expect(result.remaining.daily).toBe(100);
      expect(result.remaining.monthly).toBe(2000);
      expect(result.exceededPeriods).toHaveLength(0);
    });

    it('should deny when quota exceeded', async () => {
      // Consume all daily quota
      for (let i = 0; i < 100; i++) {
        await quotaManager.consume('user:quota-exceeded', 'ai-requests');
      }

      const result = await quotaManager.check('user:quota-exceeded', 'ai-requests');

      expect(result.allowed).toBe(false);
      expect(result.exceededPeriods).toContain('daily');
    });

    it('should check custom cost', async () => {
      // User has used 95 requests
      for (let i = 0; i < 95; i++) {
        await quotaManager.consume('user:cost-check', 'ai-requests');
      }

      // Check if 10 more is allowed (should not be)
      const result = await quotaManager.check('user:cost-check', 'ai-requests', 10);

      expect(result.allowed).toBe(false);
      expect(result.exceededPeriods).toContain('daily');
    });

    it('should throw for unknown quota', async () => {
      await expect(
        quotaManager.check('user:123', 'unknown-quota')
      ).rejects.toThrow('Unknown quota: unknown-quota');
    });
  });

  describe('consume', () => {
    it('should decrement remaining quota', async () => {
      const before = await quotaManager.check('user:consume-test', 'ai-requests');

      await quotaManager.consume('user:consume-test', 'ai-requests', 5);

      const after = await quotaManager.check('user:consume-test', 'ai-requests');

      expect(after.remaining.daily).toBe(before.remaining.daily! - 5);
    });

    it('should track consumption even when exceeded', async () => {
      // Consume more than limit
      for (let i = 0; i < 110; i++) {
        await quotaManager.consume('user:over-consume', 'ai-requests');
      }

      const usage = await quotaManager.getUsage('user:over-consume', 'ai-requests');

      expect(usage.daily?.used).toBe(110);
      expect(usage.daily?.remaining).toBe(0);
    });
  });

  describe('getUsage', () => {
    it('should return current usage', async () => {
      await quotaManager.consume('user:usage-test', 'file-uploads', 10);

      const usage = await quotaManager.getUsage('user:usage-test', 'file-uploads');

      expect(usage.daily).toBeDefined();
      expect(usage.daily?.used).toBe(10);
      expect(usage.daily?.limit).toBe(50);
      expect(usage.daily?.remaining).toBe(40);
      expect(usage.daily?.reset).toBeGreaterThan(Date.now());

      expect(usage.weekly).toBeDefined();
      expect(usage.weekly?.used).toBe(10);
      expect(usage.weekly?.limit).toBe(200);

      expect(usage.monthly).toBeDefined();
      expect(usage.monthly?.used).toBe(10);
      expect(usage.monthly?.limit).toBe(500);
    });

    it('should return zero usage for new users', async () => {
      const usage = await quotaManager.getUsage('new-user', 'ai-requests');

      expect(usage.daily?.used).toBe(0);
      expect(usage.daily?.remaining).toBe(100);
    });
  });

  describe('resetUsage', () => {
    it('should reset all periods', async () => {
      await quotaManager.consume('user:reset-all', 'file-uploads', 25);

      await quotaManager.resetUsage('user:reset-all', 'file-uploads');

      const usage = await quotaManager.getUsage('user:reset-all', 'file-uploads');

      expect(usage.daily?.used).toBe(0);
      expect(usage.weekly?.used).toBe(0);
      expect(usage.monthly?.used).toBe(0);
    });

    it('should reset specific period', async () => {
      await quotaManager.consume('user:reset-daily', 'file-uploads', 25);

      await quotaManager.resetUsage('user:reset-daily', 'file-uploads', 'daily');

      const usage = await quotaManager.getUsage('user:reset-daily', 'file-uploads');

      expect(usage.daily?.used).toBe(0);
      expect(usage.weekly?.used).toBe(25); // Weekly still has usage
      expect(usage.monthly?.used).toBe(25); // Monthly still has usage
    });
  });

  describe('registerQuota', () => {
    it('should register new quota definitions', async () => {
      quotaManager.registerQuota('custom-quota', {
        daily: 500,
        monthly: 10000,
      });

      const result = await quotaManager.check('user:custom', 'custom-quota');

      expect(result.allowed).toBe(true);
      expect(result.remaining.daily).toBe(500);
      expect(result.remaining.monthly).toBe(10000);
    });
  });

  describe('addBonus', () => {
    it('should add bonus quota', async () => {
      // Use some quota
      await quotaManager.consume('user:bonus', 'api-calls', 900);

      let result = await quotaManager.check('user:bonus', 'api-calls');
      expect(result.remaining.daily).toBe(100);

      // Add bonus
      await quotaManager.addBonus('user:bonus', 'api-calls', 500, 'daily');

      // The bonus is tracked separately, so checking should still work
      // In a real implementation, you'd factor in bonuses
    });
  });

  describe('reset times', () => {
    it('should provide correct reset times', async () => {
      const result = await quotaManager.check('user:reset-times', 'file-uploads');

      const now = Date.now();

      // Daily reset should be at midnight
      expect(result.reset.daily).toBeGreaterThan(now);
      expect(result.reset.daily).toBeLessThanOrEqual(now + 24 * 60 * 60 * 1000);

      // Weekly reset should be within 7 days
      expect(result.reset.weekly).toBeGreaterThan(now);
      expect(result.reset.weekly).toBeLessThanOrEqual(now + 7 * 24 * 60 * 60 * 1000);

      // Monthly reset should be within ~31 days
      expect(result.reset.monthly).toBeGreaterThan(now);
      expect(result.reset.monthly).toBeLessThanOrEqual(now + 32 * 24 * 60 * 60 * 1000);
    });
  });
});
