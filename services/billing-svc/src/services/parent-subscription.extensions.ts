/**
 * Parent Subscription Extensions
 *
 * Helpers and types for working with parent subscriptions in the hybrid
 * billing model. Extends the base Subscription model with parent-specific
 * functionality via metadataJson.
 *
 * METADATA SCHEMA for Parent Subscriptions:
 * {
 *   "linkedLearnerId": "uuid",           // Primary learner this subscription covers
 *   "coveredFeatures": ["ADDON_SEL"],    // Explicit feature list
 *   "districtOverlapDetected": true,     // Flag if overlap with district
 *   "districtOverlapFeatures": [],       // Features that overlap
 *   "migrationCandidate": false,         // Flag for reconciliation
 *   "lastReconciliationAt": "ISO date"   // When last checked
 * }
 */

import { z } from 'zod';

import { prisma } from '../prisma.js';
import { FeatureKeyValues } from '../types/coverage-profile.types.js';

// ============================================================================
// Parent Subscription Metadata Schema
// ============================================================================

/**
 * Schema for parent subscription metadata in metadataJson.
 */
export const ParentSubscriptionMetadataSchema = z.object({
  /** Primary learner this subscription covers */
  linkedLearnerId: z.string().uuid().optional(),

  /** Explicit list of covered features (derived from plan + add-ons) */
  coveredFeatures: z.array(z.string()).default([]),

  /** Whether this subscription has overlap with district coverage */
  districtOverlapDetected: z.boolean().default(false),

  /** Specific features that overlap with district */
  districtOverlapFeatures: z.array(z.string()).default([]),

  /** Flag indicating this subscription should be reviewed for migration */
  migrationCandidate: z.boolean().default(false),

  /** When the subscription was last reconciled against district coverage */
  lastReconciliationAt: z.string().datetime().optional(),

  /** Optional notes from reconciliation */
  reconciliationNotes: z.string().optional(),
});

export type ParentSubscriptionMetadata = z.infer<typeof ParentSubscriptionMetadataSchema>;

// ============================================================================
// Parent Subscription Repository Extensions
// ============================================================================

export class ParentSubscriptionExtensions {
  /**
   * Get parent subscription metadata, parsed and validated.
   */
  async getMetadata(subscriptionId: string): Promise<ParentSubscriptionMetadata | null> {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      select: { metadataJson: true },
    });

    if (!subscription?.metadataJson) {
      return null;
    }

    const result = ParentSubscriptionMetadataSchema.safeParse(subscription.metadataJson);
    return result.success ? result.data : null;
  }

  /**
   * Update parent subscription metadata.
   */
  async updateMetadata(
    subscriptionId: string,
    updates: Partial<ParentSubscriptionMetadata>
  ): Promise<void> {
    const existing = await this.getMetadata(subscriptionId);
    const merged = { ...existing, ...updates };

    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        metadataJson: merged,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Link a learner to a parent subscription.
   */
  async linkLearner(subscriptionId: string, learnerId: string): Promise<void> {
    // Update metadata
    await this.updateMetadata(subscriptionId, {
      linkedLearnerId: learnerId,
    });

    // Also create/update subscription item for the learner
    const existingItem = await prisma.subscriptionItem.findFirst({
      where: {
        subscriptionId,
        learnerId,
      },
    });

    if (!existingItem) {
      // Get the subscription to find the plan
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        select: { planId: true, plan: { select: { sku: true } } },
      });

      if (subscription) {
        await prisma.subscriptionItem.create({
          data: {
            subscriptionId,
            planId: subscription.planId,
            sku: subscription.plan.sku,
            learnerId,
            quantity: 1,
          },
        });
      }
    }
  }

  /**
   * Unlink a learner from a parent subscription.
   */
  async unlinkLearner(subscriptionId: string, learnerId: string): Promise<void> {
    // Update metadata
    const metadata = await this.getMetadata(subscriptionId);
    if (metadata?.linkedLearnerId === learnerId) {
      await this.updateMetadata(subscriptionId, {
        linkedLearnerId: undefined,
      });
    }

    // Remove subscription item
    await prisma.subscriptionItem.deleteMany({
      where: {
        subscriptionId,
        learnerId,
      },
    });
  }

  /**
   * Get all learners linked to a parent subscription.
   */
  async getLinkedLearners(subscriptionId: string): Promise<string[]> {
    const items = await prisma.subscriptionItem.findMany({
      where: {
        subscriptionId,
        learnerId: { not: null },
      },
      select: { learnerId: true },
    });

    // Also check metadata for primary learner
    const metadata = await this.getMetadata(subscriptionId);
    const learnerIds = new Set(items.map((i) => i.learnerId).filter(Boolean) as string[]);

    if (metadata?.linkedLearnerId) {
      learnerIds.add(metadata.linkedLearnerId);
    }

    return Array.from(learnerIds);
  }

  /**
   * Update covered features for a subscription.
   * Called when plan changes or add-ons are modified.
   */
  async updateCoveredFeatures(subscriptionId: string, coveredFeatures: string[]): Promise<void> {
    await this.updateMetadata(subscriptionId, {
      coveredFeatures,
    });
  }

  /**
   * Mark a subscription as having district overlap.
   * Called by reconciliation job.
   */
  async markDistrictOverlap(subscriptionId: string, overlappingFeatures: string[]): Promise<void> {
    await this.updateMetadata(subscriptionId, {
      districtOverlapDetected: overlappingFeatures.length > 0,
      districtOverlapFeatures: overlappingFeatures,
      lastReconciliationAt: new Date().toISOString(),
    });
  }

  /**
   * Mark subscription for migration review.
   * Called when overlap suggests the parent should be notified/credited.
   */
  async markForMigration(subscriptionId: string, notes?: string): Promise<void> {
    await this.updateMetadata(subscriptionId, {
      migrationCandidate: true,
      reconciliationNotes: notes,
    });
  }

  /**
   * Clear migration flag after review.
   */
  async clearMigrationFlag(subscriptionId: string): Promise<void> {
    await this.updateMetadata(subscriptionId, {
      migrationCandidate: false,
      reconciliationNotes: undefined,
    });
  }

  /**
   * Get all subscriptions marked for migration.
   */
  async getMigrationCandidates(): Promise<
    {
      subscriptionId: string;
      linkedLearnerId: string | undefined;
      overlappingFeatures: string[];
      notes: string | undefined;
    }[]
  > {
    // Find subscriptions with migrationCandidate = true in metadata
    const subscriptions = await prisma.subscription.findMany({
      where: {
        status: { in: ['ACTIVE', 'IN_TRIAL'] },
        billingAccount: {
          accountType: 'PARENT_CONSUMER',
        },
        metadataJson: {
          path: ['migrationCandidate'],
          equals: true,
        },
      },
      select: {
        id: true,
        metadataJson: true,
      },
    });

    return subscriptions.map((sub) => {
      const metadata = ParentSubscriptionMetadataSchema.safeParse(sub.metadataJson);
      return {
        subscriptionId: sub.id,
        linkedLearnerId: metadata.success ? metadata.data.linkedLearnerId : undefined,
        overlappingFeatures: metadata.success ? metadata.data.districtOverlapFeatures : [],
        notes: metadata.success ? metadata.data.reconciliationNotes : undefined,
      };
    });
  }

  /**
   * Get subscriptions for a specific parent (billing account owner).
   */
  async getParentSubscriptions(parentUserId: string): Promise<
    {
      subscriptionId: string;
      status: string;
      linkedLearners: string[];
      coveredFeatures: string[];
      hasDistrictOverlap: boolean;
    }[]
  > {
    const subscriptions = await prisma.subscription.findMany({
      where: {
        status: { in: ['ACTIVE', 'IN_TRIAL', 'PAST_DUE'] },
        billingAccount: {
          accountType: 'PARENT_CONSUMER',
          ownerUserId: parentUserId,
        },
      },
      include: {
        subscriptionItems: {
          select: { learnerId: true },
        },
      },
    });

    return Promise.all(
      subscriptions.map(async (sub) => {
        const metadata = ParentSubscriptionMetadataSchema.safeParse(sub.metadataJson);
        const learnerIds = sub.subscriptionItems
          .map((i) => i.learnerId)
          .filter(Boolean) as string[];

        if (metadata.success && metadata.data.linkedLearnerId) {
          learnerIds.push(metadata.data.linkedLearnerId);
        }

        return {
          subscriptionId: sub.id,
          status: sub.status,
          linkedLearners: [...new Set(learnerIds)],
          coveredFeatures: metadata.success ? metadata.data.coveredFeatures : [],
          hasDistrictOverlap: metadata.success ? metadata.data.districtOverlapDetected : false,
        };
      })
    );
  }
}

// Export singleton
export const parentSubscriptionExtensions = new ParentSubscriptionExtensions();

// ============================================================================
// Plan Feature Mapping Helpers
// ============================================================================

/**
 * Maps plan SKUs to the features they provide.
 * This is the source of truth for what each plan includes.
 */
export const PLAN_SKU_TO_FEATURES: Record<string, string[]> = {
  // Parent base plans
  PARENT_BASE: [
    FeatureKeyValues.MODULE_ELA,
    FeatureKeyValues.MODULE_MATH,
    FeatureKeyValues.FEATURE_PROGRESS_REPORTS,
    FeatureKeyValues.FEATURE_PARENT_INSIGHTS,
  ],
  PARENT_BASE_PLUS: [
    FeatureKeyValues.MODULE_ELA,
    FeatureKeyValues.MODULE_MATH,
    FeatureKeyValues.MODULE_SCIENCE,
    FeatureKeyValues.FEATURE_PROGRESS_REPORTS,
    FeatureKeyValues.FEATURE_PARENT_INSIGHTS,
    FeatureKeyValues.FEATURE_HOMEWORK_HELPER,
  ],

  // Parent add-ons (additive to base)
  PARENT_ADDON_SEL: [FeatureKeyValues.ADDON_SEL],
  PARENT_ADDON_SPEECH: [FeatureKeyValues.ADDON_SPEECH],
  PARENT_ADDON_TUTORING: [FeatureKeyValues.ADDON_TUTORING],
  PARENT_ADDON_SCIENCE: [FeatureKeyValues.MODULE_SCIENCE],
  PARENT_ADDON_HOMEWORK: [FeatureKeyValues.FEATURE_HOMEWORK_HELPER],

  // District plans (for reference)
  DISTRICT_BASE: [FeatureKeyValues.MODULE_ELA, FeatureKeyValues.MODULE_MATH],
  DISTRICT_FULL: [
    FeatureKeyValues.MODULE_ELA,
    FeatureKeyValues.MODULE_MATH,
    FeatureKeyValues.MODULE_SCIENCE,
    FeatureKeyValues.ADDON_SEL,
    FeatureKeyValues.FEATURE_PROGRESS_REPORTS,
    FeatureKeyValues.FEATURE_HOMEWORK_HELPER,
  ],
};

/**
 * Get features included in a plan SKU.
 */
export function getFeaturesForPlan(planSku: string): string[] {
  return PLAN_SKU_TO_FEATURES[planSku] ?? [];
}

/**
 * Compute all covered features for a subscription based on plan + add-ons.
 */
export async function computeCoveredFeatures(subscriptionId: string): Promise<string[]> {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: {
      plan: { select: { sku: true } },
      subscriptionItems: {
        include: { plan: { select: { sku: true } } },
      },
    },
  });

  if (!subscription) {
    return [];
  }

  // Start with base plan features
  const features = new Set(getFeaturesForPlan(subscription.plan.sku));

  // Add features from subscription items (add-ons)
  for (const item of subscription.subscriptionItems) {
    const itemFeatures = getFeaturesForPlan(item.plan.sku);
    itemFeatures.forEach((f) => features.add(f));
  }

  return Array.from(features);
}
