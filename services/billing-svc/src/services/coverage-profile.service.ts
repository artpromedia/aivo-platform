/**
 * Coverage Profile Service
 *
 * Computes and manages learner coverage profiles that combine district
 * entitlements with parent subscriptions.
 *
 * PRECEDENCE RULES (implemented here):
 * 1. District coverage always wins for overlapping features
 * 2. Parent subscriptions only cover features NOT provided by district
 * 3. Features not covered by either result in upsell opportunity
 */

import {
  coverageProfileRepository,
  type DistrictEntitlementData,
  type LearnerInfo,
  type ParentSubscriptionData,
} from '../repositories/coverage-profile.repository.js';
import {
  type CoverageProfile,
  type CoverageProfileSummary,
  type CoverageSourceType,
  CoverageSourceTypeValues,
  type DistrictCoverage,
  type FeatureCoverageDetail,
  type FeatureKey,
  FeatureKeyValues,
  type FeaturePayer,
  FeaturePayerValues,
  type ParentCoverage,
  computeEffectiveModules,
  computeFeaturePayer,
  findOverlappingFeatures,
  profileToSummary,
  type ParentAddonAggregateView,
  type AddonBreakdownItem,
  type TopAddonItem,
} from '../types/coverage-profile.types.js';
import { gradeToGradeBand, type GradeBand } from '../types/licensing.types.js';

// ============================================================================
// Cache Configuration
// ============================================================================

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const profileCache = new Map<string, { profile: CoverageProfile; expiresAt: number }>();
// ============================================================================
// Coverage Profile Service
// ============================================================================

export class CoverageProfileService {
  /**
   * Compute coverage profile for a learner.
   * This is the main entry point for determining what features a learner has
   * and who is paying for them.
   */
  async getCoverageProfile(
    learnerId: string,
    learnerInfo: LearnerInfo,
    forceRefresh = false
  ): Promise<CoverageProfile> {
    const cacheKey = `profile:${learnerId}`;

    // Check cache
    if (!forceRefresh) {
      const cached = profileCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.profile;
      }
    }

    // Compute fresh profile
    const profile = await this.computeCoverageProfile(learnerInfo);

    // Cache result
    profileCache.set(cacheKey, {
      profile,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return profile;
  }

  /**
   * Get coverage profile summary for UI display.
   */
  async getCoverageProfileSummary(
    learnerId: string,
    learnerInfo: LearnerInfo
  ): Promise<CoverageProfileSummary> {
    const profile = await this.getCoverageProfile(learnerId, learnerInfo);
    return profileToSummary(profile);
  }

  /**
   * Batch compute coverage profiles for multiple learners.
   */
  async getBatchCoverageProfiles(
    learnerInfos: LearnerInfo[]
  ): Promise<Map<string, CoverageProfile>> {
    const results = new Map<string, CoverageProfile>();

    // Process in parallel with concurrency limit
    const concurrencyLimit = 10;
    for (let i = 0; i < learnerInfos.length; i += concurrencyLimit) {
      const batch = learnerInfos.slice(i, i + concurrencyLimit);
      const profiles = await Promise.all(
        batch.map((info) => this.getCoverageProfile(info.learnerId, info))
      );
      batch.forEach((info, idx) => {
        results.set(info.learnerId, profiles[idx]);
      });
    }

    return results;
  }

  /**
   * Clear cached profile for a learner.
   * Call this when coverage changes (e.g., subscription change, contract update).
   */
  invalidateProfile(learnerId: string): void {
    profileCache.delete(`profile:${learnerId}`);
  }

  /**
   * Clear all cached profiles for a tenant.
   * Call this when district contract changes affect multiple learners.
   */
  invalidateTenantProfiles(_tenantId: string): void {
    // In a real implementation, you'd track learner->tenant mapping
    // For now, clear entire cache when tenant changes
    profileCache.clear();
  }

  // --------------------------------------------------------------------------
  // Core Computation
  // --------------------------------------------------------------------------

  /**
   * Core computation of coverage profile.
   * Implements precedence rules: district wins for overlaps.
   */
  private async computeCoverageProfile(learnerInfo: LearnerInfo): Promise<CoverageProfile> {
    const { learnerId, tenantId, schoolId, grade } = learnerInfo;
    const gradeBand = gradeToGradeBand(grade);

    // Fetch district entitlements and parent subscription in parallel
    const [districtEntitlements, parentSubscription] = await Promise.all([
      coverageProfileRepository.getDistrictEntitlements(tenantId, schoolId),
      coverageProfileRepository.getParentSubscription(learnerId),
    ]);

    // Build district coverage
    const districtCoverage = this.buildDistrictCoverage(
      tenantId,
      schoolId,
      gradeBand,
      districtEntitlements
    );

    // Build parent coverage (with overlap detection)
    const districtModules = districtCoverage?.coveredFeatures ?? new Set<string>();
    const parentCoverage = this.buildParentCoverage(learnerId, parentSubscription, districtModules);

    // Compute effective modules
    const parentModules = parentCoverage?.coveredFeatures ?? new Set<string>();
    const effectiveModules = computeEffectiveModules(districtModules, parentModules);

    // Build payer map with precedence rules
    const payerForFeature = new Map<string, FeaturePayer>();
    for (const feature of effectiveModules) {
      payerForFeature.set(feature, computeFeaturePayer(feature, districtModules, parentModules));
    }

    // Build coverage details
    const coverageDetails = this.buildCoverageDetails(
      districtCoverage,
      parentCoverage,
      payerForFeature
    );

    // Determine upsell opportunities (features not covered)
    const upsellOpportunities = Object.values(FeatureKeyValues).filter(
      (feature) => !effectiveModules.has(feature) && !districtModules.has(feature)
    );

    const now = new Date();
    return {
      learnerId,
      grade,
      gradeBand,
      tenantId,
      schoolId,
      hasDistrictCoverage: districtCoverage !== null && districtModules.size > 0,
      hasParentCoverage: parentCoverage !== null && parentModules.size > 0,
      districtCoverage,
      parentCoverage,
      districtModules,
      parentModules,
      effectiveModules,
      payerForFeature,
      coverageDetails,
      upsellOpportunities,
      computedAt: now,
      expiresAt: new Date(now.getTime() + CACHE_TTL_MS),
    };
  }

  /**
   * Build district coverage from entitlements.
   */
  private buildDistrictCoverage(
    tenantId: string,
    schoolId: string | null,
    gradeBand: GradeBand,
    entitlements: DistrictEntitlementData[]
  ): DistrictCoverage | null {
    if (entitlements.length === 0) {
      return null;
    }

    // Group by contract (typically there's one active contract)
    const byContract = new Map<string, DistrictEntitlementData[]>();
    for (const ent of entitlements) {
      const existing = byContract.get(ent.contractId) ?? [];
      existing.push(ent);
      byContract.set(ent.contractId, existing);
    }

    // Use the first active contract (could be extended to merge multiple)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const [contractId, contractEntitlements] = byContract.entries().next().value!;
    const firstEntitlement = contractEntitlements[0];

    // Collect all feature keys from entitlements
    const coveredFeatures = new Set<string>();
    let minStartDate = firstEntitlement.startDate;
    let maxEndDate = firstEntitlement.endDate;

    for (const ent of contractEntitlements) {
      coveredFeatures.add(ent.featureKey);
      if (ent.startDate < minStartDate) minStartDate = ent.startDate;
      if (ent.endDate > maxEndDate) maxEndDate = ent.endDate;
    }

    return {
      tenantId,
      contractId,
      contractNumber: firstEntitlement.contractNumber,
      schoolId,
      gradeBand,
      coveredFeatures,
      startDate: minStartDate,
      endDate: maxEndDate,
      isActive: true,
    };
  }

  /**
   * Build parent coverage from subscription.
   * Detects overlaps with district coverage.
   */
  private buildParentCoverage(
    learnerId: string,
    subscription: ParentSubscriptionData | null,
    districtModules: Set<string>
  ): ParentCoverage | null {
    if (!subscription) {
      return null;
    }

    const coveredFeatures = new Set(subscription.coveredFeatures);
    const overlappingFeatures = findOverlappingFeatures(districtModules, coveredFeatures);

    return {
      billingAccountId: subscription.billingAccountId,
      subscriptionId: subscription.subscriptionId,
      linkedLearnerId: learnerId,
      coveredFeatures,
      overlappingFeatures,
      periodStart: subscription.periodStart,
      periodEnd: subscription.periodEnd,
      isActive: subscription.status === 'ACTIVE' || subscription.status === 'IN_TRIAL',
      status: subscription.status,
    };
  }

  /**
   * Build detailed coverage info for each feature.
   */
  private buildCoverageDetails(
    districtCoverage: DistrictCoverage | null,
    parentCoverage: ParentCoverage | null,
    payerForFeature: Map<string, FeaturePayer>
  ): FeatureCoverageDetail[] {
    const details: FeatureCoverageDetail[] = [];

    for (const [featureKey, payer] of payerForFeature) {
      let sourceType: CoverageSourceType | null = null;
      let sourceId: string | null = null;
      let displayLabel: string;
      let expiresAt: Date | null = null;

      if (payer === FeaturePayerValues.DISTRICT && districtCoverage) {
        sourceType = CoverageSourceTypeValues.DISTRICT_CONTRACT;
        sourceId = districtCoverage.contractId;
        displayLabel = 'Provided by your school';
        expiresAt = districtCoverage.endDate;
      } else if (payer === FeaturePayerValues.PARENT && parentCoverage) {
        sourceType = featureKey.startsWith('ADDON_')
          ? CoverageSourceTypeValues.PARENT_ADDON_SUBSCRIPTION
          : CoverageSourceTypeValues.PARENT_BASE_SUBSCRIPTION;
        sourceId = parentCoverage.subscriptionId;
        displayLabel = 'Your subscription';
        expiresAt = parentCoverage.periodEnd;
      } else {
        displayLabel = 'Not covered';
      }

      details.push({
        featureKey,
        payer,
        sourceType,
        sourceId,
        displayLabel,
        expiresAt,
      });
    }

    return details;
  }

  // --------------------------------------------------------------------------
  // District Admin Views
  // --------------------------------------------------------------------------

  /**
   * Get aggregate view of parent add-ons for district admin dashboard.
   * Shows what add-ons parents are purchasing for learners in the district.
   */
  async getParentAddonAggregateView(
    tenantId: string,
    schoolId?: string | null
  ): Promise<ParentAddonAggregateView> {
    // Get district entitlements
    const districtEntitlements = await coverageProfileRepository.getDistrictEntitlements(
      tenantId,
      schoolId
    );
    const districtFeatures = new Set(districtEntitlements.map((e) => e.featureKey));

    // Get parent subscriptions
    const parentSubscriptions = await coverageProfileRepository.getParentSubscriptionsForTenant(
      tenantId,
      schoolId
    );

    // Count learners (simplified - would come from learner service)
    const totalLearners = 1000; // Placeholder - integrate with learner service
    const learnersWithParentSubs = new Set(
      parentSubscriptions.map((s) => s.linkedLearnerId).filter(Boolean)
    ).size;

    // Build addon breakdown
    const featureCounts: Record<FeatureKey, { district: number; parent: number }> = {} as Record<
      FeatureKey,
      { district: number; parent: number }
    >;
    const allFeatures = Object.values(FeatureKeyValues);

    for (const feature of allFeatures) {
      featureCounts[feature] = {
        district: districtFeatures.has(feature) ? totalLearners : 0,
        parent: 0,
      };
    }

    // Count parent purchases per feature
    for (const sub of parentSubscriptions) {
      for (const feature of sub.coveredFeatures) {
        // Only count features that are in our known feature list
        if (Object.prototype.hasOwnProperty.call(featureCounts, feature)) {
          featureCounts[feature as FeatureKey].parent++;
        }
      }
    }

    const addonBreakdown: AddonBreakdownItem[] = allFeatures.map((feature) => ({
      featureKey: feature,
      displayName: getFeatureDisplayName(feature),
      districtCoveredCount: featureCounts[feature].district,
      parentPurchasedCount: featureCounts[feature].parent,
      notCoveredCount: Math.max(
        0,
        totalLearners - featureCounts[feature].district - featureCounts[feature].parent
      ),
    }));

    // Find top parent add-ons (opportunity for district to bundle)
    const topParentAddons: TopAddonItem[] = addonBreakdown
      .filter((a) => a.parentPurchasedCount > 0)
      .sort((a, b) => b.parentPurchasedCount - a.parentPurchasedCount)
      .slice(0, 5)
      .map((a) => ({
        featureKey: a.featureKey,
        displayName: a.displayName,
        purchaseCount: a.parentPurchasedCount,
        // Rough estimate: $5/month * count * 12 months
        potentialSavingsEstimateCents: a.parentPurchasedCount * 500 * 12,
      }));

    return {
      tenantId,
      schoolId: schoolId ?? null,
      totalLearners,
      learnersWithParentSubs,
      parentCoveragePercentage: (learnersWithParentSubs / totalLearners) * 100,
      addonBreakdown,
      topParentAddons,
      computedAt: new Date(),
    };
  }

  // --------------------------------------------------------------------------
  // Feature Access Checks
  // --------------------------------------------------------------------------

  /**
   * Check if a learner has access to a specific feature.
   */
  async hasFeatureAccess(
    learnerId: string,
    learnerInfo: LearnerInfo,
    featureKey: string
  ): Promise<boolean> {
    const profile = await this.getCoverageProfile(learnerId, learnerInfo);
    return profile.effectiveModules.has(featureKey);
  }

  /**
   * Get the payer for a specific feature.
   */
  async getFeaturePayer(
    learnerId: string,
    learnerInfo: LearnerInfo,
    featureKey: string
  ): Promise<FeaturePayer> {
    const profile = await this.getCoverageProfile(learnerId, learnerInfo);
    return profile.payerForFeature.get(featureKey) ?? FeaturePayerValues.NONE;
  }

  /**
   * Check if a feature is provided by district (for UI "Provided by school" label).
   */
  async isFeatureProvidedByDistrict(
    learnerId: string,
    learnerInfo: LearnerInfo,
    featureKey: string
  ): Promise<boolean> {
    const payer = await this.getFeaturePayer(learnerId, learnerInfo, featureKey);
    return payer === FeaturePayerValues.DISTRICT;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get human-readable display name for a feature key.
 */
function getFeatureDisplayName(featureKey: string): string {
  const displayNames: Record<string, string> = {
    [FeatureKeyValues.MODULE_ELA]: 'English Language Arts',
    [FeatureKeyValues.MODULE_MATH]: 'Mathematics',
    [FeatureKeyValues.MODULE_SCIENCE]: 'Science',
    [FeatureKeyValues.ADDON_SEL]: 'Social-Emotional Learning',
    [FeatureKeyValues.ADDON_SPEECH]: 'Speech & Language',
    [FeatureKeyValues.ADDON_TUTORING]: 'AI Tutoring',
    [FeatureKeyValues.FEATURE_HOMEWORK_HELPER]: 'Homework Helper',
    [FeatureKeyValues.FEATURE_PROGRESS_REPORTS]: 'Progress Reports',
    [FeatureKeyValues.FEATURE_PARENT_INSIGHTS]: 'Parent Insights',
  };
  return displayNames[featureKey] ?? featureKey;
}

// Export singleton instance
export const coverageProfileService = new CoverageProfileService();
