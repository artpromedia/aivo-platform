/**
 * Benchmark Service
 *
 * Core comparison and analysis engine for district benchmarking.
 */

import type { PrismaClient } from '@prisma/client';

import type {
  BenchmarkComparison,
  CohortStatistics,
  DistrictSummary,
  CategorySummary,
  MetricCategory,
  TrendData,
  TrendPeriod,
  PeerMatchingCriteria,
  AnonymizationConfig,
} from '../types';

const DEFAULT_ANONYMIZATION_CONFIG: AnonymizationConfig = {
  minCohortSize: 5,
  differentialPrivacyEpsilon: 1.0,
  suppressBelowThreshold: true,
};

export class BenchmarkService {
  private anonymizationConfig: AnonymizationConfig;

  constructor(
    private prisma: PrismaClient,
    config?: Partial<AnonymizationConfig>
  ) {
    this.anonymizationConfig = { ...DEFAULT_ANONYMIZATION_CONFIG, ...config };
  }

  /**
   * Get district summary with overall benchmarking position
   */
  async getDistrictSummary(tenantId: string): Promise<DistrictSummary | null> {
    const participant = await this.prisma.benchmarkParticipant.findUnique({
      where: { tenantId },
      include: {
        cohortMemberships: {
          include: { cohort: true },
        },
        insights: {
          where: {
            validUntil: { gt: new Date() },
          },
          orderBy: { priority: 'desc' },
        },
      },
    });

    if (participant?.status !== 'ACTIVE') {
      return null;
    }

    // Get latest metrics for all categories
    const metrics = await this.prisma.benchmarkMetric.findMany({
      where: {
        participantId: participant.id,
        periodEnd: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }, // Last 90 days
      },
      orderBy: { periodEnd: 'desc' },
    });

    // Calculate category breakdowns
    const categoryBreakdown = await this.calculateCategoryBreakdowns(participant.id, metrics);

    // Calculate overall percentile (weighted average across categories)
    const overallPercentile = this.calculateOverallPercentile(categoryBreakdown);

    // Extract top strengths and opportunities from insights
    const strengths = participant.insights
      .filter((i) => i.insightType === 'strength')
      .slice(0, 3)
      .map((i) => i.title);

    const opportunities = participant.insights
      .filter((i) => i.insightType === 'opportunity')
      .slice(0, 3)
      .map((i) => i.title);

    return {
      participant: {
        id: participant.id,
        tenantId: participant.tenantId,
        districtName: participant.districtName,
        status: participant.status as DistrictSummary['participant']['status'],
        size: participant.size as DistrictSummary['participant']['size'],
        geographicType:
          participant.geographicType as DistrictSummary['participant']['geographicType'],
        studentCount: participant.studentCount,
        freeReducedLunchPct: participant.freeReducedLunchPct ?? undefined,
        state: participant.state,
        gradeLevelsServed: participant.gradeLevelsServed,
        sharingPreferences: {
          shareAcademicData: participant.shareAcademicData,
          shareEngagementData: participant.shareEngagementData,
          shareAiEffectiveness: participant.shareAiEffectiveness,
          shareOperationalData: participant.shareOperationalData,
          allowPeerContact: participant.allowPeerContact,
        },
        enrolledAt: participant.enrolledAt,
        cohorts: participant.cohortMemberships.map((m) => ({
          id: m.cohort.id,
          name: m.cohort.name,
          memberCount: m.cohort.memberCount,
        })),
      },
      overallPercentile,
      categoryBreakdown,
      topStrengths: strengths,
      topOpportunities: opportunities,
      recentInsightsCount: participant.insights.length,
    };
  }

  /**
   * Compare district against peer cohorts
   */
  async compareWithPeers(
    tenantId: string,
    options: {
      cohortIds?: string[];
      categories?: MetricCategory[];
      periodStart?: Date;
      periodEnd?: Date;
    } = {}
  ): Promise<BenchmarkComparison[]> {
    const participant = await this.prisma.benchmarkParticipant.findUnique({
      where: { tenantId },
      include: {
        cohortMemberships: true,
      },
    });

    if (participant?.status !== 'ACTIVE') {
      throw new Error('Participant not found or not active');
    }

    // Determine cohorts to compare against
    const cohortIds = options.cohortIds ?? participant.cohortMemberships.map((m) => m.cohortId);

    // Default to last quarter if no period specified
    const periodEnd = options.periodEnd ?? new Date();
    const periodStart =
      options.periodStart ?? new Date(periodEnd.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Get district's metrics
    const districtMetrics = await this.prisma.benchmarkMetric.findMany({
      where: {
        participantId: participant.id,
        periodStart: { gte: periodStart },
        periodEnd: { lte: periodEnd },
        ...(options.categories ? { category: { in: options.categories } } : {}),
      },
    });

    // Get cohort aggregates
    const cohortAggregates = await this.prisma.cohortAggregate.findMany({
      where: {
        cohortId: { in: cohortIds },
        periodStart: { gte: periodStart },
        periodEnd: { lte: periodEnd },
        ...(options.categories ? { category: { in: options.categories } } : {}),
      },
      include: {
        cohort: true,
      },
    });

    // Get metric definitions for display names
    const metricDefs = await this.prisma.metricDefinition.findMany({
      where: { isActive: true },
    });
    const metricDefMap = new Map(metricDefs.map((m) => [m.key, m]));

    // Build comparisons
    const comparisons: BenchmarkComparison[] = [];

    for (const metric of districtMetrics) {
      const relevantAggregates = cohortAggregates.filter((a) => a.metricKey === metric.metricKey);

      if (relevantAggregates.length === 0) continue;

      // Use the first cohort's aggregate (could be extended to merge multiple)
      const aggregate = relevantAggregates[0];

      // Check k-anonymity threshold
      if (aggregate.sampleCount < this.anonymizationConfig.minCohortSize) {
        continue; // Suppress comparison below threshold
      }

      const metricDef = metricDefMap.get(metric.metricKey);
      const percentile = this.calculatePercentile(
        metric.metricValue,
        aggregate,
        metricDef?.higherIsBetter ?? true
      );

      // Get trend data if available
      const trend = await this.getTrendData(participant.id, metric.metricKey, aggregate.cohortId);

      comparisons.push({
        metricKey: metric.metricKey,
        metricName: metricDef?.name ?? metric.metricKey,
        category: metric.category as MetricCategory,
        districtValue: metric.metricValue,
        cohortStats: {
          cohortId: aggregate.cohortId,
          cohortName: aggregate.cohort.name,
          mean: aggregate.mean,
          median: aggregate.median,
          stdDev: aggregate.stdDev,
          p25: aggregate.p25,
          p75: aggregate.p75,
          p90: aggregate.p90,
          min: aggregate.min,
          max: aggregate.max,
          sampleCount: aggregate.sampleCount,
        },
        percentileRank: percentile,
        trend,
      });
    }

    // Log comparison access
    await this.prisma.benchmarkAuditLog.create({
      data: {
        participantId: participant.id,
        action: 'view_comparison',
        actorId: tenantId,
        actorType: 'user',
        details: {
          cohortIds,
          metricsCompared: comparisons.length,
        },
      },
    });

    return comparisons;
  }

  /**
   * Get anonymized peer rankings
   */
  async getPeerRankings(
    tenantId: string,
    metricKey: string,
    cohortId?: string
  ): Promise<{
    districtRank: number;
    totalPeers: number;
    distribution: { range: string; count: number }[];
  } | null> {
    const participant = await this.prisma.benchmarkParticipant.findUnique({
      where: { tenantId },
    });

    if (participant?.status !== 'ACTIVE') {
      return null;
    }

    // Determine cohort
    let targetCohortId = cohortId;
    if (!targetCohortId) {
      const membership = await this.prisma.cohortMembership.findFirst({
        where: { participantId: participant.id },
      });
      targetCohortId = membership?.cohortId;
    }

    if (!targetCohortId) {
      return null;
    }

    // Get all metrics for this cohort and metric key
    const cohortMembers = await this.prisma.cohortMembership.findMany({
      where: { cohortId: targetCohortId },
      include: { participant: true },
    });

    const activeMembers = cohortMembers.filter((m) => m.participant.status === 'ACTIVE');

    if (activeMembers.length < this.anonymizationConfig.minCohortSize) {
      return null; // Below anonymity threshold
    }

    const metrics = await this.prisma.benchmarkMetric.findMany({
      where: {
        participantId: { in: activeMembers.map((m) => m.participantId) },
        metricKey,
      },
      orderBy: { metricValue: 'desc' },
    });

    // Find district's rank
    const districtMetric = metrics.find((m) => m.participantId === participant.id);
    const districtRank = districtMetric
      ? metrics.findIndex((m) => m.id === districtMetric.id) + 1
      : -1;

    // Create distribution buckets
    const values = metrics.map((m) => m.metricValue);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const bucketSize = (max - min) / 5 || 1;

    const distribution: { range: string; count: number }[] = [];
    for (let i = 0; i < 5; i++) {
      const rangeMin = min + i * bucketSize;
      const rangeMax = min + (i + 1) * bucketSize;
      const count = values.filter(
        (v) => v >= rangeMin && (i === 4 ? v <= rangeMax : v < rangeMax)
      ).length;

      distribution.push({
        range: `${rangeMin.toFixed(1)}-${rangeMax.toFixed(1)}`,
        count,
      });
    }

    return {
      districtRank,
      totalPeers: metrics.length,
      distribution,
    };
  }

  /**
   * Find matching peers based on criteria
   */
  async findMatchingPeers(
    tenantId: string,
    criteria: PeerMatchingCriteria
  ): Promise<{ cohortId: string; name: string; memberCount: number }[]> {
    const participant = await this.prisma.benchmarkParticipant.findUnique({
      where: { tenantId },
    });

    if (!participant) {
      throw new Error('Participant not found');
    }

    // Find cohorts matching criteria
    const cohorts = await this.prisma.benchmarkCohort.findMany({
      where: {
        AND: [
          criteria.sizeRange && criteria.sizeRange.length > 0
            ? { sizeMin: { in: criteria.sizeRange } }
            : {},
          criteria.geographicTypes && criteria.geographicTypes.length > 0
            ? { geographicTypes: { hasSome: criteria.geographicTypes } }
            : {},
          criteria.states && criteria.states.length > 0
            ? { states: { hasSome: criteria.states } }
            : {},
          criteria.minPeers ? { memberCount: { gte: criteria.minPeers } } : {},
        ],
      },
    });

    return cohorts.map((c) => ({
      cohortId: c.id,
      name: c.name,
      memberCount: c.memberCount,
    }));
  }

  /**
   * Calculate percentile rank
   */
  private calculatePercentile(
    value: number,
    aggregate: {
      mean: number;
      stdDev: number;
      p25: number;
      p75: number;
      p90: number;
      min: number;
      max: number;
    },
    higherIsBetter: boolean
  ): number {
    // Approximate percentile based on aggregates
    if (value <= aggregate.min) return higherIsBetter ? 0 : 100;
    if (value >= aggregate.max) return higherIsBetter ? 100 : 0;

    // Linear interpolation between known percentile points
    let percentile: number;
    if (value < aggregate.p25) {
      percentile = 25 * ((value - aggregate.min) / (aggregate.p25 - aggregate.min));
    } else if (value < aggregate.mean) {
      percentile = 25 + 25 * ((value - aggregate.p25) / (aggregate.mean - aggregate.p25));
    } else if (value < aggregate.p75) {
      percentile = 50 + 25 * ((value - aggregate.mean) / (aggregate.p75 - aggregate.mean));
    } else if (value < aggregate.p90) {
      percentile = 75 + 15 * ((value - aggregate.p75) / (aggregate.p90 - aggregate.p75));
    } else {
      percentile = 90 + 10 * ((value - aggregate.p90) / (aggregate.max - aggregate.p90));
    }

    return higherIsBetter ? Math.round(percentile) : Math.round(100 - percentile);
  }

  /**
   * Calculate trend data for a metric
   */
  private async getTrendData(
    participantId: string,
    metricKey: string,
    cohortId: string
  ): Promise<TrendData | undefined> {
    // Get historical data (last 4 periods)
    const districtMetrics = await this.prisma.benchmarkMetric.findMany({
      where: {
        participantId,
        metricKey,
      },
      orderBy: { periodStart: 'asc' },
      take: 4,
    });

    if (districtMetrics.length < 2) {
      return undefined;
    }

    const cohortAggregates = await this.prisma.cohortAggregate.findMany({
      where: {
        cohortId,
        metricKey,
        periodStart: {
          in: districtMetrics.map((m) => m.periodStart),
        },
      },
      orderBy: { periodStart: 'asc' },
    });

    const periods: TrendPeriod[] = districtMetrics.map((dm) => {
      const cohortAgg = cohortAggregates.find(
        (ca) => ca.periodStart.getTime() === dm.periodStart.getTime()
      );
      return {
        periodStart: dm.periodStart,
        periodEnd: dm.periodEnd,
        districtValue: dm.metricValue,
        cohortMean: cohortAgg?.mean ?? 0,
      };
    });

    // Calculate trend direction
    const firstValue = districtMetrics[0].metricValue;
    const lastValue = districtMetrics[districtMetrics.length - 1].metricValue;
    const changePercent = ((lastValue - firstValue) / firstValue) * 100;

    let direction: 'improving' | 'stable' | 'declining';
    if (Math.abs(changePercent) < 5) {
      direction = 'stable';
    } else if (changePercent > 0) {
      direction = 'improving';
    } else {
      direction = 'declining';
    }

    return {
      periods,
      direction,
      changePercent: Math.round(changePercent * 10) / 10,
    };
  }

  /**
   * Calculate category breakdown summaries
   */
  private async calculateCategoryBreakdowns(
    participantId: string,
    metrics: {
      category: string;
      metricKey: string;
      metricValue: number;
    }[]
  ): Promise<CategorySummary[]> {
    const categories: MetricCategory[] = [
      'ACADEMIC_PERFORMANCE',
      'ENGAGEMENT',
      'AI_EFFECTIVENESS',
      'OPERATIONAL',
    ];

    const breakdowns: CategorySummary[] = [];

    for (const category of categories) {
      const categoryMetrics = metrics.filter((m) => m.category === category);

      if (categoryMetrics.length === 0) {
        continue;
      }

      // Get metric definitions
      const metricDefs = await this.prisma.metricDefinition.findMany({
        where: {
          key: { in: categoryMetrics.map((m) => m.metricKey) },
        },
      });

      // Simplified: use metric value as percentile proxy
      const sorted = [...categoryMetrics].sort((a, b) => b.metricValue - a.metricValue);

      breakdowns.push({
        category,
        metricCount: categoryMetrics.length,
        avgPercentile: 50, // Would be calculated from actual cohort comparisons
        bestMetric:
          metricDefs.find((d) => d.key === sorted[0]?.metricKey)?.name ??
          sorted[0]?.metricKey ??
          '',
        worstMetric:
          metricDefs.find((d) => d.key === sorted[sorted.length - 1]?.metricKey)?.name ??
          sorted[sorted.length - 1]?.metricKey ??
          '',
      });
    }

    return breakdowns;
  }

  /**
   * Calculate overall percentile from category breakdowns
   */
  private calculateOverallPercentile(breakdowns: CategorySummary[]): number {
    if (breakdowns.length === 0) return 0;

    const sum = breakdowns.reduce((acc, b) => acc + b.avgPercentile, 0);
    return Math.round(sum / breakdowns.length);
  }
}
