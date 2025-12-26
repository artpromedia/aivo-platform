/**
 * Quota Manager
 *
 * Manages daily, weekly, and monthly quotas for users and tenants.
 *
 * @example
 * ```typescript
 * const quotaManager = new QuotaManager({
 *   store: redisStore,
 *   quotas: {
 *     'ai-requests': { daily: 100, monthly: 2000 },
 *     'file-uploads': { daily: 50, monthly: 500 },
 *   },
 * });
 *
 * // Check quota
 * const available = await quotaManager.check('user:123', 'ai-requests');
 *
 * // Consume quota
 * await quotaManager.consume('user:123', 'ai-requests', 1);
 *
 * // Get usage
 * const usage = await quotaManager.getUsage('user:123', 'ai-requests');
 * ```
 */

import { RateLimitStore } from './stores/types';
import { MemoryStore } from './stores/memory-store';
import { QuotaUsage } from './types';
import { RateLimiterLogger, noopLogger } from './logger';

export interface QuotaDefinition {
  /** Daily limit */
  daily?: number;
  /** Weekly limit */
  weekly?: number;
  /** Monthly limit */
  monthly?: number;
  /** Burst allowance (can exceed limits temporarily) */
  burstAllowance?: number;
  /** Whether to carry over unused quota */
  carryOver?: boolean;
  /** Maximum carry over amount */
  maxCarryOver?: number;
}

export interface QuotaManagerOptions {
  /** Storage backend */
  store?: RateLimitStore;
  /** Quota definitions by name */
  quotas?: Record<string, QuotaDefinition>;
  /** Logger instance */
  logger?: RateLimiterLogger;
  /** Timezone for reset calculations */
  timezone?: string;
}

export interface QuotaCheckResult {
  allowed: boolean;
  quotaName: string;
  remaining: {
    daily?: number;
    weekly?: number;
    monthly?: number;
  };
  reset: {
    daily?: number;
    weekly?: number;
    monthly?: number;
  };
  exceededPeriods: ('daily' | 'weekly' | 'monthly')[];
}

export class QuotaManager {
  private readonly store: RateLimitStore;
  private readonly quotas: Record<string, QuotaDefinition>;
  private readonly logger: RateLimiterLogger;
  private readonly timezone: string;

  constructor(options: QuotaManagerOptions = {}) {
    this.store = options.store ?? new MemoryStore();
    this.quotas = options.quotas ?? {};
    this.logger = options.logger ?? noopLogger;
    this.timezone = options.timezone ?? 'UTC';
  }

  /**
   * Register a quota definition
   */
  registerQuota(name: string, definition: QuotaDefinition): void {
    this.quotas[name] = definition;
    this.logger.info('Quota registered', { name, definition });
  }

  /**
   * Check if quota is available
   */
  async check(
    entityKey: string,
    quotaName: string,
    cost: number = 1
  ): Promise<QuotaCheckResult> {
    const definition = this.quotas[quotaName];
    if (!definition) {
      throw new Error(`Unknown quota: ${quotaName}`);
    }

    const usage = await this.getUsage(entityKey, quotaName);
    const exceededPeriods: ('daily' | 'weekly' | 'monthly')[] = [];
    const remaining: QuotaCheckResult['remaining'] = {};
    const reset: QuotaCheckResult['reset'] = {};

    // Check daily quota
    if (definition.daily !== undefined) {
      const dailyRemaining = Math.max(0, definition.daily - (usage.daily?.used ?? 0));
      remaining.daily = dailyRemaining;
      reset.daily = this.getResetTime('daily');
      if (dailyRemaining < cost) {
        exceededPeriods.push('daily');
      }
    }

    // Check weekly quota
    if (definition.weekly !== undefined) {
      const weeklyRemaining = Math.max(0, definition.weekly - (usage.weekly?.used ?? 0));
      remaining.weekly = weeklyRemaining;
      reset.weekly = this.getResetTime('weekly');
      if (weeklyRemaining < cost) {
        exceededPeriods.push('weekly');
      }
    }

    // Check monthly quota
    if (definition.monthly !== undefined) {
      const monthlyRemaining = Math.max(0, definition.monthly - (usage.monthly?.used ?? 0));
      remaining.monthly = monthlyRemaining;
      reset.monthly = this.getResetTime('monthly');
      if (monthlyRemaining < cost) {
        exceededPeriods.push('monthly');
      }
    }

    const allowed = exceededPeriods.length === 0;

    this.logger.debug('Quota check', {
      entityKey,
      quotaName,
      cost,
      allowed,
      exceededPeriods,
      remaining,
    });

    return {
      allowed,
      quotaName,
      remaining,
      reset,
      exceededPeriods,
    };
  }

  /**
   * Consume quota
   */
  async consume(
    entityKey: string,
    quotaName: string,
    cost: number = 1
  ): Promise<QuotaCheckResult> {
    const definition = this.quotas[quotaName];
    if (!definition) {
      throw new Error(`Unknown quota: ${quotaName}`);
    }

    // Check first
    const checkResult = await this.check(entityKey, quotaName, cost);

    // Consume even if not allowed (for tracking purposes)
    const now = Date.now();

    // Increment daily counter
    if (definition.daily !== undefined) {
      const dailyKey = this.getDailyKey(entityKey, quotaName);
      const ttl = this.getResetTime('daily') - now;
      await this.store.increment(dailyKey, cost, ttl);
    }

    // Increment weekly counter
    if (definition.weekly !== undefined) {
      const weeklyKey = this.getWeeklyKey(entityKey, quotaName);
      const ttl = this.getResetTime('weekly') - now;
      await this.store.increment(weeklyKey, cost, ttl);
    }

    // Increment monthly counter
    if (definition.monthly !== undefined) {
      const monthlyKey = this.getMonthlyKey(entityKey, quotaName);
      const ttl = this.getResetTime('monthly') - now;
      await this.store.increment(monthlyKey, cost, ttl);
    }

    this.logger.debug('Quota consumed', {
      entityKey,
      quotaName,
      cost,
      allowed: checkResult.allowed,
    });

    // Return updated check result
    return this.check(entityKey, quotaName, 0);
  }

  /**
   * Get current usage for an entity
   */
  async getUsage(entityKey: string, quotaName: string): Promise<QuotaUsage> {
    const definition = this.quotas[quotaName];
    if (!definition) {
      throw new Error(`Unknown quota: ${quotaName}`);
    }

    const usage: QuotaUsage = {};

    // Get daily usage
    if (definition.daily !== undefined) {
      const dailyKey = this.getDailyKey(entityKey, quotaName);
      const dailyUsed = await this.getCounter(dailyKey);
      usage.daily = {
        used: dailyUsed,
        limit: definition.daily,
        remaining: Math.max(0, definition.daily - dailyUsed),
        reset: this.getResetTime('daily'),
      };
    }

    // Get weekly usage
    if (definition.weekly !== undefined) {
      const weeklyKey = this.getWeeklyKey(entityKey, quotaName);
      const weeklyUsed = await this.getCounter(weeklyKey);
      usage.weekly = {
        used: weeklyUsed,
        limit: definition.weekly,
        remaining: Math.max(0, definition.weekly - weeklyUsed),
        reset: this.getResetTime('weekly'),
      };
    }

    // Get monthly usage
    if (definition.monthly !== undefined) {
      const monthlyKey = this.getMonthlyKey(entityKey, quotaName);
      const monthlyUsed = await this.getCounter(monthlyKey);
      usage.monthly = {
        used: monthlyUsed,
        limit: definition.monthly,
        remaining: Math.max(0, definition.monthly - monthlyUsed),
        reset: this.getResetTime('monthly'),
      };
    }

    return usage;
  }

  /**
   * Reset usage for an entity
   */
  async resetUsage(
    entityKey: string,
    quotaName: string,
    period?: 'daily' | 'weekly' | 'monthly'
  ): Promise<void> {
    if (period) {
      const key = this.getKey(entityKey, quotaName, period);
      await this.store.delete(key);
    } else {
      // Reset all periods
      await Promise.all([
        this.store.delete(this.getDailyKey(entityKey, quotaName)),
        this.store.delete(this.getWeeklyKey(entityKey, quotaName)),
        this.store.delete(this.getMonthlyKey(entityKey, quotaName)),
      ]);
    }

    this.logger.info('Quota usage reset', { entityKey, quotaName, period });
  }

  /**
   * Add bonus quota to an entity
   */
  async addBonus(
    entityKey: string,
    quotaName: string,
    amount: number,
    period: 'daily' | 'weekly' | 'monthly'
  ): Promise<void> {
    const bonusKey = `quota:bonus:${entityKey}:${quotaName}:${period}`;
    const ttl = this.getResetTime(period) - Date.now();
    await this.store.increment(bonusKey, amount, ttl);

    this.logger.info('Bonus quota added', {
      entityKey,
      quotaName,
      amount,
      period,
    });
  }

  /**
   * Get counter value from store
   */
  private async getCounter(key: string): Promise<number> {
    const value = await this.store.get(key);
    return value ? parseInt(value, 10) : 0;
  }

  /**
   * Get daily key
   */
  private getDailyKey(entityKey: string, quotaName: string): string {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0];
    return `quota:${entityKey}:${quotaName}:daily:${dateStr}`;
  }

  /**
   * Get weekly key
   */
  private getWeeklyKey(entityKey: string, quotaName: string): string {
    const date = new Date();
    const weekNumber = this.getWeekNumber(date);
    const year = date.getFullYear();
    return `quota:${entityKey}:${quotaName}:weekly:${year}-W${weekNumber}`;
  }

  /**
   * Get monthly key
   */
  private getMonthlyKey(entityKey: string, quotaName: string): string {
    const date = new Date();
    const monthStr = date.toISOString().slice(0, 7);
    return `quota:${entityKey}:${quotaName}:monthly:${monthStr}`;
  }

  /**
   * Get key by period
   */
  private getKey(
    entityKey: string,
    quotaName: string,
    period: 'daily' | 'weekly' | 'monthly'
  ): string {
    switch (period) {
      case 'daily':
        return this.getDailyKey(entityKey, quotaName);
      case 'weekly':
        return this.getWeeklyKey(entityKey, quotaName);
      case 'monthly':
        return this.getMonthlyKey(entityKey, quotaName);
    }
  }

  /**
   * Get ISO week number
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  /**
   * Get reset time for a period
   */
  private getResetTime(period: 'daily' | 'weekly' | 'monthly'): number {
    const now = new Date();

    switch (period) {
      case 'daily': {
        // Reset at midnight UTC
        const tomorrow = new Date(now);
        tomorrow.setUTCHours(24, 0, 0, 0);
        return tomorrow.getTime();
      }
      case 'weekly': {
        // Reset on Monday at midnight UTC
        const daysUntilMonday = (8 - now.getUTCDay()) % 7 || 7;
        const nextMonday = new Date(now);
        nextMonday.setUTCDate(nextMonday.getUTCDate() + daysUntilMonday);
        nextMonday.setUTCHours(0, 0, 0, 0);
        return nextMonday.getTime();
      }
      case 'monthly': {
        // Reset on the first of next month at midnight UTC
        const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
        return nextMonth.getTime();
      }
    }
  }

  /**
   * Get all quota definitions
   */
  getQuotaDefinitions(): Record<string, QuotaDefinition> {
    return { ...this.quotas };
  }
}
