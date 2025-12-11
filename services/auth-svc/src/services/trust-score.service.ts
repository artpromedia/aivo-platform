/**
 * Trust Score Service
 *
 * Main orchestration service for trust score operations.
 * Coordinates data collection, calculation, caching, and notifications.
 */

import type { PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import type { Redis } from 'ioredis';
import type {
  TrustScoreResponse,
  TrustScoreExplanationResponse,
  TrustScoreHistoryPoint,
  TrustScoreBadge,
  ComponentBreakdown,
  NextTierInfo,
  TrustScoreTriggerEvent,
  ReviewData,
  ComplianceData,
  VerificationData,
  TenureData,
  ActivityData,
  TrustTier,
  TrustScoreEntity,
} from '../types/trust-score.types.js';
import { TrustScoreRepository, type TrustScoreWithHistory } from '../repositories/trust-score.repository.js';
import { ComplianceRepository } from '../repositories/compliance.repository.js';
import { TrustScoreCalculatorService } from './trust-score-calculator.service.js';

const CACHE_TTL = 300; // 5 minutes
const HISTORY_LIMIT = 30;

export interface TrustScoreServiceConfig {
  cacheEnabled?: boolean;
  cacheTtl?: number;
}

export interface DataProviders {
  getReviewData: (userId: string) => Promise<ReviewData>;
  getVerificationData: (userId: string) => Promise<VerificationData>;
  getTenureData: (userId: string) => Promise<TenureData>;
  getActivityData: (userId: string) => Promise<ActivityData>;
  getSessionCount: (userId: string) => Promise<number>;
}

export class TrustScoreService {
  private readonly repository: TrustScoreRepository;
  private readonly complianceRepository: ComplianceRepository;
  private readonly calculator: TrustScoreCalculatorService;
  private readonly cacheEnabled: boolean;
  private readonly cacheTtl: number;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis | null,
    private readonly logger: FastifyBaseLogger,
    private readonly dataProviders: DataProviders,
    config: TrustScoreServiceConfig = {}
  ) {
    this.repository = new TrustScoreRepository(prisma);
    this.complianceRepository = new ComplianceRepository(prisma);
    this.calculator = new TrustScoreCalculatorService();
    this.cacheEnabled = config.cacheEnabled ?? true;
    this.cacheTtl = config.cacheTtl ?? CACHE_TTL;
  }

  // ============================================================================
  // Public API Methods
  // ============================================================================

  /**
   * Get trust score for a user (with caching)
   */
  async getTrustScore(userId: string): Promise<TrustScoreResponse> {
    // Try cache first
    if (this.cacheEnabled && this.redis) {
      const cached = await this.getCachedScore(userId);
      if (cached) {
        this.logger.debug({ userId }, 'Trust score retrieved from cache');
        return cached;
      }
    }

    // Get from database
    const trustScore = (await this.repository.findByUserId(userId, {
      includeHistory: true,
      historyLimit: HISTORY_LIMIT,
    })) as TrustScoreWithHistory | null;

    if (!trustScore) {
      // Calculate initial score
      this.logger.info({ userId }, 'Calculating initial trust score');
      return this.calculateAndStore(userId, 'MANUAL_RECALCULATION');
    }

    // Build response
    const response = this.buildTrustScoreResponse(trustScore);

    // Cache the response
    if (this.cacheEnabled && this.redis) {
      await this.cacheScore(userId, response);
    }

    return response;
  }

  /**
   * Get detailed explanation of trust score
   */
  async getTrustScoreExplanation(userId: string): Promise<TrustScoreExplanationResponse> {
    const trustScore = await this.repository.findByUserId(userId);

    if (!trustScore) {
      // Calculate if doesn't exist
      await this.calculateAndStore(userId, 'MANUAL_RECALCULATION');
      const newScore = await this.repository.findByUserId(userId);
      if (!newScore) {
        throw new Error('Failed to calculate trust score');
      }
      return this.buildExplanationResponse(newScore);
    }

    return this.buildExplanationResponse(trustScore);
  }

  /**
   * Recalculate trust score
   */
  async recalculate(userId: string, triggerEvent: TrustScoreTriggerEvent): Promise<TrustScoreResponse> {
    this.logger.info({ userId, triggerEvent }, 'Recalculating trust score');
    return this.calculateAndStore(userId, triggerEvent);
  }

  /**
   * Handle score trigger events
   */
  async handleTriggerEvent(userId: string, event: TrustScoreTriggerEvent): Promise<void> {
    this.logger.info({ userId, event }, 'Trust score trigger event received');

    // Invalidate cache
    if (this.cacheEnabled && this.redis) {
      await this.invalidateCache(userId);
    }

    // Recalculate score
    await this.calculateAndStore(userId, event);
  }

  /**
   * Get score history for a user
   */
  async getScoreHistory(
    userId: string,
    options: { startDate?: Date; endDate?: Date; limit?: number } = {}
  ): Promise<TrustScoreHistoryPoint[]> {
    const trustScore = await this.repository.findByUserId(userId);

    if (!trustScore) {
      return [];
    }

    const history = await this.repository.getHistory(trustScore.id, {
      startDate: options.startDate,
      endDate: options.endDate,
      take: options.limit ?? 90,
    });

    return history.map((h) => ({
      date: h.createdAt.toISOString(),
      score: h.overallScore,
      tier: h.tier,
    }));
  }

  /**
   * Batch recalculate scores for multiple users
   */
  async batchRecalculate(
    userIds: string[],
    triggerEvent: TrustScoreTriggerEvent = 'SCHEDULED_RECALCULATION'
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        await this.calculateAndStore(userId, triggerEvent);
        success++;
      } catch (error) {
        this.logger.error({ userId, error }, 'Failed to recalculate trust score');
        failed++;
      }
    }

    return { success, failed };
  }

  /**
   * Get global statistics
   */
  async getStatistics(): Promise<{
    totalUsers: number;
    averageScore: number;
    tierDistribution: Record<TrustTier, number>;
    trendDistribution: Record<string, number>;
  }> {
    return this.repository.getStatistics();
  }

  // ============================================================================
  // Internal Methods
  // ============================================================================

  /**
   * Calculate and store trust score
   */
  private async calculateAndStore(userId: string, triggerEvent: TrustScoreTriggerEvent): Promise<TrustScoreResponse> {
    // Collect data from all sources
    const [reviewData, verificationData, tenureData, activityData, complianceData] = await Promise.all([
      this.dataProviders.getReviewData(userId),
      this.dataProviders.getVerificationData(userId),
      this.dataProviders.getTenureData(userId),
      this.dataProviders.getActivityData(userId),
      this.collectComplianceData(userId),
    ]);

    // Calculate score
    const result = this.calculator.calculate({
      reviews: reviewData,
      compliance: complianceData,
      verification: verificationData,
      tenure: tenureData,
      activity: activityData,
    });

    // Save to database
    const trustScore = await this.repository.upsert(userId, result);

    // Create history entry
    await this.repository.createHistory({
      trustScoreId: trustScore.id,
      overallScore: result.overallScore,
      reviewScore: result.reviewScore,
      complianceScore: result.complianceScore,
      verificationScore: result.verificationScore,
      tenureScore: result.tenureScore,
      activityScore: result.activityScore,
      tier: result.tier,
      triggerEvent,
    });

    // Get updated score with history
    const updatedScore = (await this.repository.findByUserId(userId, {
      includeHistory: true,
      historyLimit: HISTORY_LIMIT,
    })) as TrustScoreWithHistory;

    // Build response
    const response = this.buildTrustScoreResponse(updatedScore);

    // Cache the response
    if (this.cacheEnabled && this.redis) {
      await this.cacheScore(userId, response);
    }

    // Log score changes
    if (trustScore.previousScore !== null) {
      const change = trustScore.overallScore - trustScore.previousScore;
      this.logger.info(
        {
          userId,
          previousScore: trustScore.previousScore,
          newScore: trustScore.overallScore,
          change,
          tier: result.tier,
        },
        'Trust score updated'
      );
    }

    return response;
  }

  /**
   * Collect compliance data from repository
   */
  private async collectComplianceData(userId: string): Promise<ComplianceData> {
    const [violations, stats, totalSessions, lastViolationAt] = await Promise.all([
      this.complianceRepository.findRecentViolations(userId, 365), // Last year
      this.complianceRepository.getUserStats(userId),
      this.dataProviders.getSessionCount(userId),
      this.complianceRepository.getLastViolationDate(userId),
    ]);

    return {
      totalSessions,
      violationSessions: stats.totalRecords,
      violations: violations.map((v) => ({
        id: v.id,
        eventType: v.eventType,
        severity: v.severity,
        isResolved: v.isResolved,
        createdAt: v.createdAt,
        scoreImpact: v.scoreImpact,
      })),
      lastViolationAt,
    };
  }

  /**
   * Build full trust score response
   */
  private buildTrustScoreResponse(trustScore: TrustScoreWithHistory): TrustScoreResponse {
    return {
      trustScore: {
        overallScore: trustScore.overallScore,
        tier: trustScore.tier,
        tierDescription: TrustScoreCalculatorService.getTierDescription(trustScore.tier),
        trend: trustScore.trend,
        scoreChange: trustScore.scoreChangeAmount,
        components: {
          reviews: {
            score: trustScore.reviewScore,
            weight: trustScore.reviewWeight,
            contribution: Math.round((trustScore.reviewScore * trustScore.reviewWeight) / 100),
          },
          compliance: {
            score: trustScore.complianceScore,
            weight: trustScore.complianceWeight,
            contribution: Math.round((trustScore.complianceScore * trustScore.complianceWeight) / 100),
          },
          verification: {
            score: trustScore.verificationScore,
            weight: trustScore.verificationWeight,
            contribution: Math.round((trustScore.verificationScore * trustScore.verificationWeight) / 100),
          },
          tenure: {
            score: trustScore.tenureScore,
            weight: trustScore.tenureWeight,
            contribution: Math.round((trustScore.tenureScore * trustScore.tenureWeight) / 100),
          },
          activity: {
            score: trustScore.activityScore,
            weight: trustScore.activityWeight,
            contribution: Math.round((trustScore.activityScore * trustScore.activityWeight) / 100),
          },
        },
        factors: trustScore.factors,
        lastCalculatedAt: trustScore.lastCalculatedAt.toISOString(),
      },
      badges: this.calculateBadges(trustScore),
      history: trustScore.history.map((h) => ({
        date: h.createdAt.toISOString(),
        score: h.overallScore,
        tier: h.tier,
      })),
    };
  }

  /**
   * Build explanation response
   */
  private buildExplanationResponse(trustScore: TrustScoreEntity): TrustScoreExplanationResponse {
    const breakdown: ComponentBreakdown[] = [
      {
        component: 'Market Reviews',
        score: trustScore.reviewScore,
        maxScore: 100,
        weight: `${trustScore.reviewWeight}%`,
        details: {
          contribution: Math.round((trustScore.reviewScore * trustScore.reviewWeight) / 100),
        },
        howToImprove:
          trustScore.reviewScore < 80
            ? 'Complete more jobs and earn positive reviews. Consistent 5-star ratings have the most impact.'
            : 'Maintain your excellent review record.',
      },
      {
        component: 'SkillPod Compliance',
        score: trustScore.complianceScore,
        maxScore: 100,
        weight: `${trustScore.complianceWeight}%`,
        details: {
          contribution: Math.round((trustScore.complianceScore * trustScore.complianceWeight) / 100),
        },
        howToImprove:
          trustScore.complianceScore < 100
            ? 'Resolve any outstanding compliance issues and avoid policy violations in sessions.'
            : 'Continue maintaining perfect compliance.',
      },
      {
        component: 'Verification Level',
        score: trustScore.verificationScore,
        maxScore: 100,
        weight: `${trustScore.verificationWeight}%`,
        details: {
          contribution: Math.round((trustScore.verificationScore * trustScore.verificationWeight) / 100),
        },
        howToImprove:
          trustScore.verificationScore < 100
            ? 'Complete additional verification steps and enable two-factor authentication.'
            : 'Your verification is complete.',
      },
      {
        component: 'Platform Tenure',
        score: trustScore.tenureScore,
        maxScore: 100,
        weight: `${trustScore.tenureWeight}%`,
        details: {
          contribution: Math.round((trustScore.tenureScore * trustScore.tenureWeight) / 100),
        },
        howToImprove: 'This score naturally increases as you remain an active member of the platform.',
      },
      {
        component: 'Activity & Responsiveness',
        score: trustScore.activityScore,
        maxScore: 100,
        weight: `${trustScore.activityWeight}%`,
        details: {
          contribution: Math.round((trustScore.activityScore * trustScore.activityWeight) / 100),
        },
        howToImprove:
          trustScore.activityScore < 80
            ? 'Respond to messages promptly, keep your profile updated, and maintain regular activity.'
            : 'Maintain your excellent responsiveness.',
      },
    ];

    // Calculate next tier info
    const pointsToNext = TrustScoreCalculatorService.getPointsToNextTier(trustScore.overallScore, trustScore.tier);

    let nextTier: NextTierInfo | null = null;
    if (pointsToNext !== null) {
      const tierOrder: TrustTier[] = ['EMERGING', 'ESTABLISHED', 'TRUSTED', 'HIGHLY_TRUSTED', 'ELITE'];
      const currentIndex = tierOrder.indexOf(trustScore.tier);
      const nextTierName = tierOrder[currentIndex + 1];

      // Find best suggestion
      const suggestions = trustScore.factors.suggestions;
      const topSuggestion = suggestions.length > 0 ? suggestions[0].suggestion : null;

      nextTier = {
        name: nextTierName,
        requiredScore:
          trustScore.tier === 'EMERGING'
            ? 40
            : trustScore.tier === 'ESTABLISHED'
              ? 60
              : trustScore.tier === 'TRUSTED'
                ? 80
                : 95,
        pointsNeeded: Math.ceil(pointsToNext),
        topSuggestion,
      };
    }

    return {
      overallScore: trustScore.overallScore,
      tier: trustScore.tier,
      tierDescription: TrustScoreCalculatorService.getTierDescription(trustScore.tier),
      breakdown,
      nextTier,
    };
  }

  /**
   * Calculate earned badges
   */
  private calculateBadges(trustScore: TrustScoreEntity): TrustScoreBadge[] {
    const badges: TrustScoreBadge[] = [];

    // Tier-based badges
    if (trustScore.tier === 'ELITE') {
      badges.push({
        name: 'Elite Member',
        icon: 'star-gold',
        description: 'Top performer with outstanding reputation',
        earnedAt: trustScore.updatedAt.toISOString(),
      });
    } else if (trustScore.tier === 'HIGHLY_TRUSTED') {
      badges.push({
        name: 'Highly Trusted',
        icon: 'shield-check',
        description: 'Exceptional performance and reliability',
        earnedAt: trustScore.updatedAt.toISOString(),
      });
    }

    // Component-specific badges
    if (trustScore.complianceScore === 100) {
      badges.push({
        name: 'Perfect Compliance',
        icon: 'shield',
        description: 'Flawless SkillPod session compliance',
        earnedAt: trustScore.updatedAt.toISOString(),
      });
    }

    if (trustScore.verificationScore >= 90) {
      badges.push({
        name: 'Fully Verified',
        icon: 'badge-check',
        description: 'Completed all verification requirements',
        earnedAt: trustScore.updatedAt.toISOString(),
      });
    }

    // Trend badges
    if (trustScore.trend === 'RISING' && trustScore.scoreChangeAmount && trustScore.scoreChangeAmount >= 10) {
      badges.push({
        name: 'Rising Star',
        icon: 'trending-up',
        description: 'Trust score improving rapidly',
        earnedAt: trustScore.updatedAt.toISOString(),
      });
    }

    return badges;
  }

  // ============================================================================
  // Caching Methods
  // ============================================================================

  private getCacheKey(userId: string): string {
    return `trust-score:${userId}`;
  }

  private async getCachedScore(userId: string): Promise<TrustScoreResponse | null> {
    if (!this.redis) return null;

    try {
      const cached = await this.redis.get(this.getCacheKey(userId));
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      this.logger.warn({ error, userId }, 'Failed to get cached trust score');
    }

    return null;
  }

  private async cacheScore(userId: string, response: TrustScoreResponse): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.setex(this.getCacheKey(userId), this.cacheTtl, JSON.stringify(response));
    } catch (error) {
      this.logger.warn({ error, userId }, 'Failed to cache trust score');
    }
  }

  private async invalidateCache(userId: string): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.del(this.getCacheKey(userId));
    } catch (error) {
      this.logger.warn({ error, userId }, 'Failed to invalidate trust score cache');
    }
  }
}
