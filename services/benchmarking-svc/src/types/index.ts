/**
 * Benchmarking Service Type Definitions
 */

// District size classification
export type DistrictSize = 'SMALL' | 'MEDIUM' | 'LARGE' | 'VERY_LARGE';

// Geographic classification
export type GeographicType = 'URBAN' | 'SUBURBAN' | 'RURAL';

// Metric categories
export type MetricCategory =
  | 'ACADEMIC_PERFORMANCE'
  | 'ENGAGEMENT'
  | 'AI_EFFECTIVENESS'
  | 'OPERATIONAL';

// Participation status
export type ParticipationStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'WITHDRAWN';

// Report status
export type ReportStatus = 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';

// Insight types
export type InsightType = 'strength' | 'opportunity' | 'trend' | 'recommendation';

/**
 * Enrollment request for a district
 */
export interface EnrollmentRequest {
  tenantId: string;
  districtName: string;
  size: DistrictSize;
  geographicType: GeographicType;
  studentCount: number;
  freeReducedLunchPct?: number;
  state: string;
  gradeLevelsServed: string[];
  consentedBy: string;
  sharingPreferences?: SharingPreferences;
}

/**
 * Data sharing preferences
 */
export interface SharingPreferences {
  shareAcademicData: boolean;
  shareEngagementData: boolean;
  shareAiEffectiveness: boolean;
  shareOperationalData: boolean;
  allowPeerContact: boolean;
}

/**
 * Participant profile
 */
export interface ParticipantProfile {
  id: string;
  tenantId: string;
  districtName: string;
  status: ParticipationStatus;
  size: DistrictSize;
  geographicType: GeographicType;
  studentCount: number;
  freeReducedLunchPct?: number;
  state: string;
  gradeLevelsServed: string[];
  sharingPreferences: SharingPreferences;
  enrolledAt: Date;
  cohorts: CohortSummary[];
}

/**
 * Cohort summary
 */
export interface CohortSummary {
  id: string;
  name: string;
  memberCount: number;
}

/**
 * Metric submission
 */
export interface MetricSubmission {
  category: MetricCategory;
  metricKey: string;
  metricValue: number;
  periodStart: Date;
  periodEnd: Date;
  periodType: 'monthly' | 'quarterly' | 'yearly';
  sampleSize: number;
  confidenceLevel?: number;
}

/**
 * Benchmark comparison result
 */
export interface BenchmarkComparison {
  metricKey: string;
  metricName: string;
  category: MetricCategory;
  districtValue: number;
  cohortStats: CohortStatistics;
  percentileRank: number;
  trend?: TrendData;
}

/**
 * Cohort statistics
 */
export interface CohortStatistics {
  cohortId: string;
  cohortName: string;
  mean: number;
  median: number;
  stdDev: number;
  p25: number;
  p75: number;
  p90: number;
  min: number;
  max: number;
  sampleCount: number;
}

/**
 * Trend data
 */
export interface TrendData {
  periods: TrendPeriod[];
  direction: 'improving' | 'stable' | 'declining';
  changePercent: number;
}

/**
 * Single trend period
 */
export interface TrendPeriod {
  periodStart: Date;
  periodEnd: Date;
  districtValue: number;
  cohortMean: number;
}

/**
 * District summary for dashboard
 */
export interface DistrictSummary {
  participant: ParticipantProfile;
  overallPercentile: number;
  categoryBreakdown: CategorySummary[];
  topStrengths: string[];
  topOpportunities: string[];
  recentInsightsCount: number;
}

/**
 * Category summary
 */
export interface CategorySummary {
  category: MetricCategory;
  metricCount: number;
  avgPercentile: number;
  bestMetric: string;
  worstMetric: string;
}

/**
 * Report request
 */
export interface ReportRequest {
  title: string;
  reportType: 'quarterly_review' | 'annual_benchmark' | 'custom';
  cohortIds: string[];
  metricCategories: MetricCategory[];
  periodStart: Date;
  periodEnd: Date;
  createdBy: string;
}

/**
 * Report result
 */
export interface ReportResult {
  id: string;
  title: string;
  reportType: string;
  status: ReportStatus;
  periodStart: Date;
  periodEnd: Date;
  comparisons: BenchmarkComparison[];
  insights: Insight[];
  generatedAt?: Date;
  expiresAt?: Date;
}

/**
 * AI-generated insight
 */
export interface Insight {
  id: string;
  category: MetricCategory;
  insightType: InsightType;
  title: string;
  description: string;
  metricKey?: string;
  currentValue?: number;
  peerAverage?: number;
  percentile?: number;
  recommendation?: string;
  priority: number;
}

/**
 * Peer matching criteria
 */
export interface PeerMatchingCriteria {
  sizeRange?: DistrictSize[];
  geographicTypes?: GeographicType[];
  states?: string[];
  frlPctRange?: { min: number; max: number };
  gradeLevels?: string[];
  minPeers?: number;
}

/**
 * Anonymization configuration
 */
export interface AnonymizationConfig {
  minCohortSize: number;
  differentialPrivacyEpsilon: number;
  suppressBelowThreshold: boolean;
}

/**
 * Metric definition
 */
export interface MetricDefinition {
  key: string;
  name: string;
  description: string;
  category: MetricCategory;
  unit: string;
  minValue?: number;
  maxValue?: number;
  higherIsBetter: boolean;
  formula?: string;
  dataSource: string;
}

/**
 * Bulk metric submission result
 */
export interface BulkSubmissionResult {
  submitted: number;
  failed: number;
  errors: {
    metricKey: string;
    error: string;
  }[];
}
