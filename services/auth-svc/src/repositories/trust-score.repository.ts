/**
 * Trust Score Repository
 *
 * Data access layer for trust scores and history
 */

import type { PrismaClient, Prisma } from '@prisma/client';
import type {
  TrustScoreEntity,
  TrustScoreHistoryEntity,
  TrustTier,
  TrustTrend,
  TrustScoreFactors,
  TrustScoreResult,
} from '../types/trust-score.types.js';

export interface FindTrustScoreOptions {
  includeHistory?: boolean;
  historyLimit?: number;
}

export interface TrustScoreCreateInput {
  userId: string;
  overallScore: number;
  reviewScore: number;
  complianceScore: number;
  verificationScore: number;
  tenureScore: number;
  activityScore: number;
  reviewWeight?: number;
  complianceWeight?: number;
  verificationWeight?: number;
  tenureWeight?: number;
  activityWeight?: number;
  tier: TrustTier;
  trend?: TrustTrend;
  previousScore?: number | null;
  scoreChangeAmount?: number | null;
  calculationVersion?: number;
  factors: TrustScoreFactors;
}

export interface TrustScoreUpdateInput {
  overallScore: number;
  reviewScore: number;
  complianceScore: number;
  verificationScore: number;
  tenureScore: number;
  activityScore: number;
  tier: TrustTier;
  trend: TrustTrend;
  previousScore: number;
  scoreChangeAmount: number;
  calculationVersion: number;
  factors: TrustScoreFactors;
}

export interface HistoryCreateInput {
  trustScoreId: string;
  overallScore: number;
  reviewScore: number;
  complianceScore: number;
  verificationScore: number;
  tenureScore: number;
  activityScore: number;
  tier: TrustTier;
  triggerEvent: string;
}

export interface PaginationOptions {
  skip?: number;
  take?: number;
}

export interface TrustScoreWithHistory extends TrustScoreEntity {
  history: TrustScoreHistoryEntity[];
}

export class TrustScoreRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find trust score by user ID
   */
  async findByUserId(
    userId: string,
    options: FindTrustScoreOptions = {}
  ): Promise<TrustScoreEntity | TrustScoreWithHistory | null> {
    const { includeHistory = false, historyLimit = 30 } = options;

    const trustScore = await this.prisma.trustScore.findUnique({
      where: { userId },
      include: includeHistory
        ? {
            history: {
              take: historyLimit,
              orderBy: { createdAt: 'desc' },
            },
          }
        : undefined,
    });

    if (!trustScore) {
      return null;
    }

    return this.mapToEntity(trustScore, includeHistory);
  }

  /**
   * Find trust score by ID
   */
  async findById(id: string): Promise<TrustScoreEntity | null> {
    const trustScore = await this.prisma.trustScore.findUnique({
      where: { id },
    });

    if (!trustScore) {
      return null;
    }

    return this.mapToEntity(trustScore, false);
  }

  /**
   * Create a new trust score
   */
  async create(input: TrustScoreCreateInput): Promise<TrustScoreEntity> {
    const trustScore = await this.prisma.trustScore.create({
      data: {
        userId: input.userId,
        overallScore: input.overallScore,
        reviewScore: input.reviewScore,
        complianceScore: input.complianceScore,
        verificationScore: input.verificationScore,
        tenureScore: input.tenureScore,
        activityScore: input.activityScore,
        reviewWeight: input.reviewWeight ?? 40,
        complianceWeight: input.complianceWeight ?? 25,
        verificationWeight: input.verificationWeight ?? 20,
        tenureWeight: input.tenureWeight ?? 10,
        activityWeight: input.activityWeight ?? 5,
        tier: input.tier,
        trend: input.trend ?? 'STABLE',
        previousScore: input.previousScore,
        scoreChangeAmount: input.scoreChangeAmount,
        calculationVersion: input.calculationVersion ?? 1,
        factors: input.factors as unknown as Prisma.InputJsonValue,
      },
    });

    return this.mapToEntity(trustScore, false);
  }

  /**
   * Update an existing trust score
   */
  async update(id: string, input: TrustScoreUpdateInput): Promise<TrustScoreEntity> {
    const trustScore = await this.prisma.trustScore.update({
      where: { id },
      data: {
        overallScore: input.overallScore,
        reviewScore: input.reviewScore,
        complianceScore: input.complianceScore,
        verificationScore: input.verificationScore,
        tenureScore: input.tenureScore,
        activityScore: input.activityScore,
        tier: input.tier,
        trend: input.trend,
        previousScore: input.previousScore,
        scoreChangeAmount: input.scoreChangeAmount,
        calculationVersion: input.calculationVersion,
        factors: input.factors as unknown as Prisma.InputJsonValue,
        lastCalculatedAt: new Date(),
      },
    });

    return this.mapToEntity(trustScore, false);
  }

  /**
   * Upsert trust score (create or update)
   */
  async upsert(userId: string, result: TrustScoreResult, previousScore?: number): Promise<TrustScoreEntity> {
    const existing = await this.findByUserId(userId);

    if (existing) {
      const trend = this.calculateTrend(existing.overallScore, result.overallScore);
      return this.update(existing.id, {
        overallScore: result.overallScore,
        reviewScore: result.reviewScore,
        complianceScore: result.complianceScore,
        verificationScore: result.verificationScore,
        tenureScore: result.tenureScore,
        activityScore: result.activityScore,
        tier: result.tier,
        trend,
        previousScore: existing.overallScore,
        scoreChangeAmount: result.overallScore - existing.overallScore,
        calculationVersion: result.calculationVersion,
        factors: result.factors,
      });
    }

    return this.create({
      userId,
      overallScore: result.overallScore,
      reviewScore: result.reviewScore,
      complianceScore: result.complianceScore,
      verificationScore: result.verificationScore,
      tenureScore: result.tenureScore,
      activityScore: result.activityScore,
      tier: result.tier,
      factors: result.factors,
      calculationVersion: result.calculationVersion,
    });
  }

  /**
   * Delete trust score
   */
  async delete(id: string): Promise<void> {
    await this.prisma.trustScore.delete({
      where: { id },
    });
  }

  /**
   * Find trust scores by tier
   */
  async findByTier(tier: TrustTier, pagination: PaginationOptions = {}): Promise<TrustScoreEntity[]> {
    const { skip = 0, take = 50 } = pagination;

    const trustScores = await this.prisma.trustScore.findMany({
      where: { tier },
      skip,
      take,
      orderBy: { overallScore: 'desc' },
    });

    return trustScores.map((ts) => this.mapToEntity(ts, false));
  }

  /**
   * Find users below minimum score
   */
  async findBelowScore(minScore: number, pagination: PaginationOptions = {}): Promise<TrustScoreEntity[]> {
    const { skip = 0, take = 50 } = pagination;

    const trustScores = await this.prisma.trustScore.findMany({
      where: { overallScore: { lt: minScore } },
      skip,
      take,
      orderBy: { overallScore: 'asc' },
    });

    return trustScores.map((ts) => this.mapToEntity(ts, false));
  }

  /**
   * Find users with declining scores
   */
  async findDeclining(pagination: PaginationOptions = {}): Promise<TrustScoreEntity[]> {
    const { skip = 0, take = 50 } = pagination;

    const trustScores = await this.prisma.trustScore.findMany({
      where: { trend: 'DECLINING' },
      skip,
      take,
      orderBy: { scoreChangeAmount: 'asc' },
    });

    return trustScores.map((ts) => this.mapToEntity(ts, false));
  }

  /**
   * Get trust score statistics
   */
  async getStatistics(): Promise<{
    totalUsers: number;
    averageScore: number;
    tierDistribution: Record<TrustTier, number>;
    trendDistribution: Record<TrustTrend, number>;
  }> {
    const [totalAndAvg, tierCounts, trendCounts] = await Promise.all([
      this.prisma.trustScore.aggregate({
        _count: true,
        _avg: { overallScore: true },
      }),
      this.prisma.trustScore.groupBy({
        by: ['tier'],
        _count: true,
      }),
      this.prisma.trustScore.groupBy({
        by: ['trend'],
        _count: true,
      }),
    ]);

    const tierDistribution: Record<TrustTier, number> = {
      EMERGING: 0,
      ESTABLISHED: 0,
      TRUSTED: 0,
      HIGHLY_TRUSTED: 0,
      ELITE: 0,
    };
    for (const tc of tierCounts) {
      tierDistribution[tc.tier as TrustTier] = tc._count;
    }

    const trendDistribution: Record<TrustTrend, number> = {
      RISING: 0,
      STABLE: 0,
      DECLINING: 0,
    };
    for (const tr of trendCounts) {
      trendDistribution[tr.trend as TrustTrend] = tr._count;
    }

    return {
      totalUsers: totalAndAvg._count,
      averageScore: totalAndAvg._avg.overallScore ?? 0,
      tierDistribution,
      trendDistribution,
    };
  }

  // ============================================================================
  // History Methods
  // ============================================================================

  /**
   * Create a history snapshot
   */
  async createHistory(input: HistoryCreateInput): Promise<TrustScoreHistoryEntity> {
    const history = await this.prisma.trustScoreHistory.create({
      data: {
        trustScoreId: input.trustScoreId,
        overallScore: input.overallScore,
        reviewScore: input.reviewScore,
        complianceScore: input.complianceScore,
        verificationScore: input.verificationScore,
        tenureScore: input.tenureScore,
        activityScore: input.activityScore,
        tier: input.tier,
        triggerEvent: input.triggerEvent,
      },
    });

    return {
      id: history.id,
      trustScoreId: history.trustScoreId,
      overallScore: history.overallScore,
      reviewScore: history.reviewScore,
      complianceScore: history.complianceScore,
      verificationScore: history.verificationScore,
      tenureScore: history.tenureScore,
      activityScore: history.activityScore,
      tier: history.tier as TrustTier,
      triggerEvent: history.triggerEvent,
      createdAt: history.createdAt,
    };
  }

  /**
   * Get history for a trust score
   */
  async getHistory(
    trustScoreId: string,
    options: { startDate?: Date; endDate?: Date } & PaginationOptions = {}
  ): Promise<TrustScoreHistoryEntity[]> {
    const { startDate, endDate, skip = 0, take = 90 } = options;

    const where: Prisma.TrustScoreHistoryWhereInput = { trustScoreId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const history = await this.prisma.trustScoreHistory.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });

    return history.map((h) => ({
      id: h.id,
      trustScoreId: h.trustScoreId,
      overallScore: h.overallScore,
      reviewScore: h.reviewScore,
      complianceScore: h.complianceScore,
      verificationScore: h.verificationScore,
      tenureScore: h.tenureScore,
      activityScore: h.activityScore,
      tier: h.tier as TrustTier,
      triggerEvent: h.triggerEvent,
      createdAt: h.createdAt,
    }));
  }

  /**
   * Delete old history entries
   */
  async pruneHistory(beforeDate: Date): Promise<number> {
    const result = await this.prisma.trustScoreHistory.deleteMany({
      where: { createdAt: { lt: beforeDate } },
    });
    return result.count;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private calculateTrend(previousScore: number, currentScore: number): TrustTrend {
    const change = currentScore - previousScore;
    const threshold = 2; // Minimum change to consider as rising/declining

    if (change >= threshold) return 'RISING';
    if (change <= -threshold) return 'DECLINING';
    return 'STABLE';
  }

  private mapToEntity(
    trustScore: Awaited<ReturnType<typeof this.prisma.trustScore.findUnique>> & {
      history?: Awaited<ReturnType<typeof this.prisma.trustScoreHistory.findMany>>;
    },
    includeHistory: boolean
  ): TrustScoreEntity | TrustScoreWithHistory {
    if (!trustScore) {
      throw new Error('Trust score not found');
    }

    const entity: TrustScoreEntity = {
      id: trustScore.id,
      userId: trustScore.userId,
      overallScore: trustScore.overallScore,
      reviewScore: trustScore.reviewScore,
      complianceScore: trustScore.complianceScore,
      verificationScore: trustScore.verificationScore,
      tenureScore: trustScore.tenureScore,
      activityScore: trustScore.activityScore,
      reviewWeight: trustScore.reviewWeight,
      complianceWeight: trustScore.complianceWeight,
      verificationWeight: trustScore.verificationWeight,
      tenureWeight: trustScore.tenureWeight,
      activityWeight: trustScore.activityWeight,
      tier: trustScore.tier as TrustTier,
      trend: trustScore.trend as TrustTrend,
      previousScore: trustScore.previousScore,
      scoreChangeAmount: trustScore.scoreChangeAmount,
      lastCalculatedAt: trustScore.lastCalculatedAt,
      calculationVersion: trustScore.calculationVersion,
      factors: trustScore.factors as unknown as TrustScoreFactors,
      createdAt: trustScore.createdAt,
      updatedAt: trustScore.updatedAt,
    };

    if (includeHistory && trustScore.history) {
      return {
        ...entity,
        history: trustScore.history.map((h) => ({
          id: h.id,
          trustScoreId: h.trustScoreId,
          overallScore: h.overallScore,
          reviewScore: h.reviewScore,
          complianceScore: h.complianceScore,
          verificationScore: h.verificationScore,
          tenureScore: h.tenureScore,
          activityScore: h.activityScore,
          tier: h.tier as TrustTier,
          triggerEvent: h.triggerEvent,
          createdAt: h.createdAt,
        })),
      };
    }

    return entity;
  }
}
