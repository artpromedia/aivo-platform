/**
 * Billing Reconciliation Job
 *
 * Background job that detects and handles coverage overlaps between
 * district entitlements and parent subscriptions.
 *
 * RESPONSIBILITIES:
 * 1. Scan for parent subscriptions linked to learners with district coverage
 * 2. Detect feature overlaps where district provides what parent is paying for
 * 3. Mark subscriptions for review/migration
 * 4. Calculate pro-rata credits (TODO: implement credit processing)
 * 5. Generate reports for billing operations team
 *
 * RUN FREQUENCY: Daily at 2am (configured externally)
 */

import type { PrismaClient } from '../../generated/prisma-client/index.js';
import { prisma } from '../prisma.js';
import {
  coverageProfileRepository,
  type ParentSubscriptionData,
} from '../repositories/coverage-profile.repository.js';
import {
  type CoverageOverlap,
  type ReconciliationError,
  type ReconciliationResult,
} from '../types/coverage-profile.types.js';

import {
  parentSubscriptionExtensions,
  computeCoveredFeatures,
} from './parent-subscription.extensions.js';

// ============================================================================
// Configuration
// ============================================================================

export interface ReconciliationConfig {
  /**
   * Maximum number of subscriptions to process per run.
   * Prevents runaway processing.
   */
  maxSubscriptionsPerRun?: number;

  /**
   * Minimum overlap amount (in cents) to flag for credit.
   * Below this, we just log and don't mark for migration.
   */
  minCreditThresholdCents?: number;

  /**
   * Whether to automatically mark subscriptions for migration.
   * If false, just generates report without marking.
   */
  autoMarkForMigration?: boolean;

  /**
   * Whether to send notifications to parents about overlap.
   * Requires integration with notification service.
   */
  sendParentNotifications?: boolean;

  /**
   * Callback for sending notifications.
   */
  onNotification?: (notification: ReconciliationNotification) => Promise<void>;
}

export interface ReconciliationNotification {
  type: 'OVERLAP_DETECTED' | 'CREDIT_AVAILABLE' | 'MIGRATION_RECOMMENDED';
  parentUserId: string;
  learnerId: string;
  subscriptionId: string;
  message: string;
  overlappingFeatures: string[];
  potentialCreditCents: number;
}

const DEFAULT_CONFIG: Required<ReconciliationConfig> = {
  maxSubscriptionsPerRun: 10000,
  minCreditThresholdCents: 100, // $1.00 minimum to flag
  autoMarkForMigration: true,
  sendParentNotifications: false,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onNotification: async () => {},
};

// ============================================================================
// Billing Reconciliation Job
// ============================================================================

export class BillingReconciliationJob {
  private readonly prisma: PrismaClient;
  private readonly config: Required<ReconciliationConfig>;

  constructor(config: ReconciliationConfig = {}, client: PrismaClient = prisma) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.prisma = client;
  }

  /**
   * Run the reconciliation job.
   * Main entry point - call this from scheduler.
   */
  async run(): Promise<ReconciliationResult> {
    const runAt = new Date();
    const result: ReconciliationResult = {
      runAt,
      learnersProcessed: 0,
      overlapsDetected: [],
      totalPotentialCreditCents: 0,
      subscriptionsMarkedForMigration: 0,
      errors: [],
    };

    console.log(`[ReconciliationJob] Starting reconciliation run at ${runAt.toISOString()}`);

    try {
      // Step 1: Get all active parent subscriptions with linked learners
      const parentSubscriptions = await this.getActiveParentSubscriptions();
      console.log(
        `[ReconciliationJob] Found ${parentSubscriptions.length} active parent subscriptions`
      );

      // Step 2: Process each subscription for overlaps
      const processedLearners = new Set<string>();

      for (const sub of parentSubscriptions.slice(0, this.config.maxSubscriptionsPerRun)) {
        try {
          const overlap = await this.processSubscription(sub);

          if (sub.linkedLearnerId && !processedLearners.has(sub.linkedLearnerId)) {
            processedLearners.add(sub.linkedLearnerId);
            result.learnersProcessed++;
          }

          if (overlap) {
            result.overlapsDetected.push(overlap);
            result.totalPotentialCreditCents += overlap.proRataCreditCents ?? 0;

            if (
              this.config.autoMarkForMigration &&
              (overlap.proRataCreditCents ?? 0) >= this.config.minCreditThresholdCents
            ) {
              await parentSubscriptionExtensions.markForMigration(
                sub.subscriptionId,
                `Overlap detected: ${overlap.featureKey}`
              );
              result.subscriptionsMarkedForMigration++;
            }
          }
        } catch (error) {
          result.errors.push({
            learnerId: sub.linkedLearnerId ?? 'unknown',
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date(),
          });
        }
      }

      console.log(
        `[ReconciliationJob] Completed. Processed ${result.learnersProcessed} learners, found ${result.overlapsDetected.length} overlaps`
      );
    } catch (error) {
      console.error('[ReconciliationJob] Fatal error:', error);
      result.errors.push({
        learnerId: 'N/A',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      });
    }

    return result;
  }

  /**
   * Get all active parent subscriptions with linked learners.
   */
  private async getActiveParentSubscriptions(): Promise<ParentSubscriptionData[]> {
    const now = new Date();

    const subscriptions = await prisma.subscription.findMany({
      where: {
        status: { in: ['ACTIVE', 'IN_TRIAL'] },
        currentPeriodEnd: { gte: now },
        billingAccount: {
          accountType: 'PARENT_CONSUMER',
        },
      },
      include: {
        billingAccount: {
          select: {
            id: true,
            ownerUserId: true,
          },
        },
        plan: {
          select: {
            sku: true,
            planType: true,
            metadataJson: true,
          },
        },
        subscriptionItems: {
          where: {
            learnerId: { not: null },
          },
          select: {
            learnerId: true,
            sku: true,
          },
        },
      },
    });

    // Transform and filter to those with linked learners
    const results: ParentSubscriptionData[] = [];

    for (const sub of subscriptions) {
      // Get covered features
      const coveredFeatures = await computeCoveredFeatures(sub.id);

      // Get linked learner from items or metadata
      const linkedLearnerId =
        sub.subscriptionItems[0]?.learnerId ??
        ((sub.metadataJson as Record<string, unknown> | null)?.linkedLearnerId as
          | string
          | undefined);

      if (linkedLearnerId) {
        results.push({
          subscriptionId: sub.id,
          billingAccountId: sub.billingAccount.id,
          ownerUserId: sub.billingAccount.ownerUserId ?? '',
          planSku: sub.plan.sku,
          planType: sub.plan.planType,
          status: sub.status,
          linkedLearnerId,
          coveredFeatures,
          periodStart: sub.currentPeriodStart,
          periodEnd: sub.currentPeriodEnd,
          metadataJson: sub.metadataJson,
        });
      }
    }

    return results;
  }

  /**
   * Process a single subscription for overlaps.
   */
  private async processSubscription(sub: ParentSubscriptionData): Promise<CoverageOverlap | null> {
    if (!sub.linkedLearnerId) {
      return null;
    }

    // Get the learner's tenant info (simplified - would call learner service)
    const learnerInfo = await this.getLearnerInfo(sub.linkedLearnerId);
    if (!learnerInfo) {
      return null;
    }

    // Get district entitlements for this learner's tenant
    const districtEntitlements = await coverageProfileRepository.getDistrictEntitlements(
      learnerInfo.tenantId,
      learnerInfo.schoolId
    );

    if (districtEntitlements.length === 0) {
      // No district coverage - no overlap possible
      await parentSubscriptionExtensions.markDistrictOverlap(sub.subscriptionId, []);
      return null;
    }

    // Find overlapping features
    const districtFeatures = new Set(districtEntitlements.map((e) => e.featureKey));
    const overlappingFeatures: string[] = [];

    for (const feature of sub.coveredFeatures) {
      if (districtFeatures.has(feature)) {
        overlappingFeatures.push(feature);
      }
    }

    // Update subscription metadata with overlap info
    await parentSubscriptionExtensions.markDistrictOverlap(sub.subscriptionId, overlappingFeatures);

    if (overlappingFeatures.length === 0) {
      return null;
    }

    // Calculate potential credit using actual plan pricing
    const proRataCreditCents = await this.calculateProRataCredit(sub, overlappingFeatures.length);
    const featureCharge = await this.getFeatureCharge(sub);

    // Return the first/primary overlap (could return array for multiple)
    return {
      learnerId: sub.linkedLearnerId,
      featureKey: overlappingFeatures[0],
      districtContractId: districtEntitlements[0].contractId,
      parentSubscriptionId: sub.subscriptionId,
      parentChargeAmountCents: featureCharge,
      recommendedAction: proRataCreditCents > 0 ? 'CREDIT' : 'NONE',
      proRataCreditCents,
    };
  }

  /**
   * Get learner tenant info (simplified - integrate with learner service).
   */
  private async getLearnerInfo(
    learnerId: string
  ): Promise<{ tenantId: string; schoolId: string | null; grade: number } | null> {
    // In production, call learner service
    // For now, look up from license assignment which has tenant/school
    const assignment = await this.prisma.licenseAssignment.findFirst({
      where: {
        learnerId,
        status: 'ACTIVE',
      },
      select: {
        tenantId: true,
        schoolId: true,
        gradeBand: true,
      },
    });

    if (assignment) {
      return {
        tenantId: assignment.tenantId,
        schoolId: assignment.schoolId,
        grade: this.gradeBandToGrade(assignment.gradeBand),
      };
    }

    return null;
  }

  /**
   * Convert grade band back to approximate grade (for lookup).
   */
  private gradeBandToGrade(gradeBand: string): number {
    switch (gradeBand) {
      case 'K_2':
        return 1;
      case 'G3_5':
        return 4;
      case 'G6_8':
        return 7;
      case 'G9_12':
        return 10;
      default:
        return 5;
    }
  }

  /**
   * Calculate pro-rata credit for remaining subscription period.
   * Uses actual plan pricing from database for accurate calculations.
   */
  private async calculateProRataCredit(
    sub: ParentSubscriptionData,
    overlappingFeatureCount: number
  ): Promise<number> {
    const now = new Date();
    const periodEnd = new Date(sub.periodEnd);
    const periodStart = new Date(sub.periodStart);

    // Calculate time fractions
    const totalMs = periodEnd.getTime() - periodStart.getTime();
    const remainingMs = Math.max(0, periodEnd.getTime() - now.getTime());

    if (totalMs <= 0) return 0;

    const remainingFraction = remainingMs / totalMs;

    // Get actual plan pricing from database
    const plan = await this.prisma.plan.findFirst({
      where: { sku: sub.planSku },
      select: {
        unitPriceCents: true,
        billingPeriod: true,
        metadataJson: true,
      },
    });

    if (!plan) {
      console.warn(`[ReconciliationJob] Plan not found for SKU: ${sub.planSku}`);
      return 0;
    }

    // Calculate per-feature value
    const totalFeatureCount = sub.coveredFeatures.length;
    if (totalFeatureCount === 0) return 0;

    // Get feature weights from plan metadata (or use equal weighting)
    const metadata = plan.metadataJson as Record<string, unknown> | null;
    const featureWeights = (metadata?.featureWeights as Record<string, number>) || {};

    // Calculate total weight and overlapping weight
    let totalWeight = 0;
    let overlappingWeight = 0;

    for (const feature of sub.coveredFeatures) {
      const weight = featureWeights[feature] ?? 1.0;
      totalWeight += weight;
    }

    // Use overlappingFeatureCount if no specific features tracked
    if (overlappingFeatureCount > 0 && totalWeight > 0) {
      // Approximate weight of overlapping features
      overlappingWeight = (overlappingFeatureCount / totalFeatureCount) * totalWeight;
    }

    if (totalWeight === 0) return 0;

    // Calculate the portion of the subscription price attributable to overlapping features
    const overlapFraction = overlappingWeight / totalWeight;
    const overlapPriceCents = Math.round(plan.unitPriceCents * overlapFraction);

    // Apply remaining time fraction for pro-rata amount
    const proRataCreditCents = Math.round(overlapPriceCents * remainingFraction);

    // Apply minimum credit threshold (avoid micro-credits)
    if (proRataCreditCents < 50) return 0; // Less than $0.50

    return proRataCreditCents;
  }

  /**
   * Get feature charge for subscription from actual plan pricing.
   */
  private async getFeatureCharge(sub: ParentSubscriptionData): Promise<number> {
    const plan = await this.prisma.plan.findFirst({
      where: { sku: sub.planSku },
      select: {
        unitPriceCents: true,
        billingPeriod: true,
      },
    });

    if (!plan) return 0;

    // Convert to monthly equivalent for consistent comparison
    let monthlyPriceCents = plan.unitPriceCents;
    if (plan.billingPeriod === 'ANNUAL') {
      monthlyPriceCents = Math.round(plan.unitPriceCents / 12);
    } else if (plan.billingPeriod === 'QUARTERLY') {
      monthlyPriceCents = Math.round(plan.unitPriceCents / 3);
    }

    // Per-feature monthly price (averaged)
    const featureCount = sub.coveredFeatures.length || 1;
    return Math.round(monthlyPriceCents / featureCount);
  }

  /**
   * @deprecated Use getFeatureCharge for actual pricing
   */
  private estimateFeatureCharge(sub: ParentSubscriptionData): number {
    // Fallback estimate when async call not possible
    const monthlyEstimate = sub.coveredFeatures.length * 500; // $5/feature
    return monthlyEstimate;
  }

  // --------------------------------------------------------------------------
  // Reporting
  // --------------------------------------------------------------------------

  /**
   * Generate detailed report from reconciliation result.
   */
  generateReport(result: ReconciliationResult): ReconciliationReport {
    const overlapsByFeature = new Map<string, number>();
    const overlapsByLearner = new Map<string, CoverageOverlap[]>();

    for (const overlap of result.overlapsDetected) {
      // Count by feature
      const featureCount = overlapsByFeature.get(overlap.featureKey) ?? 0;
      overlapsByFeature.set(overlap.featureKey, featureCount + 1);

      // Group by learner
      const learnerOverlaps = overlapsByLearner.get(overlap.learnerId) ?? [];
      learnerOverlaps.push(overlap);
      overlapsByLearner.set(overlap.learnerId, learnerOverlaps);
    }

    return {
      runAt: result.runAt,
      summary: {
        learnersProcessed: result.learnersProcessed,
        learnersWithOverlap: overlapsByLearner.size,
        totalOverlaps: result.overlapsDetected.length,
        totalPotentialCreditDollars: result.totalPotentialCreditCents / 100,
        subscriptionsMarkedForMigration: result.subscriptionsMarkedForMigration,
        errorCount: result.errors.length,
      },
      byFeature: Array.from(overlapsByFeature.entries()).map(([feature, count]) => ({
        featureKey: feature,
        overlapCount: count,
      })),
      topOverlaps: result.overlapsDetected
        .sort((a, b) => (b.proRataCreditCents ?? 0) - (a.proRataCreditCents ?? 0))
        .slice(0, 20),
      errors: result.errors,
    };
  }
}

// ============================================================================
// Report Types
// ============================================================================

export interface ReconciliationReport {
  runAt: Date;
  summary: {
    learnersProcessed: number;
    learnersWithOverlap: number;
    totalOverlaps: number;
    totalPotentialCreditDollars: number;
    subscriptionsMarkedForMigration: number;
    errorCount: number;
  };
  byFeature: {
    featureKey: string;
    overlapCount: number;
  }[];
  topOverlaps: CoverageOverlap[];
  errors: ReconciliationError[];
}

// Export singleton with default config
export const billingReconciliationJob = new BillingReconciliationJob();
