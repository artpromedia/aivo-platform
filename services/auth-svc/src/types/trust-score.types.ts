/**
 * Trust Score Types
 *
 * Type definitions for the cross-product trust score system
 */

import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

export const TrustTier = {
  EMERGING: 'EMERGING',
  ESTABLISHED: 'ESTABLISHED',
  TRUSTED: 'TRUSTED',
  HIGHLY_TRUSTED: 'HIGHLY_TRUSTED',
  ELITE: 'ELITE',
} as const;
export type TrustTier = (typeof TrustTier)[keyof typeof TrustTier];

export const TrustTrend = {
  RISING: 'RISING',
  STABLE: 'STABLE',
  DECLINING: 'DECLINING',
} as const;
export type TrustTrend = (typeof TrustTrend)[keyof typeof TrustTrend];

export const ComplianceEventType = {
  DATA_TRANSFER_ATTEMPT: 'DATA_TRANSFER_ATTEMPT',
  UNAUTHORIZED_APP: 'UNAUTHORIZED_APP',
  POLICY_VIOLATION: 'POLICY_VIOLATION',
  SESSION_ANOMALY: 'SESSION_ANOMALY',
  SCREENSHOT_ATTEMPT: 'SCREENSHOT_ATTEMPT',
  SCREEN_SHARE_ATTEMPT: 'SCREEN_SHARE_ATTEMPT',
} as const;
export type ComplianceEventType = (typeof ComplianceEventType)[keyof typeof ComplianceEventType];

export const ComplianceSeverity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;
export type ComplianceSeverity = (typeof ComplianceSeverity)[keyof typeof ComplianceSeverity];

export const ThresholdContextType = {
  JOB: 'JOB',
  TENANT: 'TENANT',
  POD_TEMPLATE: 'POD_TEMPLATE',
  GLOBAL: 'GLOBAL',
} as const;
export type ThresholdContextType = (typeof ThresholdContextType)[keyof typeof ThresholdContextType];

export const VerificationLevel = {
  NONE: 'NONE',
  EMAIL: 'EMAIL',
  BASIC: 'BASIC',
  ENHANCED: 'ENHANCED',
  PREMIUM: 'PREMIUM',
} as const;
export type VerificationLevel = (typeof VerificationLevel)[keyof typeof VerificationLevel];

// ============================================================================
// Component Score Weights
// ============================================================================

export interface TrustScoreWeights {
  review: number;
  compliance: number;
  verification: number;
  tenure: number;
  activity: number;
}

export const DEFAULT_WEIGHTS: TrustScoreWeights = {
  review: 40,
  compliance: 25,
  verification: 20,
  tenure: 10,
  activity: 5,
};

// ============================================================================
// Data Collection Types (inputs to calculation)
// ============================================================================

export interface ReviewData {
  averageRating: number;
  totalReviews: number;
  ratingStdDev: number | null;
  recentTotalReviews: number; // Last 90 days
  recentPositiveReviews: number; // Rating >= 4
  recentNegativeReviews: number; // Rating <= 2
  completedJobs: number;
}

export interface ComplianceViolation {
  id: string;
  eventType: ComplianceEventType;
  severity: ComplianceSeverity;
  isResolved: boolean;
  createdAt: Date;
  scoreImpact: number;
}

export interface ComplianceData {
  totalSessions: number;
  violationSessions: number;
  violations: ComplianceViolation[];
  lastViolationAt: Date | null;
}

export interface VerificationData {
  emailVerified: boolean;
  verificationLevel: VerificationLevel;
  mfaEnabled: boolean;
  oauthLinked: boolean;
  profileCompleteness: number; // 0-100
}

export interface TenureData {
  accountAgeMonths: number;
  accountCreatedAt: Date;
  longestInactivePeriodDays: number;
  isActiveLastMonth: boolean;
}

export interface ActivityData {
  loginsLast30Days: number;
  lastLoginAt: Date | null;
  messageResponseRate: number; // 0-100
  avgResponseTimeHours: number;
  daysSinceProfileUpdate: number;
  jobsCompletedLast90Days: number;
}

// ============================================================================
// Score Factor Types (explanations)
// ============================================================================

export type FactorImpact = 'low' | 'medium' | 'high';
export type FactorCategory = 'reviews' | 'compliance' | 'verification' | 'security' | 'tenure' | 'activity';

export interface PositiveFactor {
  category: FactorCategory;
  factor: string;
  description: string;
  impact: FactorImpact;
}

export interface NegativeFactor {
  category: FactorCategory;
  factor: string;
  description: string;
  impact: FactorImpact;
}

export interface SuggestionFactor {
  category: FactorCategory;
  suggestion: string;
  description: string;
  potentialImpact: string;
}

export interface TrustScoreFactors {
  positive: PositiveFactor[];
  negative: NegativeFactor[];
  suggestions: SuggestionFactor[];
}

// ============================================================================
// Calculation Result Types
// ============================================================================

export interface TrustScoreResult {
  overallScore: number;
  reviewScore: number;
  complianceScore: number;
  verificationScore: number;
  tenureScore: number;
  activityScore: number;
  tier: TrustTier;
  factors: TrustScoreFactors;
  calculationVersion: number;
}

export interface ComponentScore {
  score: number;
  weight: number;
  contribution: number;
}

export interface TrustScoreComponents {
  reviews: ComponentScore;
  compliance: ComponentScore;
  verification: ComponentScore;
  tenure: ComponentScore;
  activity: ComponentScore;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface TrustScoreBadge {
  name: string;
  icon: string;
  description: string;
  earnedAt: string;
}

export interface TrustScoreHistoryPoint {
  date: string;
  score: number;
  tier: TrustTier;
}

export interface TrustScoreResponse {
  trustScore: {
    overallScore: number;
    tier: TrustTier;
    tierDescription: string;
    trend: TrustTrend;
    scoreChange: number | null;
    components: TrustScoreComponents;
    factors: TrustScoreFactors;
    lastCalculatedAt: string;
  };
  badges: TrustScoreBadge[];
  history: TrustScoreHistoryPoint[];
}

export interface ComponentBreakdown {
  component: string;
  score: number;
  maxScore: number;
  weight: string;
  details: Record<string, unknown>;
  howToImprove: string;
}

export interface NextTierInfo {
  name: TrustTier;
  requiredScore: number;
  pointsNeeded: number;
  topSuggestion: string | null;
}

export interface TrustScoreExplanationResponse {
  overallScore: number;
  tier: TrustTier;
  tierDescription: string;
  breakdown: ComponentBreakdown[];
  nextTier: NextTierInfo | null;
}

// ============================================================================
// Threshold Types
// ============================================================================

export interface TrustThresholdRequirements {
  minimumScore: number;
  minimumTier?: TrustTier;
  requireVerification: boolean;
  minimumVerificationLevel?: VerificationLevel;
  requireMfa: boolean;
  minimumReviews?: number;
  minimumCompletedJobs?: number;
}

export interface ThresholdCheckResult {
  meetsRequirements: boolean;
  failures: ThresholdFailure[];
  warnings: ThresholdWarning[];
}

export interface ThresholdFailure {
  requirement: string;
  required: string | number;
  actual: string | number;
  message: string;
}

export interface ThresholdWarning {
  requirement: string;
  message: string;
}

// ============================================================================
// Event Types (for recalculation triggers)
// ============================================================================

export const TrustScoreTriggerEvent = {
  REVIEW_RECEIVED: 'REVIEW_RECEIVED',
  REVIEW_UPDATED: 'REVIEW_UPDATED',
  JOB_COMPLETED: 'JOB_COMPLETED',
  COMPLIANCE_VIOLATION: 'COMPLIANCE_VIOLATION',
  COMPLIANCE_RESOLVED: 'COMPLIANCE_RESOLVED',
  VERIFICATION_COMPLETED: 'VERIFICATION_COMPLETED',
  MFA_ENABLED: 'MFA_ENABLED',
  MFA_DISABLED: 'MFA_DISABLED',
  PROFILE_UPDATED: 'PROFILE_UPDATED',
  SCHEDULED_RECALCULATION: 'SCHEDULED_RECALCULATION',
  MANUAL_RECALCULATION: 'MANUAL_RECALCULATION',
  ACCOUNT_ANNIVERSARY: 'ACCOUNT_ANNIVERSARY',
} as const;
export type TrustScoreTriggerEvent = (typeof TrustScoreTriggerEvent)[keyof typeof TrustScoreTriggerEvent];

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const CreateComplianceRecordSchema = z.object({
  userId: z.string().uuid(),
  sessionId: z.string().uuid(),
  eventType: z.nativeEnum(ComplianceEventType),
  severity: z.nativeEnum(ComplianceSeverity),
  description: z.string().min(1).max(1000),
  metadata: z.record(z.unknown()).optional().default({}),
  scoreImpact: z.number().int().max(0), // Must be negative or zero
});

export const ResolveComplianceRecordSchema = z.object({
  resolvedBy: z.string().uuid(),
  resolutionNotes: z.string().min(1).max(2000),
});

export const CreateThresholdSchema = z.object({
  contextType: z.nativeEnum(ThresholdContextType),
  contextId: z.string().uuid().optional(),
  minimumScore: z.number().int().min(0).max(100),
  minimumTier: z.nativeEnum(TrustTier).optional(),
  requireVerification: z.boolean().default(false),
  minimumVerificationLevel: z.nativeEnum(VerificationLevel).optional(),
  requireMfa: z.boolean().default(false),
  minimumReviews: z.number().int().min(0).optional(),
  minimumCompletedJobs: z.number().int().min(0).optional(),
  name: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
});

export const UpdateThresholdSchema = CreateThresholdSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateComplianceRecordInput = z.infer<typeof CreateComplianceRecordSchema>;
export type ResolveComplianceRecordInput = z.infer<typeof ResolveComplianceRecordSchema>;
export type CreateThresholdInput = z.infer<typeof CreateThresholdSchema>;
export type UpdateThresholdInput = z.infer<typeof UpdateThresholdSchema>;

// ============================================================================
// Database Entity Types
// ============================================================================

export interface TrustScoreEntity {
  id: string;
  userId: string;
  overallScore: number;
  reviewScore: number;
  complianceScore: number;
  verificationScore: number;
  tenureScore: number;
  activityScore: number;
  reviewWeight: number;
  complianceWeight: number;
  verificationWeight: number;
  tenureWeight: number;
  activityWeight: number;
  tier: TrustTier;
  trend: TrustTrend;
  previousScore: number | null;
  scoreChangeAmount: number | null;
  lastCalculatedAt: Date;
  calculationVersion: number;
  factors: TrustScoreFactors;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrustScoreHistoryEntity {
  id: string;
  trustScoreId: string;
  overallScore: number;
  reviewScore: number;
  complianceScore: number;
  verificationScore: number;
  tenureScore: number;
  activityScore: number;
  tier: TrustTier;
  triggerEvent: string;
  createdAt: Date;
}

export interface ComplianceRecordEntity {
  id: string;
  userId: string;
  sessionId: string;
  eventType: ComplianceEventType;
  severity: ComplianceSeverity;
  description: string;
  metadata: Record<string, unknown>;
  isResolved: boolean;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  resolutionNotes: string | null;
  scoreImpact: number;
  createdAt: Date;
}

export interface TrustThresholdEntity {
  id: string;
  contextType: ThresholdContextType;
  contextId: string | null;
  minimumScore: number;
  minimumTier: TrustTier | null;
  requireVerification: boolean;
  minimumVerificationLevel: VerificationLevel | null;
  requireMfa: boolean;
  minimumReviews: number | null;
  minimumCompletedJobs: number | null;
  name: string | null;
  description: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
