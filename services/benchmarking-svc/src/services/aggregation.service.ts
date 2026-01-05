/**
 * Aggregation Service
 *
 * Collects, anonymizes, and aggregates benchmark metrics from districts.
 */

import type { PrismaClient } from '@prisma/client';

import type {
  MetricSubmission,
  BulkSubmissionResult,
  MetricCategory,
  AnonymizationConfig,
} from '../types';

const DEFAULT_ANONYMIZATION_CONFIG: AnonymizationConfig = {
  minCohortSize: 5,
  differentialPrivacyEpsilon: 1.0,
  suppressBelowThreshold: true,
};

export class AggregationService {
  private anonymizationConfig: AnonymizationConfig;

  constructor(
    private prisma: PrismaClient,
    config?: Partial<AnonymizationConfig>
  ) {
    this.anonymizationConfig = { ...DEFAULT_ANONYMIZATION_CONFIG, ...config };
  }

  /**
   * Submit metrics for a district
   */
  async submitMetrics(
    tenantId: string,
    metrics: MetricSubmission[],
    submittedBy: string
  ): Promise<BulkSubmissionResult> {
    const participant = await this.prisma.benchmarkParticipant.findUnique({
      where: { tenantId },
    });

    if (!participant) {
      throw new Error('Participant not found');
    }

    if (participant.status !== 'ACTIVE') {
      throw new Error('Participant is not active');
    }

    const result: BulkSubmissionResult = {
      submitted: 0,
      failed: 0,
      errors: [],
    };

    // Validate and filter metrics based on sharing preferences
    const allowedMetrics = metrics.filter((m) => {
      switch (m.category) {
        case 'ACADEMIC_PERFORMANCE':
          return participant.shareAcademicData;
        case 'ENGAGEMENT':
          return participant.shareEngagementData;
        case 'AI_EFFECTIVENESS':
          return participant.shareAiEffectiveness;
        case 'OPERATIONAL':
          return participant.shareOperationalData;
        default:
          return false;
      }
    });

    for (const metric of allowedMetrics) {
      try {
        // Validate metric definition exists
        const metricDef = await this.prisma.metricDefinition.findUnique({
          where: { key: metric.metricKey },
        });

        if (!metricDef) {
          result.failed++;
          result.errors.push({
            metricKey: metric.metricKey,
            error: 'Metric definition not found',
          });
          continue;
        }

        // Validate value range
        if (metricDef.minValue !== null && metric.metricValue < metricDef.minValue) {
          result.failed++;
          result.errors.push({
            metricKey: metric.metricKey,
            error: `Value below minimum (${metricDef.minValue})`,
          });
          continue;
        }

        if (metricDef.maxValue !== null && metric.metricValue > metricDef.maxValue) {
          result.failed++;
          result.errors.push({
            metricKey: metric.metricKey,
            error: `Value above maximum (${metricDef.maxValue})`,
          });
          continue;
        }

        // Apply differential privacy noise if configured
        const noisyValue = this.addDifferentialPrivacyNoise(
          metric.metricValue,
          this.anonymizationConfig.differentialPrivacyEpsilon
        );

        // Upsert metric
        await this.prisma.benchmarkMetric.upsert({
          where: {
            participantId_metricKey_periodStart_periodEnd: {
              participantId: participant.id,
              metricKey: metric.metricKey,
              periodStart: metric.periodStart,
              periodEnd: metric.periodEnd,
            },
          },
          update: {
            metricValue: metric.metricValue,
            noisyValue,
            sampleSize: metric.sampleSize,
            confidenceLevel: metric.confidenceLevel,
            submittedAt: new Date(),
          },
          create: {
            participantId: participant.id,
            category: metric.category,
            metricKey: metric.metricKey,
            metricValue: metric.metricValue,
            noisyValue,
            periodStart: metric.periodStart,
            periodEnd: metric.periodEnd,
            periodType: metric.periodType,
            sampleSize: metric.sampleSize,
            confidenceLevel: metric.confidenceLevel,
            isAnonymized: true,
          },
        });

        result.submitted++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          metricKey: metric.metricKey,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Log submission
    await this.prisma.benchmarkAuditLog.create({
      data: {
        participantId: participant.id,
        action: 'submit_metrics',
        actorId: submittedBy,
        actorType: 'user',
        details: {
          total: metrics.length,
          submitted: result.submitted,
          failed: result.failed,
        },
      },
    });

    // Trigger cohort aggregate recomputation
    await this.scheduleAggregateRecomputation(participant.id);

    return result;
  }

  /**
   * Recompute cohort aggregates
   */
  async recomputeCohortAggregates(cohortId: string): Promise<void> {
    const cohort = await this.prisma.benchmarkCohort.findUnique({
      where: { id: cohortId },
    });

    if (!cohort) {
      throw new Error('Cohort not found');
    }

    // Get all active members
    const members = await this.prisma.cohortMembership.findMany({
      where: {
        cohortId,
        participant: { status: 'ACTIVE' },
      },
    });

    if (members.length < this.anonymizationConfig.minCohortSize) {
      // Not enough members for anonymized aggregates
      return;
    }

    // Get all metrics from members
    const metrics = await this.prisma.benchmarkMetric.findMany({
      where: {
        participantId: { in: members.map((m) => m.participantId) },
      },
    });

    // Group by metric key and period
    const groups = new Map<
      string,
      {
        category: string;
        metricKey: string;
        periodStart: Date;
        periodEnd: Date;
        periodType: string;
        values: number[];
      }
    >();

    for (const metric of metrics) {
      const key = `${metric.metricKey}:${metric.periodStart.toISOString()}:${metric.periodEnd.toISOString()}`;

      if (!groups.has(key)) {
        groups.set(key, {
          category: metric.category,
          metricKey: metric.metricKey,
          periodStart: metric.periodStart,
          periodEnd: metric.periodEnd,
          periodType: metric.periodType,
          values: [],
        });
      }

      groups.get(key)!.values.push(metric.metricValue);
    }

    // Compute and store aggregates
    for (const [, group] of groups) {
      if (group.values.length < this.anonymizationConfig.minCohortSize) {
        continue; // Skip groups below threshold
      }

      const stats = this.computeStatistics(group.values);

      await this.prisma.cohortAggregate.upsert({
        where: {
          cohortId_metricKey_periodStart_periodEnd: {
            cohortId,
            metricKey: group.metricKey,
            periodStart: group.periodStart,
            periodEnd: group.periodEnd,
          },
        },
        update: {
          ...stats,
          sampleCount: group.values.length,
          computedAt: new Date(),
        },
        create: {
          cohortId,
          category: group.category as MetricCategory,
          metricKey: group.metricKey,
          ...stats,
          sampleCount: group.values.length,
          periodStart: group.periodStart,
          periodEnd: group.periodEnd,
          periodType: group.periodType,
        },
      });
    }

    // Update cohort last computed time
    await this.prisma.benchmarkCohort.update({
      where: { id: cohortId },
      data: { lastComputedAt: new Date() },
    });
  }

  /**
   * Collect metrics from platform analytics
   */
  async collectFromAnalytics(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<MetricSubmission[]> {
    // This would integrate with the analytics service to pull metrics
    // For now, return empty array - actual implementation would query analytics

    const metrics: MetricSubmission[] = [];

    // Example metrics that would be collected:
    // - avg_session_duration
    // - daily_active_users_pct
    // - content_completion_rate
    // - ai_tutor_sessions_per_student
    // - mastery_progression_rate

    return metrics;
  }

  /**
   * Schedule cohort aggregate recomputation
   */
  private async scheduleAggregateRecomputation(participantId: string): Promise<void> {
    // Get cohorts this participant belongs to
    const memberships = await this.prisma.cohortMembership.findMany({
      where: { participantId },
    });

    // Queue recomputation for each cohort
    // In production, this would use a job queue (Bull, etc.)
    for (const membership of memberships) {
      // Fire and forget - actual implementation would queue this
      void this.recomputeCohortAggregates(membership.cohortId).catch((err: unknown) => {
        console.error(`Failed to recompute aggregates for cohort ${membership.cohortId}:`, err);
      });
    }
  }

  /**
   * Compute statistics for a set of values
   */
  private computeStatistics(values: number[]): {
    mean: number;
    median: number;
    stdDev: number;
    p25: number;
    p75: number;
    p90: number;
    min: number;
    max: number;
  } {
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;

    const mean = values.reduce((a, b) => a + b, 0) / n;
    const median = this.percentile(sorted, 50);
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    return {
      mean: Math.round(mean * 100) / 100,
      median: Math.round(median * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      p25: Math.round(this.percentile(sorted, 25) * 100) / 100,
      p75: Math.round(this.percentile(sorted, 75) * 100) / 100,
      p90: Math.round(this.percentile(sorted, 90) * 100) / 100,
      min: sorted[0],
      max: sorted[n - 1],
    };
  }

  /**
   * Calculate percentile value
   */
  private percentile(sorted: number[], p: number): number {
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) {
      return sorted[lower];
    }

    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
  }

  /**
   * Add differential privacy noise (Laplace mechanism)
   */
  private addDifferentialPrivacyNoise(value: number, epsilon: number): number {
    // Laplace noise with sensitivity = 1
    const b = 1 / epsilon;
    const u = Math.random() - 0.5;
    const noise = -b * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));

    return value + noise;
  }
}
