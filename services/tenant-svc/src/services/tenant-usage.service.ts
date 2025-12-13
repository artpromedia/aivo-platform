/**
 * Tenant Usage Service
 *
 * Tracks daily usage aggregates for tenant quota management.
 * Handles LLM calls, tutor turns, and storage tracking with
 * automatic quota checking and alerting.
 *
 * @module services/tenant-usage.service
 */

import type { Redis } from 'ioredis';

// Types will be properly typed after prisma generate is run
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaClient = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TenantUsage = any;

// ══════════════════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════════════════

export interface TenantUsageData {
  id: string;
  tenantId: string;
  usageDate: Date;

  // LLM Usage
  llmCallCount: number;
  llmTokensUsed: bigint;
  llmCostCents: number;

  // Tutor Usage
  tutorTurnCount: number;
  sessionCount: number;
  activeUsers: number;

  // Storage Usage
  storageUsedMB: number;
  filesUploaded: number;

  // Quota Status
  llmQuotaReached: boolean;
  tutorQuotaReached: boolean;
  quotaWarningAt: Date | null;
  quotaBlockedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface UsageIncrement {
  llmCalls?: number;
  llmTokens?: number;
  llmCostCents?: number;
  tutorTurns?: number;
  sessions?: number;
  activeUsers?: number;
  storageMB?: number;
  filesUploaded?: number;
}

export interface QuotaLimits {
  dailyLLMCallLimit: number;
  dailyTutorTurnLimit: number;
  storageQuotaGB: number;
}

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  usagePercent: number;
  currentUsage: number;
  limit: number;
  warningThreshold: boolean;
}

export interface TenantUsageServiceConfig {
  redis?: Redis | null;
  prisma: PrismaClient;
  quotaWarningThreshold?: number; // Default 0.8 (80%)
}

// Cache key prefixes
const CACHE_PREFIX = {
  USAGE_TODAY: 'tenant:usage:today:',
  QUOTA_STATUS: 'tenant:quota:',
};

// ══════════════════════════════════════════════════════════════════════════════
// Service Implementation
// ══════════════════════════════════════════════════════════════════════════════

export class TenantUsageService {
  private readonly redis: Redis | null;
  private readonly prisma: PrismaClient;
  private readonly quotaWarningThreshold: number;

  constructor(config: TenantUsageServiceConfig) {
    this.redis = config.redis ?? null;
    this.prisma = config.prisma;
    this.quotaWarningThreshold = config.quotaWarningThreshold ?? 0.8;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Usage Tracking
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Get today's usage for a tenant
   */
  async getTodayUsage(tenantId: string): Promise<TenantUsageData> {
    const today = this.getDateOnly(new Date());

    // Try cache first
    if (this.redis) {
      const cacheKey = `${CACHE_PREFIX.USAGE_TODAY}${tenantId}`;
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached) as TenantUsageData;
        }
      } catch {
        // Redis error - continue to DB
      }
    }

    // Get or create today's usage record
    const usage = await this.prisma.tenantUsage.upsert({
      where: {
        tenantId_usageDate: {
          tenantId,
          usageDate: today,
        },
      },
      create: {
        tenantId,
        usageDate: today,
      },
      update: {},
    });

    const usageData = this.mapToUsageData(usage);

    // Cache for short period (1 minute - frequent updates expected)
    if (this.redis) {
      const cacheKey = `${CACHE_PREFIX.USAGE_TODAY}${tenantId}`;
      try {
        await this.redis.setex(cacheKey, 60, JSON.stringify(usageData));
      } catch {
        // Redis error - continue
      }
    }

    return usageData;
  }

  /**
   * Increment usage counters for a tenant
   *
   * @param tenantId - Tenant to increment usage for
   * @param increment - Usage values to increment
   * @returns Updated usage data
   */
  async incrementUsage(tenantId: string, increment: UsageIncrement): Promise<TenantUsageData> {
    const today = this.getDateOnly(new Date());

    // Build increment data
    const updates: Record<string, { increment: number }> = {};

    if (increment.llmCalls) {
      updates.llmCallCount = { increment: increment.llmCalls };
    }
    if (increment.llmTokens) {
      updates.llmTokensUsed = { increment: increment.llmTokens };
    }
    if (increment.llmCostCents) {
      updates.llmCostCents = { increment: increment.llmCostCents };
    }
    if (increment.tutorTurns) {
      updates.tutorTurnCount = { increment: increment.tutorTurns };
    }
    if (increment.sessions) {
      updates.sessionCount = { increment: increment.sessions };
    }
    if (increment.activeUsers) {
      updates.activeUsers = { increment: increment.activeUsers };
    }
    if (increment.storageMB) {
      updates.storageUsedMB = { increment: increment.storageMB };
    }
    if (increment.filesUploaded) {
      updates.filesUploaded = { increment: increment.filesUploaded };
    }

    const usage = await this.prisma.tenantUsage.upsert({
      where: {
        tenantId_usageDate: {
          tenantId,
          usageDate: today,
        },
      },
      create: {
        tenantId,
        usageDate: today,
        ...Object.fromEntries(
          Object.entries(updates).map(([key, value]) => [key, value.increment])
        ),
      },
      update: updates,
    });

    const usageData = this.mapToUsageData(usage);

    // Invalidate cache
    if (this.redis) {
      const cacheKey = `${CACHE_PREFIX.USAGE_TODAY}${tenantId}`;
      try {
        await this.redis.del(cacheKey);
      } catch {
        // Redis error - continue
      }
    }

    return usageData;
  }

  /**
   * Record an LLM call and check quota
   *
   * @returns QuotaCheckResult indicating if the call is allowed
   */
  async recordLLMCall(
    tenantId: string,
    tokensUsed: number,
    costCents: number,
    limits: QuotaLimits
  ): Promise<QuotaCheckResult> {
    // Check quota first
    const quotaCheck = await this.checkLLMQuota(tenantId, limits);
    if (!quotaCheck.allowed) {
      return quotaCheck;
    }

    // Record the usage
    await this.incrementUsage(tenantId, {
      llmCalls: 1,
      llmTokens: tokensUsed,
      llmCostCents: costCents,
    });

    // Update quota status if threshold reached
    if (quotaCheck.usagePercent >= this.quotaWarningThreshold && !quotaCheck.warningThreshold) {
      await this.updateQuotaStatus(tenantId, 'llm', 'warning');
    }

    if (quotaCheck.usagePercent >= 1.0) {
      await this.updateQuotaStatus(tenantId, 'llm', 'blocked');
    }

    return quotaCheck;
  }

  /**
   * Record a tutor turn and check quota
   */
  async recordTutorTurn(tenantId: string, limits: QuotaLimits): Promise<QuotaCheckResult> {
    // Check quota first
    const quotaCheck = await this.checkTutorQuota(tenantId, limits);
    if (!quotaCheck.allowed) {
      return quotaCheck;
    }

    // Record the usage
    await this.incrementUsage(tenantId, {
      tutorTurns: 1,
    });

    // Update quota status if threshold reached
    if (quotaCheck.usagePercent >= this.quotaWarningThreshold && !quotaCheck.warningThreshold) {
      await this.updateQuotaStatus(tenantId, 'tutor', 'warning');
    }

    if (quotaCheck.usagePercent >= 1.0) {
      await this.updateQuotaStatus(tenantId, 'tutor', 'blocked');
    }

    return quotaCheck;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Quota Checking
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Check LLM quota for a tenant
   */
  async checkLLMQuota(tenantId: string, limits: QuotaLimits): Promise<QuotaCheckResult> {
    // Unlimited quota check
    if (limits.dailyLLMCallLimit === 0) {
      return {
        allowed: true,
        usagePercent: 0,
        currentUsage: 0,
        limit: 0,
        warningThreshold: false,
      };
    }

    const usage = await this.getTodayUsage(tenantId);
    const usagePercent = usage.llmCallCount / limits.dailyLLMCallLimit;

    if (usage.llmQuotaReached || usagePercent >= 1.0) {
      return {
        allowed: false,
        reason: `Daily LLM call limit reached (${limits.dailyLLMCallLimit} calls). Quota resets at midnight UTC.`,
        usagePercent: Math.min(usagePercent, 1.0),
        currentUsage: usage.llmCallCount,
        limit: limits.dailyLLMCallLimit,
        warningThreshold: true,
      };
    }

    return {
      allowed: true,
      usagePercent,
      currentUsage: usage.llmCallCount,
      limit: limits.dailyLLMCallLimit,
      warningThreshold: usagePercent >= this.quotaWarningThreshold,
    };
  }

  /**
   * Check tutor turn quota for a tenant
   */
  async checkTutorQuota(tenantId: string, limits: QuotaLimits): Promise<QuotaCheckResult> {
    // Unlimited quota check
    if (limits.dailyTutorTurnLimit === 0) {
      return {
        allowed: true,
        usagePercent: 0,
        currentUsage: 0,
        limit: 0,
        warningThreshold: false,
      };
    }

    const usage = await this.getTodayUsage(tenantId);
    const usagePercent = usage.tutorTurnCount / limits.dailyTutorTurnLimit;

    if (usage.tutorQuotaReached || usagePercent >= 1.0) {
      return {
        allowed: false,
        reason: `Daily tutor turn limit reached (${limits.dailyTutorTurnLimit} turns). Quota resets at midnight UTC.`,
        usagePercent: Math.min(usagePercent, 1.0),
        currentUsage: usage.tutorTurnCount,
        limit: limits.dailyTutorTurnLimit,
        warningThreshold: true,
      };
    }

    return {
      allowed: true,
      usagePercent,
      currentUsage: usage.tutorTurnCount,
      limit: limits.dailyTutorTurnLimit,
      warningThreshold: usagePercent >= this.quotaWarningThreshold,
    };
  }

  /**
   * Check storage quota for a tenant
   */
  async checkStorageQuota(tenantId: string, limits: QuotaLimits): Promise<QuotaCheckResult> {
    // Unlimited quota check
    if (limits.storageQuotaGB === 0) {
      return {
        allowed: true,
        usagePercent: 0,
        currentUsage: 0,
        limit: 0,
        warningThreshold: false,
      };
    }

    const usage = await this.getTodayUsage(tenantId);
    const quotaMB = limits.storageQuotaGB * 1024;
    const usagePercent = usage.storageUsedMB / quotaMB;

    if (usagePercent >= 1.0) {
      return {
        allowed: false,
        reason: `Storage quota exceeded (${limits.storageQuotaGB} GB). Please contact support to increase your storage limit.`,
        usagePercent: Math.min(usagePercent, 1.0),
        currentUsage: usage.storageUsedMB,
        limit: quotaMB,
        warningThreshold: true,
      };
    }

    return {
      allowed: true,
      usagePercent,
      currentUsage: usage.storageUsedMB,
      limit: quotaMB,
      warningThreshold: usagePercent >= this.quotaWarningThreshold,
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Historical Data
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Get usage history for a tenant within a date range
   */
  async getUsageHistory(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TenantUsageData[]> {
    const usage = await this.prisma.tenantUsage.findMany({
      where: {
        tenantId,
        usageDate: {
          gte: this.getDateOnly(startDate),
          lte: this.getDateOnly(endDate),
        },
      },
      orderBy: {
        usageDate: 'desc',
      },
    });

    return usage.map((u: TenantUsage) => this.mapToUsageData(u));
  }

  /**
   * Get aggregated usage for a tenant over a period
   */
  async getAggregatedUsage(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalLLMCalls: number;
    totalLLMTokens: bigint;
    totalLLMCostCents: number;
    totalTutorTurns: number;
    totalSessions: number;
    peakActiveUsers: number;
    averageActiveUsers: number;
    totalStorageUsedMB: number;
    totalFilesUploaded: number;
    daysWithQuotaWarning: number;
    daysQuotaBlocked: number;
  }> {
    const usage = await this.getUsageHistory(tenantId, startDate, endDate);

    if (usage.length === 0) {
      return {
        totalLLMCalls: 0,
        totalLLMTokens: BigInt(0),
        totalLLMCostCents: 0,
        totalTutorTurns: 0,
        totalSessions: 0,
        peakActiveUsers: 0,
        averageActiveUsers: 0,
        totalStorageUsedMB: 0,
        totalFilesUploaded: 0,
        daysWithQuotaWarning: 0,
        daysQuotaBlocked: 0,
      };
    }

    return {
      totalLLMCalls: usage.reduce((sum, u) => sum + u.llmCallCount, 0),
      totalLLMTokens: usage.reduce((sum, u) => sum + u.llmTokensUsed, BigInt(0)),
      totalLLMCostCents: usage.reduce((sum, u) => sum + u.llmCostCents, 0),
      totalTutorTurns: usage.reduce((sum, u) => sum + u.tutorTurnCount, 0),
      totalSessions: usage.reduce((sum, u) => sum + u.sessionCount, 0),
      peakActiveUsers: Math.max(...usage.map((u) => u.activeUsers)),
      averageActiveUsers: Math.round(
        usage.reduce((sum, u) => sum + u.activeUsers, 0) / usage.length
      ),
      totalStorageUsedMB: Math.max(...usage.map((u) => u.storageUsedMB)),
      totalFilesUploaded: usage.reduce((sum, u) => sum + u.filesUploaded, 0),
      daysWithQuotaWarning: usage.filter((u) => u.quotaWarningAt !== null).length,
      daysQuotaBlocked: usage.filter((u) => u.quotaBlockedAt !== null).length,
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Private Helpers
  // ════════════════════════════════════════════════════════════════════════════

  private getDateOnly(date: Date): Date {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  private mapToUsageData(usage: TenantUsage): TenantUsageData {
    return {
      id: usage.id,
      tenantId: usage.tenantId,
      usageDate: usage.usageDate,
      llmCallCount: usage.llmCallCount,
      llmTokensUsed: BigInt(usage.llmTokensUsed),
      llmCostCents: usage.llmCostCents,
      tutorTurnCount: usage.tutorTurnCount,
      sessionCount: usage.sessionCount,
      activeUsers: usage.activeUsers,
      storageUsedMB: usage.storageUsedMB,
      filesUploaded: usage.filesUploaded,
      llmQuotaReached: usage.llmQuotaReached,
      tutorQuotaReached: usage.tutorQuotaReached,
      quotaWarningAt: usage.quotaWarningAt,
      quotaBlockedAt: usage.quotaBlockedAt,
      createdAt: usage.createdAt,
      updatedAt: usage.updatedAt,
    };
  }

  private async updateQuotaStatus(
    tenantId: string,
    quotaType: 'llm' | 'tutor',
    status: 'warning' | 'blocked'
  ): Promise<void> {
    const today = this.getDateOnly(new Date());
    const now = new Date();

    const updateData: Record<string, boolean | Date> = {};

    if (quotaType === 'llm') {
      if (status === 'warning') {
        updateData.quotaWarningAt = now;
      } else {
        updateData.llmQuotaReached = true;
        updateData.quotaBlockedAt = now;
      }
    } else {
      if (status === 'warning') {
        updateData.quotaWarningAt = now;
      } else {
        updateData.tutorQuotaReached = true;
        updateData.quotaBlockedAt = now;
      }
    }

    await this.prisma.tenantUsage.update({
      where: {
        tenantId_usageDate: {
          tenantId,
          usageDate: today,
        },
      },
      data: updateData,
    });

    // Invalidate cache
    if (this.redis) {
      const cacheKey = `${CACHE_PREFIX.USAGE_TODAY}${tenantId}`;
      try {
        await this.redis.del(cacheKey);
      } catch {
        // Redis error - continue
      }
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Singleton Helper
// ══════════════════════════════════════════════════════════════════════════════

let _tenantUsageService: TenantUsageService | null = null;

/**
 * Get the singleton TenantUsageService instance
 */
export function getTenantUsageService(config?: TenantUsageServiceConfig): TenantUsageService {
  if (!_tenantUsageService) {
    if (!config) {
      throw new Error(
        'TenantUsageService not initialized. Call getTenantUsageService(config) first.'
      );
    }
    _tenantUsageService = new TenantUsageService(config);
  }
  return _tenantUsageService;
}
