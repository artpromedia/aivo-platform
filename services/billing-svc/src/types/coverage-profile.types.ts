/**
 * Coverage Profile Types
 *
 * Type definitions for hybrid billing coverage profiles that combine
 * district entitlements with parent subscriptions.
 *
 * Coverage profiles compute a learner's effective feature access and determine
 * which entity (district or parent) is responsible for paying for each feature.
 *
 * PRECEDENCE RULES:
 * 1. District coverage always wins for overlapping features
 * 2. Parent subscriptions only cover features NOT provided by district
 * 3. Features not covered by either result in upsell opportunity
 */

import { z } from 'zod';

import type { GradeBand } from './licensing.types.js';

// ============================================================================
// Enums & Constants
// ============================================================================

/**
 * Entity responsible for paying for a feature.
 */
export const FeaturePayerValues = {
  /** Feature is covered by district contract */
  DISTRICT: 'DISTRICT',
  /** Feature is covered by parent subscription */
  PARENT: 'PARENT',
  /** Feature is not covered - upsell opportunity */
  NONE: 'NONE',
} as const;
export type FeaturePayer = (typeof FeaturePayerValues)[keyof typeof FeaturePayerValues];

/**
 * Coverage source type for audit trail.
 */
export const CoverageSourceTypeValues = {
  /** Coverage from district contract entitlement */
  DISTRICT_CONTRACT: 'DISTRICT_CONTRACT',
  /** Coverage from parent base subscription */
  PARENT_BASE_SUBSCRIPTION: 'PARENT_BASE_SUBSCRIPTION',
  /** Coverage from parent add-on subscription */
  PARENT_ADDON_SUBSCRIPTION: 'PARENT_ADDON_SUBSCRIPTION',
} as const;
export type CoverageSourceType =
  (typeof CoverageSourceTypeValues)[keyof typeof CoverageSourceTypeValues];

/**
 * Standard module/feature keys used across the platform.
 */
export const FeatureKeyValues = {
  // Core curriculum modules
  MODULE_ELA: 'MODULE_ELA',
  MODULE_MATH: 'MODULE_MATH',
  MODULE_SCIENCE: 'MODULE_SCIENCE',

  // Add-on modules
  ADDON_SEL: 'ADDON_SEL',
  ADDON_SPEECH: 'ADDON_SPEECH',
  ADDON_TUTORING: 'ADDON_TUTORING',

  // Platform features
  FEATURE_HOMEWORK_HELPER: 'FEATURE_HOMEWORK_HELPER',
  FEATURE_PROGRESS_REPORTS: 'FEATURE_PROGRESS_REPORTS',
  FEATURE_PARENT_INSIGHTS: 'FEATURE_PARENT_INSIGHTS',
} as const;
export type FeatureKey = (typeof FeatureKeyValues)[keyof typeof FeatureKeyValues];

// ============================================================================
// Coverage Detail Types
// ============================================================================

/**
 * Details about coverage for a single feature.
 */
export interface FeatureCoverageDetail {
  /** The feature/module key */
  featureKey: string;

  /** Who pays for this feature */
  payer: FeaturePayer;

  /** Source of the coverage */
  sourceType: CoverageSourceType | null;

  /** ID of the source (contract ID, subscription ID, etc.) */
  sourceId: string | null;

  /** Human-readable description for UI */
  displayLabel: string;

  /** When coverage expires (null if no expiry) */
  expiresAt: Date | null;
}

/**
 * Coverage from a district contract.
 */
export interface DistrictCoverage {
  /** Tenant (district) ID */
  tenantId: string;

  /** Contract ID providing coverage */
  contractId: string;

  /** Contract number for display */
  contractNumber: string;

  /** School ID if coverage is school-specific */
  schoolId: string | null;

  /** Grade band covered */
  gradeBand: GradeBand;

  /** Set of feature keys covered by district */
  coveredFeatures: Set<string>;

  /** Contract start date */
  startDate: Date;

  /** Contract end date */
  endDate: Date;

  /** Whether district coverage is currently active */
  isActive: boolean;
}

/**
 * Coverage from a parent subscription.
 */
export interface ParentCoverage {
  /** Parent's billing account ID */
  billingAccountId: string;

  /** Parent subscription ID */
  subscriptionId: string;

  /** Linked learner ID (the child this subscription covers) */
  linkedLearnerId: string;

  /** Set of feature keys covered by parent subscription */
  coveredFeatures: Set<string>;

  /** Features that overlap with district (potential refund) */
  overlappingFeatures: Set<string>;

  /** Current billing period start */
  periodStart: Date;

  /** Current billing period end */
  periodEnd: Date;

  /** Whether parent subscription is currently active */
  isActive: boolean;

  /** Subscription status */
  status: string;
}

// ============================================================================
// Coverage Profile Types
// ============================================================================

/**
 * Complete coverage profile for a learner.
 *
 * Combines district entitlements with parent subscriptions and applies
 * precedence rules to determine effective coverage.
 */
export interface CoverageProfile {
  /** Learner ID this profile is for */
  learnerId: string;

  /** Learner's current grade (for grade band determination) */
  grade: number | string;

  /** Learner's grade band */
  gradeBand: GradeBand;

  /** Tenant (district) ID the learner belongs to */
  tenantId: string;

  /** School ID the learner belongs to (optional) */
  schoolId: string | null;

  /** Whether learner has any district coverage */
  hasDistrictCoverage: boolean;

  /** Whether learner has any parent coverage */
  hasParentCoverage: boolean;

  /** District coverage details (null if no district coverage) */
  districtCoverage: DistrictCoverage | null;

  /** Parent coverage details (null if no parent coverage) */
  parentCoverage: ParentCoverage | null;

  /** Features covered by district (for quick lookup) */
  districtModules: Set<string>;

  /** Features covered by parent (for quick lookup) */
  parentModules: Set<string>;

  /** All features learner has access to (union minus overlaps resolved to district) */
  effectiveModules: Set<string>;

  /** Map of feature key to payer for detailed lookup */
  payerForFeature: Map<string, FeaturePayer>;

  /** Detailed coverage info for each feature */
  coverageDetails: FeatureCoverageDetail[];

  /** Features available for parent upsell (not covered by district) */
  upsellOpportunities: string[];

  /** When this profile was computed */
  computedAt: Date;

  /** Cache TTL - when this profile should be recomputed */
  expiresAt: Date;
}

/**
 * Summary of coverage for UI display.
 */
export interface CoverageProfileSummary {
  /** Learner ID */
  learnerId: string;

  /** Whether learner has district base coverage */
  hasDistrictBase: boolean;

  /** Whether learner has parent subscription */
  hasParentSubscription: boolean;

  /** Number of features covered by district */
  districtFeatureCount: number;

  /** Number of features covered by parent */
  parentFeatureCount: number;

  /** Total effective features */
  totalEffectiveFeatures: number;

  /** Features where parent is paying but district could cover */
  refundableOverlapCount: number;
}

// ============================================================================
// Billing Reconciliation Types
// ============================================================================

/**
 * Overlap detection result for billing reconciliation.
 */
export interface CoverageOverlap {
  /** Learner ID with overlap */
  learnerId: string;

  /** Feature that overlaps */
  featureKey: string;

  /** District contract providing coverage */
  districtContractId: string;

  /** Parent subscription also covering this feature */
  parentSubscriptionId: string;

  /** Amount parent is being charged for this feature (cents) */
  parentChargeAmountCents: number;

  /** Recommended action */
  recommendedAction: 'CREDIT' | 'DOWNGRADE' | 'NONE';

  /** Pro-rata credit amount if applicable (cents) */
  proRataCreditCents: number | null;
}

/**
 * Result of billing reconciliation job.
 */
export interface ReconciliationResult {
  /** When reconciliation was run */
  runAt: Date;

  /** Number of learners processed */
  learnersProcessed: number;

  /** Overlaps detected */
  overlapsDetected: CoverageOverlap[];

  /** Total potential credit amount (cents) */
  totalPotentialCreditCents: number;

  /** Number of subscriptions marked for migration */
  subscriptionsMarkedForMigration: number;

  /** Errors encountered */
  errors: ReconciliationError[];
}

export interface ReconciliationError {
  learnerId: string;
  error: string;
  timestamp: Date;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export const GetCoverageProfileRequestSchema = z.object({
  learnerId: z.string().uuid(),
  includeDetails: z.boolean().default(true),
  forceRefresh: z.boolean().default(false),
});
export type GetCoverageProfileRequest = z.infer<typeof GetCoverageProfileRequestSchema>;

export interface GetCoverageProfileResponse {
  profile: CoverageProfile;
  summary: CoverageProfileSummary;
}

export const BatchGetCoverageProfilesRequestSchema = z.object({
  learnerIds: z.array(z.string().uuid()).min(1).max(100),
  includeDetails: z.boolean().default(false),
});
export type BatchGetCoverageProfilesRequest = z.infer<typeof BatchGetCoverageProfilesRequestSchema>;

export interface BatchGetCoverageProfilesResponse {
  profiles: Record<string, CoverageProfile>;
  summaries: Record<string, CoverageProfileSummary>;
  errors: Record<string, string>;
}

// ============================================================================
// District Admin View Types
// ============================================================================

/**
 * Aggregate view of parent add-ons for district admin dashboard.
 */
export interface ParentAddonAggregateView {
  /** District tenant ID */
  tenantId: string;

  /** School ID (null for district-wide view) */
  schoolId: string | null;

  /** Total learners in scope */
  totalLearners: number;

  /** Learners with parent subscriptions */
  learnersWithParentSubs: number;

  /** Percentage with parent coverage */
  parentCoveragePercentage: number;

  /** Breakdown by add-on module */
  addonBreakdown: AddonBreakdownItem[];

  /** Top add-ons purchased by parents (opportunity for district to bundle) */
  topParentAddons: TopAddonItem[];

  /** When this view was computed */
  computedAt: Date;
}

export interface AddonBreakdownItem {
  /** Feature/module key */
  featureKey: string;

  /** Human-readable name */
  displayName: string;

  /** Count covered by district */
  districtCoveredCount: number;

  /** Count purchased by parents */
  parentPurchasedCount: number;

  /** Count not covered at all */
  notCoveredCount: number;
}

export interface TopAddonItem {
  /** Feature/module key */
  featureKey: string;

  /** Human-readable name */
  displayName: string;

  /** Number of parents purchasing this */
  purchaseCount: number;

  /** Potential savings if district bundled (estimate) */
  potentialSavingsEstimateCents: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Creates an empty coverage profile for a learner with no coverage.
 */
export function createEmptyCoverageProfile(
  learnerId: string,
  grade: number | string,
  gradeBand: GradeBand,
  tenantId: string,
  schoolId: string | null
): CoverageProfile {
  const now = new Date();
  return {
    learnerId,
    grade,
    gradeBand,
    tenantId,
    schoolId,
    hasDistrictCoverage: false,
    hasParentCoverage: false,
    districtCoverage: null,
    parentCoverage: null,
    districtModules: new Set(),
    parentModules: new Set(),
    effectiveModules: new Set(),
    payerForFeature: new Map(),
    coverageDetails: [],
    upsellOpportunities: Object.values(FeatureKeyValues),
    computedAt: now,
    expiresAt: new Date(now.getTime() + 5 * 60 * 1000), // 5 min TTL
  };
}

/**
 * Computes the payer for a feature based on precedence rules.
 * District coverage always wins over parent coverage.
 */
export function computeFeaturePayer(
  featureKey: string,
  districtModules: Set<string>,
  parentModules: Set<string>
): FeaturePayer {
  // Precedence rule: District wins
  if (districtModules.has(featureKey)) {
    return FeaturePayerValues.DISTRICT;
  }
  if (parentModules.has(featureKey)) {
    return FeaturePayerValues.PARENT;
  }
  return FeaturePayerValues.NONE;
}

/**
 * Finds features where parent is paying but district also covers.
 */
export function findOverlappingFeatures(
  districtModules: Set<string>,
  parentModules: Set<string>
): Set<string> {
  const overlapping = new Set<string>();
  for (const feature of parentModules) {
    if (districtModules.has(feature)) {
      overlapping.add(feature);
    }
  }
  return overlapping;
}

/**
 * Computes effective modules after applying precedence rules.
 */
export function computeEffectiveModules(
  districtModules: Set<string>,
  parentModules: Set<string>
): Set<string> {
  // Union of both, but precedence is already handled at payer level
  return new Set([...districtModules, ...parentModules]);
}

/**
 * Converts a coverage profile to a summary for UI display.
 */
export function profileToSummary(profile: CoverageProfile): CoverageProfileSummary {
  const overlappingFeatures = profile.parentCoverage?.overlappingFeatures ?? new Set();

  return {
    learnerId: profile.learnerId,
    hasDistrictBase: profile.hasDistrictCoverage,
    hasParentSubscription: profile.hasParentCoverage,
    districtFeatureCount: profile.districtModules.size,
    parentFeatureCount: profile.parentModules.size,
    totalEffectiveFeatures: profile.effectiveModules.size,
    refundableOverlapCount: overlappingFeatures.size,
  };
}
