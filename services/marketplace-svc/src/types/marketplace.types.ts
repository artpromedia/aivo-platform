/**
 * Marketplace Domain Types
 *
 * Core TypeScript types for the Marketplace & Catalog domain.
 * These types are used across the marketplace-svc codebase.
 */

// ══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Vendor type - Aivo internal or external third-party
 */
export const VendorType = {
  AIVO: 'AIVO',
  THIRD_PARTY: 'THIRD_PARTY',
} as const;
export type VendorType = (typeof VendorType)[keyof typeof VendorType];

/**
 * Type of marketplace item
 */
export const MarketplaceItemType = {
  CONTENT_PACK: 'CONTENT_PACK',
  EMBEDDED_TOOL: 'EMBEDDED_TOOL',
} as const;
export type MarketplaceItemType = (typeof MarketplaceItemType)[keyof typeof MarketplaceItemType];

/**
 * Subject areas (aligned with content-svc)
 */
export const MarketplaceSubject = {
  ELA: 'ELA',
  MATH: 'MATH',
  SCIENCE: 'SCIENCE',
  SEL: 'SEL',
  SPEECH: 'SPEECH',
  STEM: 'STEM',
  SOCIAL_STUDIES: 'SOCIAL_STUDIES',
  ARTS: 'ARTS',
  FOREIGN_LANGUAGE: 'FOREIGN_LANGUAGE',
  OTHER: 'OTHER',
} as const;
export type MarketplaceSubject = (typeof MarketplaceSubject)[keyof typeof MarketplaceSubject];

/**
 * Grade bands (aligned with content-svc)
 */
export const MarketplaceGradeBand = {
  PRE_K: 'PRE_K',
  K_2: 'K_2',
  G3_5: 'G3_5',
  G6_8: 'G6_8',
  G9_12: 'G9_12',
  ALL_GRADES: 'ALL_GRADES',
} as const;
export type MarketplaceGradeBand = (typeof MarketplaceGradeBand)[keyof typeof MarketplaceGradeBand];

/**
 * Content/tool modalities
 */
export const MarketplaceModality = {
  GAME: 'GAME',
  DRILL: 'DRILL',
  PROJECT: 'PROJECT',
  SEL_ACTIVITY: 'SEL_ACTIVITY',
  ASSESSMENT: 'ASSESSMENT',
  SIMULATION: 'SIMULATION',
  VIDEO: 'VIDEO',
  READING: 'READING',
  AUDIO: 'AUDIO',
  MIXED: 'MIXED',
} as const;
export type MarketplaceModality = (typeof MarketplaceModality)[keyof typeof MarketplaceModality];

/**
 * Version review status for Aivo internal review
 */
export const MarketplaceVersionStatus = {
  DRAFT: 'DRAFT',
  PENDING_REVIEW: 'PENDING_REVIEW',
  IN_REVIEW: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PUBLISHED: 'PUBLISHED',
  DEPRECATED: 'DEPRECATED',
} as const;
export type MarketplaceVersionStatus = (typeof MarketplaceVersionStatus)[keyof typeof MarketplaceVersionStatus];

/**
 * Installation status for tenant/school/classroom
 */
export const InstallationStatus = {
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  ACTIVE: 'ACTIVE',
  DISABLED: 'DISABLED',
  REVOKED: 'REVOKED',
} as const;
export type InstallationStatus = (typeof InstallationStatus)[keyof typeof InstallationStatus];

/**
 * Launch type for embedded tools
 */
export const EmbeddedToolLaunchType = {
  IFRAME_WEB: 'IFRAME_WEB',
  NATIVE_DEEPLINK: 'NATIVE_DEEPLINK',
  LTI_LIKE: 'LTI_LIKE',
} as const;
export type EmbeddedToolLaunchType = (typeof EmbeddedToolLaunchType)[keyof typeof EmbeddedToolLaunchType];

/**
 * Pricing model for marketplace items (display/marketing)
 */
export const PricingModel = {
  FREE: 'FREE',
  FREE_TRIAL: 'FREE_TRIAL',
  PAID_PER_SEAT: 'PAID_PER_SEAT',
  PAID_FLAT_RATE: 'PAID_FLAT_RATE',
  FREEMIUM: 'FREEMIUM',
  CUSTOM: 'CUSTOM',
} as const;
export type PricingModel = (typeof PricingModel)[keyof typeof PricingModel];

/**
 * Billing model for marketplace items (actual billing logic)
 */
export const MarketplaceBillingModel = {
  FREE: 'FREE',
  TENANT_FLAT: 'TENANT_FLAT',
  PER_SEAT: 'PER_SEAT',
} as const;
export type MarketplaceBillingModel = (typeof MarketplaceBillingModel)[keyof typeof MarketplaceBillingModel];

/**
 * Billing status for marketplace installations
 */
export const MarketplaceBillingStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  CANCELED: 'CANCELED',
  EXPIRED: 'EXPIRED',
} as const;
export type MarketplaceBillingStatus = (typeof MarketplaceBillingStatus)[keyof typeof MarketplaceBillingStatus];

/**
 * Safety certification level
 */
export const SafetyCertification = {
  AIVO_CERTIFIED: 'AIVO_CERTIFIED',
  VENDOR_ATTESTED: 'VENDOR_ATTESTED',
  PENDING_REVIEW: 'PENDING_REVIEW',
  NOT_REVIEWED: 'NOT_REVIEWED',
} as const;
export type SafetyCertification = (typeof SafetyCertification)[keyof typeof SafetyCertification];

/**
 * Safety rating for marketplace item versions
 */
export const SafetyRating = {
  PENDING: 'PENDING',
  APPROVED_K12: 'APPROVED_K12',
  RESTRICTED: 'RESTRICTED',
  REJECTED: 'REJECTED',
} as const;
export type SafetyRating = (typeof SafetyRating)[keyof typeof SafetyRating];

/**
 * Data access profile for embedded tools
 */
export const DataAccessProfile = {
  MINIMAL: 'MINIMAL',
  MODERATE: 'MODERATE',
  HIGH: 'HIGH',
} as const;
export type DataAccessProfile = (typeof DataAccessProfile)[keyof typeof DataAccessProfile];

/**
 * Safety review action types
 */
export const SafetyReviewAction = {
  SUBMITTED: 'SUBMITTED',
  STARTED: 'STARTED',
  DATA_TAGGED: 'DATA_TAGGED',
  CHECKS_COMPLETED: 'CHECKS_COMPLETED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  ESCALATED: 'ESCALATED',
} as const;
export type SafetyReviewAction = (typeof SafetyReviewAction)[keyof typeof SafetyReviewAction];

/**
 * Common policy tags for marketplace items
 */
export const PolicyTag = {
  NO_CHAT: 'NO_CHAT',
  NO_VIDEO: 'NO_VIDEO',
  NO_USER_GENERATED_CONTENT: 'NO_USER_GENERATED_CONTENT',
  NO_EXTERNAL_LINKS: 'NO_EXTERNAL_LINKS',
  NO_ADS: 'NO_ADS',
  COPPA_VERIFIED: 'COPPA_VERIFIED',
  FERPA_ALIGNED: 'FERPA_ALIGNED',
  ACCESSIBILITY_AA: 'ACCESSIBILITY_AA',
  OFFLINE_CAPABLE: 'OFFLINE_CAPABLE',
  DIAGNOSTIC_USE: 'DIAGNOSTIC_USE',
} as const;
export type PolicyTag = (typeof PolicyTag)[keyof typeof PolicyTag];

/**
 * Data categories that tools may access
 */
export const DataCategory = {
  PSEUDONYMOUS_LEARNER_ID: 'PSEUDONYMOUS_LEARNER_ID',
  GRADE_LEVEL: 'GRADE_LEVEL',
  LEARNING_PREFERENCES: 'LEARNING_PREFERENCES',
  PROGRESS_DATA: 'PROGRESS_DATA',
  SESSION_EVENTS: 'SESSION_EVENTS',
  ASSESSMENT_RESULTS: 'ASSESSMENT_RESULTS',
  LEARNER_NAME: 'LEARNER_NAME',
  SCHOOL_INFO: 'SCHOOL_INFO',
} as const;
export type DataCategory = (typeof DataCategory)[keyof typeof DataCategory];

// ══════════════════════════════════════════════════════════════════════════════
// ENTITY INTERFACES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Vendor - Content/tool publisher
 */
export interface Vendor {
  id: string;
  slug: string;
  name: string;
  type: VendorType;
  contactEmail: string;
  websiteUrl: string | null;
  logoUrl: string | null;
  description: string | null;
  isVerified: boolean;
  isActive: boolean;
  metadataJson: VendorMetadata | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VendorMetadata {
  legalName?: string;
  taxId?: string;
  complianceCerts?: string[];
  supportEmail?: string;
  supportUrl?: string;
}

/**
 * Screenshot entry for marketplace items
 */
export interface Screenshot {
  url: string;
  caption?: string;
  order: number;
}

/**
 * Marketplace Item - Catalog listing
 */
export interface MarketplaceItem {
  id: string;
  vendorId: string;
  slug: string;
  itemType: MarketplaceItemType;
  title: string;
  shortDescription: string;
  longDescription: string;
  subjects: MarketplaceSubject[];
  gradeBands: MarketplaceGradeBand[];
  modalities: MarketplaceModality[];
  iconUrl: string | null;
  screenshotsJson: Screenshot[] | null;
  isActive: boolean;
  isFeatured: boolean;
  pricingModel: PricingModel;
  priceCents: number | null;
  // Billing fields
  isFree: boolean;
  billingModel: MarketplaceBillingModel;
  billingSku: string | null;
  billingMetadataJson: BillingMetadata | null;
  // End billing fields
  safetyCert: SafetyCertification;
  metadataJson: MarketplaceItemMetadata | null;
  searchKeywords: string[];
  avgRating: number | null;
  totalInstalls: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Billing metadata for marketplace items
 */
export interface BillingMetadata {
  /** Trial period in days (0 = no trial) */
  trialDays?: number;
  /** Minimum seats for PER_SEAT billing */
  minSeats?: number;
  /** Price per seat in cents for PER_SEAT billing */
  pricePerSeatCents?: number;
  /** Flat price in cents for TENANT_FLAT billing */
  flatPriceCents?: number;
  /** Billing period: MONTHLY, ANNUAL */
  billingPeriod?: 'MONTHLY' | 'ANNUAL';
  /** Additional custom fields */
  [key: string]: unknown;
}

export interface MarketplaceItemMetadata {
  /** Alignment to educational standards (CCSS, etc.) */
  standards?: string[];
  /** Supported languages */
  languages?: string[];
  /** Accessibility features */
  accessibility?: string[];
  /** Minimum recommended age */
  minAge?: number;
  /** Maximum recommended age */
  maxAge?: number;
  /** Estimated time to complete (minutes) */
  estimatedDuration?: number;
  /** Any additional custom fields */
  [key: string]: unknown;
}

/**
 * Marketplace Item Version - Versioned release
 */
export interface MarketplaceItemVersion {
  id: string;
  marketplaceItemId: string;
  version: string;
  status: MarketplaceVersionStatus;
  changelog: string | null;
  reviewNotes: string | null;
  submittedByUserId: string | null;
  reviewedByUserId: string | null;
  approvedByUserId: string | null;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  publishedAt: Date | null;
  deprecatedAt: Date | null;
  // Safety & Moderation fields
  safetyRating: SafetyRating;
  dataAccessProfile: DataAccessProfile;
  safetyNotes: string | null;
  policyTags: string[];
  dataCategoriesAccessed: string[];
  safetyReviewedByUserId: string | null;
  safetyReviewedAt: Date | null;
  automatedChecksJson: AutomatedChecksResult | null;
  automatedChecksPassed: boolean | null;
  // End safety fields
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Automated safety checks result
 */
export interface AutomatedChecksResult {
  checkedAt: Date;
  domainAllowlistCheck?: {
    passed: boolean;
    domain: string;
    message?: string;
  };
  scopeCheck?: {
    passed: boolean;
    disallowedScopes: string[];
    message?: string;
  };
  contentScanCheck?: {
    passed: boolean;
    flaggedIssues: string[];
    message?: string;
  };
  overall: boolean;
}

/**
 * Content Pack Item - LO reference within a pack
 */
export interface ContentPackItem {
  id: string;
  marketplaceItemVersionId: string;
  loVersionId: string;
  loId: string | null;
  position: number;
  isHighlight: boolean;
  metadataJson: ContentPackItemMetadata | null;
  createdAt: Date;
}

export interface ContentPackItemMetadata {
  /** Custom title override */
  titleOverride?: string;
  /** Custom description for this context */
  description?: string;
  /** Tags for filtering within pack */
  tags?: string[];
}

/**
 * Embedded Tool Config - Tool integration settings
 */
export interface EmbeddedToolConfig {
  id: string;
  marketplaceItemVersionId: string;
  launchUrl: string;
  launchType: EmbeddedToolLaunchType;
  requiredScopes: ToolScope[];
  optionalScopes: ToolScope[];
  configSchemaJson: JsonSchema | null;
  defaultConfigJson: Record<string, unknown> | null;
  webhookUrl: string | null;
  webhookSecret: string | null;
  oauthClientId: string | null;
  oauthCallbackUrl: string | null;
  cspDirectives: string | null;
  sandboxAttributes: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Data access scopes for embedded tools
 */
export type ToolScope =
  | 'LEARNER_PROFILE_MIN'      // Basic learner info (id, display name)
  | 'LEARNER_PROFILE_FULL'     // Extended learner profile
  | 'LEARNER_PROGRESS_READ'    // Read learner progress data
  | 'LEARNER_PROGRESS_WRITE'   // Write learner progress data
  | 'SESSION_EVENTS_READ'      // Read session event data
  | 'SESSION_EVENTS_WRITE'     // Write session events
  | 'ASSIGNMENT_READ'          // Read assignments
  | 'ASSIGNMENT_WRITE'         // Create/update assignments
  | 'CLASSROOM_READ'           // Read classroom info
  | 'TENANT_CONFIG_READ';      // Read tenant configuration

/**
 * JSON Schema definition (subset)
 */
export interface JsonSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface JsonSchemaProperty {
  type: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
}

/**
 * Marketplace Installation - Tenant/school/classroom enablement
 */
export interface MarketplaceInstallation {
  id: string;
  marketplaceItemId: string;
  marketplaceItemVersionId: string;
  tenantId: string;
  schoolId: string | null;
  classroomId: string | null;
  installedByUserId: string;
  approvedByUserId: string | null;
  status: InstallationStatus;
  configJson: Record<string, unknown> | null;
  installReason: string | null;
  approvalNotes: string | null;
  installedAt: Date;
  approvedAt: Date | null;
  disabledAt: Date | null;
  // Billing linkage fields
  contractLineItemId: string | null;
  billingStatus: MarketplaceBillingStatus;
  billingStartedAt: Date | null;
  billingEndedAt: Date | null;
  seatQuantity: number | null;
  billingMetadataJson: InstallationBillingMetadata | null;
  // End billing fields
  updatedAt: Date;
}

/**
 * Billing metadata for marketplace installations
 */
export interface InstallationBillingMetadata {
  /** Price at time of install in cents */
  priceAtInstall?: number;
  /** Contract ID in billing-svc */
  contractId?: string;
  /** Contract number for display */
  contractNumber?: string;
  /** Original SKU */
  sku?: string;
  /** Additional custom fields */
  [key: string]: unknown;
}

/**
 * Vendor Revenue Share configuration
 */
export interface VendorRevenueShare {
  id: string;
  vendorId: string;
  sku: string;
  sharePercent: number;
  effectiveStartDate: Date;
  effectiveEndDate: Date | null;
  createdByUserId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Installation scope level
 */
export type InstallationScope = 'TENANT' | 'SCHOOL' | 'CLASSROOM';

/**
 * Marketplace Review - User review/rating
 */
export interface MarketplaceReview {
  id: string;
  marketplaceItemId: string;
  reviewerUserId: string;
  reviewerTenantId: string;
  rating: number; // 1-5
  title: string | null;
  body: string | null;
  isVerifiedInstall: boolean;
  isApproved: boolean;
  isFlagged: boolean;
  helpfulCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Marketplace Collection - Curated item group
 */
export interface MarketplaceCollection {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  isActive: boolean;
  displayOrder: number;
  targetAudience: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ══════════════════════════════════════════════════════════════════════════════
// STATUS TRANSITIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Version status transition record
 */
export interface VersionStatusTransition {
  id: string;
  versionId: string;
  fromStatus: MarketplaceVersionStatus;
  toStatus: MarketplaceVersionStatus;
  transitionedByUserId: string;
  reason: string | null;
  transitionedAt: Date;
}

/**
 * Installation status transition record
 */
export interface InstallationStatusTransition {
  id: string;
  installationId: string;
  fromStatus: InstallationStatus;
  toStatus: InstallationStatus;
  transitionedByUserId: string;
  reason: string | null;
  transitionedAt: Date;
}

// ══════════════════════════════════════════════════════════════════════════════
// DTOs & API TYPES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Catalog search/filter parameters
 */
export interface CatalogSearchParams {
  query?: string;
  itemType?: MarketplaceItemType;
  subjects?: MarketplaceSubject[];
  gradeBands?: MarketplaceGradeBand[];
  modalities?: MarketplaceModality[];
  pricingModel?: PricingModel;
  safetyCert?: SafetyCertification;
  vendorId?: string;
  isFeatured?: boolean;
  minRating?: number;
  sortBy?: 'relevance' | 'rating' | 'installs' | 'newest' | 'title';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

/**
 * Catalog item summary (for listing)
 */
export interface CatalogItemSummary {
  id: string;
  slug: string;
  itemType: MarketplaceItemType;
  title: string;
  shortDescription: string;
  subjects: MarketplaceSubject[];
  gradeBands: MarketplaceGradeBand[];
  iconUrl: string | null;
  pricingModel: PricingModel;
  priceCents: number | null;
  safetyCert: SafetyCertification;
  avgRating: number | null;
  totalInstalls: number;
  isFeatured: boolean;
  vendor: {
    id: string;
    slug: string;
    name: string;
    type: VendorType;
    logoUrl: string | null;
  };
}

/**
 * Catalog item detail (full view)
 */
export interface CatalogItemDetail extends CatalogItemSummary {
  longDescription: string;
  modalities: MarketplaceModality[];
  screenshotsJson: Screenshot[] | null;
  metadataJson: MarketplaceItemMetadata | null;
  searchKeywords: string[];
  latestVersion: {
    id: string;
    version: string;
    changelog: string | null;
    publishedAt: Date | null;
  } | null;
  reviewStats: {
    totalReviews: number;
    avgRating: number | null;
    ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
  };
}

/**
 * Installation request DTO
 */
export interface InstallItemRequest {
  marketplaceItemId: string;
  marketplaceItemVersionId?: string; // Defaults to latest published
  scope: InstallationScope;
  schoolId?: string;
  classroomId?: string;
  configJson?: Record<string, unknown>;
  installReason?: string;
}

/**
 * Installation approval request DTO
 */
export interface ApproveInstallationRequest {
  installationId: string;
  approvalNotes?: string;
}

/**
 * Version submission request DTO
 */
export interface SubmitVersionRequest {
  marketplaceItemId: string;
  version: string;
  changelog?: string;
  contentPackItems?: {
    loVersionId: string;
    loId?: string;
    position: number;
    isHighlight?: boolean;
    metadataJson?: ContentPackItemMetadata;
  }[];
  embeddedToolConfig?: Omit<EmbeddedToolConfig, 'id' | 'marketplaceItemVersionId' | 'createdAt' | 'updatedAt'>;
}

/**
 * Version review action DTO
 */
export interface ReviewVersionRequest {
  versionId: string;
  action: 'APPROVE' | 'REJECT';
  reviewNotes?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// SAFETY, MODERATION & POLICY
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Tenant Marketplace Policy - Tenant-specific item filtering rules
 */
export interface TenantMarketplacePolicy {
  id: string;
  tenantId: string;
  allowedSafetyRatings: SafetyRating[];
  allowedDataAccessProfiles: DataAccessProfile[];
  blockedVendorIds: string[];
  blockedItemIds: string[];
  blockedPolicyTags: string[];
  requireSafetyReview: boolean;
  allowGracePeriodDays: number;
  customRulesJson: TenantPolicyCustomRules | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Custom policy rules JSON structure
 */
export interface TenantPolicyCustomRules {
  /** Maximum data access profile for specific item types */
  maxDataAccessByItemType?: Record<MarketplaceItemType, DataAccessProfile>;
  /** Additional vendor trust requirements */
  vendorRequirements?: {
    requireVerified?: boolean;
    requireInsurance?: boolean;
    minOperatingYears?: number;
  };
  /** School/classroom level overrides */
  scopeOverrides?: {
    schoolId?: string;
    classroomId?: string;
    rules: Partial<TenantPolicyCustomRules>;
  }[];
}

/**
 * Safety Review - Trust & safety team review record
 */
export interface SafetyReview {
  id: string;
  marketplaceItemVersionId: string;
  reviewerUserId: string;
  reviewType: SafetyReviewType;
  status: SafetyReviewStatus;
  dataCategoriesAccessed: string[];
  dataUsagePurposes: string[];
  policyTagsAssigned: string[];
  diagnosticUseConfirmed: boolean;
  safetyRatingAssigned: SafetyRating | null;
  dataAccessProfileAssigned: DataAccessProfile | null;
  reviewNotes: string | null;
  internalNotes: string | null;
  automatedChecksJson: AutomatedChecksResult | null;
  escalatedToUserId: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Safety review type
 */
export const SafetyReviewType = {
  INITIAL: 'INITIAL',
  VERSION_UPDATE: 'VERSION_UPDATE',
  INCIDENT_RESPONSE: 'INCIDENT_RESPONSE',
  PERIODIC_RECHECK: 'PERIODIC_RECHECK',
  COMPLAINT: 'COMPLAINT',
} as const;
export type SafetyReviewType = typeof SafetyReviewType[keyof typeof SafetyReviewType];

/**
 * Safety review status
 */
export const SafetyReviewStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  ESCALATED: 'ESCALATED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;
export type SafetyReviewStatus = typeof SafetyReviewStatus[keyof typeof SafetyReviewStatus];

/**
 * Vendor Domain Allowlist - Approved launch URL domains per vendor
 */
export interface VendorDomainAllowlist {
  id: string;
  vendorId: string;
  domain: string;
  isActive: boolean;
  verifiedAt: Date | null;
  verifiedByUserId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tool Launch Log - Audit log for embedded tool launches
 */
export interface ToolLaunchLog {
  id: string;
  installationId: string;
  marketplaceItemVersionId: string;
  tenantId: string;
  userId: string;
  userRole: string;
  launchUrl: string;
  scopesGranted: string[];
  launchContext: ToolLaunchContext;
  safetyChecksPassed: boolean;
  safetyChecksJson: ToolLaunchSafetyChecks | null;
  ipAddress: string | null;
  userAgent: string | null;
  sessionId: string | null;
  createdAt: Date;
}

/**
 * Launch context enum
 */
export const ToolLaunchContext = {
  CLASSROOM: 'CLASSROOM',
  HOMEWORK: 'HOMEWORK',
  ASSESSMENT: 'ASSESSMENT',
  REVIEW: 'REVIEW',
  ADMIN_PREVIEW: 'ADMIN_PREVIEW',
} as const;
export type ToolLaunchContext = typeof ToolLaunchContext[keyof typeof ToolLaunchContext];

/**
 * Safety checks performed at tool launch
 */
export interface ToolLaunchSafetyChecks {
  installationActive: boolean;
  installationApproved: boolean;
  safetyRatingAcceptable: boolean;
  domainAllowlisted: boolean;
  scopesAllowed: boolean;
  tenantPolicyPassed: boolean;
  disallowedScopes?: string[];
  policyViolations?: string[];
}

/**
 * Safety Scope Allowlist - Global scope permission rules
 */
export interface SafetyScopeAllowlist {
  id: string;
  scopeName: string;
  displayName: string;
  description: string | null;
  isAllowed: boolean;
  requiresElevatedReview: boolean;
  minSafetyRating: SafetyRating | null;
  createdAt: Date;
  updatedAt: Date;
}

// ══════════════════════════════════════════════════════════════════════════════
// SAFETY DTOs & API TYPES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Safety review submission request
 */
export interface SubmitSafetyReviewRequest {
  marketplaceItemVersionId: string;
  dataCategoriesAccessed: string[];
  dataUsagePurposes: string[];
  policyTagsAssigned: string[];
  diagnosticUseConfirmed: boolean;
  safetyRatingAssigned: SafetyRating;
  dataAccessProfileAssigned: DataAccessProfile;
  reviewNotes?: string;
  internalNotes?: string;
}

/**
 * Safety review escalation request
 */
export interface EscalateSafetyReviewRequest {
  reviewId: string;
  escalateToUserId: string;
  reason: string;
}

/**
 * Tenant policy update request
 */
export interface UpdateTenantPolicyRequest {
  allowedSafetyRatings?: SafetyRating[];
  allowedDataAccessProfiles?: DataAccessProfile[];
  blockedVendorIds?: string[];
  blockedItemIds?: string[];
  blockedPolicyTags?: string[];
  requireSafetyReview?: boolean;
  allowGracePeriodDays?: number;
  customRulesJson?: TenantPolicyCustomRules;
}

/**
 * Domain allowlist management request
 */
export interface ManageDomainAllowlistRequest {
  vendorId: string;
  domain: string;
  action: 'ADD' | 'REMOVE' | 'VERIFY';
  notes?: string;
}

/**
 * Safety details response for transparency UI
 */
export interface SafetyDetailsResponse {
  versionId: string;
  itemTitle: string;
  vendorName: string;
  safetyRating: SafetyRating;
  dataAccessProfile: DataAccessProfile;
  safetyNotes: string | null;
  policyTags: string[];
  dataCategoriesAccessed: string[];
  lastReviewedAt: Date | null;
  lastReviewedBy: string | null;
  automatedChecksPassed: boolean | null;
  /** Human-readable explanations */
  explanations: {
    safetyRating: string;
    dataAccessProfile: string;
    policyTags: Record<string, string>;
    dataCategories: Record<string, string>;
  };
}

/**
 * Catalog search with safety filtering
 */
export interface SafeCatalogSearchParams extends CatalogSearchParams {
  /** Filter by safety ratings (applied in addition to tenant policy) */
  safetyRatings?: SafetyRating[];
  /** Filter by data access profiles */
  dataAccessProfiles?: DataAccessProfile[];
  /** Exclude items with these policy tags */
  excludePolicyTags?: string[];
  /** Include items pending safety review (admin only) */
  includePendingSafety?: boolean;
}

/**
 * Policy violation detail
 */
export interface PolicyViolation {
  type: 'SAFETY_RATING' | 'DATA_ACCESS' | 'BLOCKED_VENDOR' | 'BLOCKED_ITEM' | 'BLOCKED_TAG' | 'SCOPE_VIOLATION';
  message: string;
  itemId?: string;
  vendorId?: string;
  actual?: string;
  allowed?: string[];
}

/**
 * Install validation result
 */
export interface InstallValidationResult {
  isAllowed: boolean;
  violations: PolicyViolation[];
  requiresApproval: boolean;
  approvalReason?: string;
}

/**
 * Tool launch validation result
 */
export interface ToolLaunchValidationResult {
  isAllowed: boolean;
  checks: ToolLaunchSafetyChecks;
  violations: PolicyViolation[];
  launchUrl?: string;
  grantedScopes?: string[];
}
