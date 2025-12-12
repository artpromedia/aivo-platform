/**
 * Coverage Profile Repository
 *
 * Data access layer for computing learner coverage profiles from
 * district entitlements and parent subscriptions.
 */

import type { PrismaClient } from '../../generated/prisma-client/index.js';
import { prisma } from '../prisma.js';
import type { GradeBand } from '../types/licensing.types.js';

// ============================================================================
// Types
// ============================================================================

export interface LearnerInfo {
  learnerId: string;
  tenantId: string;
  schoolId: string | null;
  grade: number | string;
  gradeBand: GradeBand;
}

export interface DistrictEntitlementData {
  contractId: string;
  contractNumber: string;
  tenantId: string;
  featureKey: string;
  quantity: number | null;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}

export interface ParentSubscriptionData {
  subscriptionId: string;
  billingAccountId: string;
  ownerUserId: string;
  planSku: string;
  planType: string;
  status: string;
  linkedLearnerId: string | null;
  coveredFeatures: string[];
  periodStart: Date;
  periodEnd: Date;
  metadataJson: unknown;
}

// ============================================================================
// Coverage Profile Repository
// ============================================================================

export class CoverageProfileRepository {
  private readonly prisma: PrismaClient;

  constructor(client: PrismaClient = prisma) {
    this.prisma = client;
  }
  /**
   * Get active district entitlements for a tenant (and optionally school).
   * Returns all ContractEntitlements from active contracts.
   */
  async getDistrictEntitlements(
    tenantId: string,
    _schoolId?: string | null
  ): Promise<DistrictEntitlementData[]> {
    const now = new Date();

    // Query active contract entitlements for the tenant
    // Note: schoolId filtering can be added when school-level contracts are supported
    const entitlements = await this.prisma.contractEntitlement.findMany({
      where: {
        tenantId,
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
        contract: {
          status: 'ACTIVE',
          tenantId, // Double-check tenant match
        },
      },
      include: {
        contract: {
          select: {
            id: true,
            contractNumber: true,
            tenantId: true,
            status: true,
          },
        },
      },
    });

    return entitlements.map((e) => ({
      contractId: e.contract.id,
      contractNumber: e.contract.contractNumber,
      tenantId: e.tenantId,
      featureKey: e.featureKey,
      quantity: e.quantity,
      startDate: e.startDate,
      endDate: e.endDate,
      isActive: e.isActive,
    }));
  }

  /**
   * Get parent subscription for a specific learner.
   * Looks up subscriptions where the linked learner matches.
   */
  async getParentSubscription(learnerId: string): Promise<ParentSubscriptionData | null> {
    const now = new Date();

    // Look for active parent subscriptions linked to this learner
    // The link is stored in metadataJson.linkedLearnerId or via SubscriptionItem.learnerId
    const subscription = await prisma.subscription.findFirst({
      where: {
        status: { in: ['ACTIVE', 'IN_TRIAL'] },
        currentPeriodEnd: { gte: now },
        billingAccount: {
          accountType: 'PARENT_CONSUMER',
        },
        // Check for learner link via subscription items
        subscriptionItems: {
          some: {
            learnerId,
          },
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
            learnerId,
          },
          select: {
            learnerId: true,
            sku: true,
            metadataJson: true,
          },
        },
      },
    });

    if (!subscription) {
      // Also check for learner link in subscription metadata
      const metadataSubscription = await prisma.subscription.findFirst({
        where: {
          status: { in: ['ACTIVE', 'IN_TRIAL'] },
          currentPeriodEnd: { gte: now },
          billingAccount: {
            accountType: 'PARENT_CONSUMER',
          },
          metadataJson: {
            path: ['linkedLearnerId'],
            equals: learnerId,
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
        },
      });

      if (!metadataSubscription) {
        return null;
      }

      // Extract covered features from plan metadata
      const planMeta = metadataSubscription.plan.metadataJson as Record<string, unknown> | null;
      const coveredFeatures = extractCoveredFeatures(planMeta);

      return {
        subscriptionId: metadataSubscription.id,
        billingAccountId: metadataSubscription.billingAccount.id,
        ownerUserId: metadataSubscription.billingAccount.ownerUserId ?? '',
        planSku: metadataSubscription.plan.sku,
        planType: metadataSubscription.plan.planType,
        status: metadataSubscription.status,
        linkedLearnerId: learnerId,
        coveredFeatures,
        periodStart: metadataSubscription.currentPeriodStart,
        periodEnd: metadataSubscription.currentPeriodEnd,
        metadataJson: metadataSubscription.metadataJson,
      };
    }

    // Extract covered features from plan metadata
    const planMeta = subscription.plan.metadataJson as Record<string, unknown> | null;
    const coveredFeatures = extractCoveredFeatures(planMeta);

    return {
      subscriptionId: subscription.id,
      billingAccountId: subscription.billingAccount.id,
      ownerUserId: subscription.billingAccount.ownerUserId ?? '',
      planSku: subscription.plan.sku,
      planType: subscription.plan.planType,
      status: subscription.status,
      linkedLearnerId: learnerId,
      coveredFeatures,
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
      metadataJson: subscription.metadataJson,
    };
  }

  /**
   * Get all parent subscriptions for learners in a tenant.
   * Used for district admin aggregate view.
   */
  async getParentSubscriptionsForTenant(
    _tenantId: string,
    _schoolId?: string | null
  ): Promise<ParentSubscriptionData[]> {
    const now = new Date();

    // Get learners in this tenant (via subscription items with tenant-linked learners)
    // This is a simplified query - in production, you'd join with learner service
    // TODO: Filter by tenantId when learner-tenant mapping is available
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
          select: {
            learnerId: true,
            sku: true,
          },
        },
      },
    });

    return subscriptions.map((sub) => {
      const planMeta = sub.plan.metadataJson as Record<string, unknown> | null;
      const coveredFeatures = extractCoveredFeatures(planMeta);
      const linkedLearnerId =
        sub.subscriptionItems[0]?.learnerId ??
        ((sub.metadataJson as Record<string, unknown> | null)?.linkedLearnerId as string | null);

      return {
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
      };
    });
  }

  /**
   * Check if a learner has an active district license assignment.
   */
  async hasDistrictLicenseAssignment(tenantId: string, learnerId: string): Promise<boolean> {
    const assignment = await this.prisma.licenseAssignment.findFirst({
      where: {
        tenantId,
        learnerId,
        status: 'ACTIVE',
      },
    });
    return assignment !== null;
  }

  /**
   * Get the school ID for a learner (simplified - would typically call learner service).
   */
  async getLearnerSchool(learnerId: string, tenantId: string): Promise<string | null> {
    // Look up from license assignment which tracks school
    const assignment = await this.prisma.licenseAssignment.findFirst({
      where: {
        tenantId,
        learnerId,
        status: 'ACTIVE',
      },
      select: {
        schoolId: true,
      },
    });
    return assignment?.schoolId ?? null;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extracts covered features from plan metadata.
 */
function extractCoveredFeatures(metadataJson: Record<string, unknown> | null): string[] {
  if (!metadataJson) {
    return [];
  }

  // Check for modules array
  if (Array.isArray(metadataJson.modules)) {
    return metadataJson.modules.map((m) => `MODULE_${String(m).toUpperCase()}`);
  }

  // Check for features array
  if (Array.isArray(metadataJson.features)) {
    return metadataJson.features as string[];
  }

  // Check for coveredFeatures array
  if (Array.isArray(metadataJson.coveredFeatures)) {
    return metadataJson.coveredFeatures as string[];
  }

  return [];
}

// Export singleton instance
export const coverageProfileRepository = new CoverageProfileRepository();
