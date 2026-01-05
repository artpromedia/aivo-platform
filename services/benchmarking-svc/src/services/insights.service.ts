/**
 * Insights Service
 *
 * AI-powered insights and recommendations for benchmarking.
 */

import type { PrismaClient } from '@prisma/client';

import type { Insight, MetricCategory, InsightType } from '../types';

export class InsightsService {
  constructor(
    private prisma: PrismaClient,
    private aiServiceUrl?: string
  ) {}

  /**
   * Generate insights for a district
   */
  async generateInsights(tenantId: string): Promise<Insight[]> {
    const participant = await this.prisma.benchmarkParticipant.findUnique({
      where: { tenantId },
      include: {
        cohortMemberships: {
          include: { cohort: true },
        },
      },
    });

    if (participant?.status !== 'ACTIVE') {
      throw new Error('Participant not found or not active');
    }

    // Get district metrics and cohort aggregates
    const metrics = await this.prisma.benchmarkMetric.findMany({
      where: {
        participantId: participant.id,
        periodEnd: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      },
    });

    const cohortIds = participant.cohortMemberships.map((m) => m.cohortId);
    const aggregates = await this.prisma.cohortAggregate.findMany({
      where: {
        cohortId: { in: cohortIds },
        periodEnd: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      },
      include: { cohort: true },
    });

    // Get metric definitions
    const metricDefs = await this.prisma.metricDefinition.findMany({
      where: { isActive: true },
    });
    const metricDefMap = new Map(metricDefs.map((m) => [m.key, m]));

    const insights: Insight[] = [];

    // Analyze each metric
    for (const metric of metrics) {
      const metricDef = metricDefMap.get(metric.metricKey);
      if (!metricDef) continue;

      const relevantAggregates = aggregates.filter((a) => a.metricKey === metric.metricKey);

      if (relevantAggregates.length === 0) continue;

      const aggregate = relevantAggregates[0];
      const percentile = this.calculatePercentile(
        metric.metricValue,
        aggregate,
        metricDef.higherIsBetter
      );

      // Generate insights based on performance
      const insight = this.createInsightForMetric(metric, aggregate, metricDef, percentile);

      if (insight) {
        insights.push(insight);
      }
    }

    // Store insights
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    for (const insight of insights) {
      await this.prisma.benchmarkInsight.create({
        data: {
          participantId: participant.id,
          category: insight.category,
          insightType: insight.insightType,
          title: insight.title,
          description: insight.description,
          metricKey: insight.metricKey,
          currentValue: insight.currentValue,
          peerAverage: insight.peerAverage,
          percentile: insight.percentile,
          recommendation: insight.recommendation,
          priority: insight.priority,
          validFrom: new Date(),
          validUntil,
        },
      });
    }

    return insights;
  }

  /**
   * Get current insights for a district
   */
  async getInsights(
    tenantId: string,
    options: {
      category?: MetricCategory;
      type?: InsightType;
      limit?: number;
    } = {}
  ): Promise<Insight[]> {
    const participant = await this.prisma.benchmarkParticipant.findUnique({
      where: { tenantId },
    });

    if (!participant) {
      return [];
    }

    const insights = await this.prisma.benchmarkInsight.findMany({
      where: {
        participantId: participant.id,
        validUntil: { gt: new Date() },
        ...(options.category ? { category: options.category } : {}),
        ...(options.type ? { insightType: options.type } : {}),
      },
      orderBy: { priority: 'desc' },
      take: options.limit ?? 20,
    });

    return insights.map((i) => ({
      id: i.id,
      category: i.category as MetricCategory,
      insightType: i.insightType as InsightType,
      title: i.title,
      description: i.description,
      metricKey: i.metricKey ?? undefined,
      currentValue: i.currentValue ?? undefined,
      peerAverage: i.peerAverage ?? undefined,
      percentile: i.percentile ?? undefined,
      recommendation: i.recommendation ?? undefined,
      priority: i.priority,
    }));
  }

  /**
   * Get actionable recommendations
   */
  async getRecommendations(tenantId: string): Promise<Insight[]> {
    return this.getInsights(tenantId, {
      type: 'recommendation',
      limit: 10,
    });
  }

  /**
   * Acknowledge an insight
   */
  async acknowledgeInsight(
    tenantId: string,
    insightId: string,
    acknowledgedBy: string
  ): Promise<void> {
    const participant = await this.prisma.benchmarkParticipant.findUnique({
      where: { tenantId },
    });

    if (!participant) {
      throw new Error('Participant not found');
    }

    await this.prisma.benchmarkInsight.update({
      where: {
        id: insightId,
        participantId: participant.id,
      },
      data: {
        isAcknowledged: true,
        acknowledgedAt: new Date(),
        acknowledgedBy,
      },
    });
  }

  /**
   * Create insight for a specific metric
   */
  private createInsightForMetric(
    metric: {
      metricKey: string;
      metricValue: number;
      category: string;
    },
    aggregate: {
      mean: number;
      p75: number;
      p90: number;
    },
    metricDef: {
      name: string;
      higherIsBetter: boolean;
    },
    percentile: number
  ): Insight | null {
    const id = `generated-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Top performer (90th percentile+)
    if (percentile >= 90) {
      return {
        id,
        category: metric.category as MetricCategory,
        insightType: 'strength',
        title: `Top performer in ${metricDef.name}`,
        description: `Your district ranks in the top 10% for ${metricDef.name} among peer districts. This is a significant strength to leverage.`,
        metricKey: metric.metricKey,
        currentValue: metric.metricValue,
        peerAverage: aggregate.mean,
        percentile,
        recommendation: `Consider sharing best practices with peer districts or documenting your approach for internal knowledge sharing.`,
        priority: 80,
      };
    }

    // Strong performer (75th-90th percentile)
    if (percentile >= 75) {
      return {
        id,
        category: metric.category as MetricCategory,
        insightType: 'strength',
        title: `Above average ${metricDef.name}`,
        description: `Your ${metricDef.name} performance is above the peer average, placing you in the 75th percentile.`,
        metricKey: metric.metricKey,
        currentValue: metric.metricValue,
        peerAverage: aggregate.mean,
        percentile,
        priority: 50,
      };
    }

    // Opportunity area (below 25th percentile)
    if (percentile < 25) {
      const gap = metricDef.higherIsBetter
        ? aggregate.mean - metric.metricValue
        : metric.metricValue - aggregate.mean;

      return {
        id,
        category: metric.category as MetricCategory,
        insightType: 'opportunity',
        title: `Improvement opportunity: ${metricDef.name}`,
        description: `Your ${metricDef.name} is below the peer average. Closing this gap could significantly improve outcomes.`,
        metricKey: metric.metricKey,
        currentValue: metric.metricValue,
        peerAverage: aggregate.mean,
        percentile,
        recommendation: this.generateRecommendation(metric.metricKey, gap, aggregate.p75),
        priority: 90,
      };
    }

    // Near average - no insight needed
    return null;
  }

  /**
   * Generate recommendation based on metric gap
   */
  private generateRecommendation(metricKey: string, gap: number, targetValue: number): string {
    // Generic recommendations - would be enhanced with AI/ML in production
    const recommendations: Record<string, string> = {
      math_proficiency_rate: `Focus on targeted interventions for struggling students. Consider using AI tutor sessions for personalized math practice.`,
      reading_proficiency_rate: `Implement structured reading programs and increase AI-assisted reading practice sessions.`,
      avg_session_duration: `Increase engagement through gamification and personalized learning paths.`,
      daily_active_users_pct: `Improve platform adoption through teacher training and incentive programs.`,
      ai_tutor_sessions_per_student: `Encourage more AI tutor usage through teacher recommendations and student goal-setting.`,
      mastery_progression_rate: `Review curriculum pacing and consider adaptive learning pathways.`,
    };

    return (
      recommendations[metricKey] ??
      `Target a ${Math.abs(gap).toFixed(1)} point improvement to reach the 75th percentile (${targetValue.toFixed(1)}).`
    );
  }

  /**
   * Calculate percentile rank
   */
  private calculatePercentile(
    value: number,
    aggregate: { mean: number },
    higherIsBetter: boolean
  ): number {
    // Simplified calculation - actual implementation in BenchmarkService
    const diff = value - aggregate.mean;
    const normalizedDiff = diff / aggregate.mean;

    let percentile = 50 + normalizedDiff * 50;
    percentile = Math.max(0, Math.min(100, percentile));

    return higherIsBetter ? percentile : 100 - percentile;
  }
}
