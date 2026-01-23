/**
 * Teacher Dashboard Types
 *
 * Comprehensive type definitions for the teacher dashboard analytics.
 * Designed for the 5-minute teacher check-in use case - every metric
 * is actionable and instantly understandable.
 *
 * @module dashboard.types
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Time periods for dashboard queries
 */
export type DashboardPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year';

/**
 * Performance trend directions
 */
export type TrendDirection = 'up' | 'down' | 'stable';

/**
 * Student risk levels
 */
export type RiskLevel = 'high' | 'medium' | 'low';

/**
 * IEP goal status
 */
export type IEPStatus = 'on-track' | 'at-risk' | 'exceeded';

/**
 * Activity feed item types
 */
export type ActivityType = 'submission' | 'grade' | 'message' | 'alert';

/**
 * Upcoming item types
 */
export type UpcomingType = 'deadline' | 'meeting' | 'review' | 'event';

/**
 * Priority levels
 */
export type PriorityLevel = 'high' | 'medium' | 'low';

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY OPTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Options for dashboard queries
 */
export interface DashboardQueryOptions {
  /** Teacher ID making the request */
  teacherId: string;

  /** Tenant ID for multi-tenancy */
  tenantId: string;

  /** Time period for data aggregation */
  period?: DashboardPeriod;

  /** Optional class ID filter */
  classId?: string;

  /** Maximum number of results for lists */
  limit?: number;

  /** Skip cache and fetch fresh data */
  skipCache?: boolean;
}

/**
 * At-risk students query options
 */
export interface AtRiskQueryOptions extends DashboardQueryOptions {
  /** Filter by risk level */
  riskLevel?: RiskLevel;

  /** Include intervention suggestions */
  includeInterventions?: boolean;
}

/**
 * Activity query options
 */
export interface ActivityQueryOptions extends DashboardQueryOptions {
  /** Filter by activity type */
  activityType?: ActivityType;

  /** Start timestamp for activity range */
  since?: Date;
}

/**
 * Upcoming items query options
 */
export interface UpcomingQueryOptions extends DashboardQueryOptions {
  /** Number of days ahead to look */
  daysAhead?: number;

  /** Filter by item type */
  itemType?: UpcomingType;

  /** Filter by priority */
  priority?: PriorityLevel;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE DASHBOARD TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Key statistics for dashboard header
 */
export interface DashboardStats {
  /** Total number of students across all classes */
  totalStudents: number;

  /** Average mastery percentage across all students (0-100) */
  averageMastery: number;

  /** Number of students with IEP goals */
  iepStudents: number;

  /** Number of students flagged as at-risk */
  atRiskStudents: number;
}

/**
 * Class performance summary for dashboard cards
 */
export interface ClassPerformance {
  /** Unique class identifier */
  id: string;

  /** Display name of the class (e.g., "Algebra I - Period 1") */
  name: string;

  /** Average mastery percentage (0-100) */
  mastery: number;

  /** Average engagement score (0-100) */
  engagement: number;

  /** Total number of students in class */
  students: number;

  /** Performance trend compared to previous period */
  trend: TrendDirection;

  /** Optional: Trend percentage change */
  trendPercent?: number;

  /** Optional: Number of at-risk students in this class */
  atRiskCount?: number;

  /** Optional: Number of IEP students in this class */
  iepCount?: number;
}

/**
 * At-risk student with intervention suggestions
 */
export interface AtRiskStudent {
  /** Student unique identifier */
  id: string;

  /** Student display name */
  name: string;

  /** Class the student belongs to */
  className: string;

  /** Class unique identifier */
  classId: string;

  /** Risk severity level */
  riskLevel: RiskLevel;

  /** Risk factors that triggered the alert */
  riskFactors: string[];

  /** AI-suggested interventions */
  suggestedInterventions: string[];

  /** Human-readable last activity time */
  lastActivity: string;

  /** Last activity timestamp */
  lastActivityAt: Date;

  /** Optional: Days since last activity */
  daysSinceActivity?: number;

  /** Optional: Current mastery level */
  masteryLevel?: number;

  /** Optional: Engagement score */
  engagementScore?: number;

  /** Optional: Teacher contact history */
  lastTeacherContact?: Date;
}

/**
 * IEP goal progress entry
 */
export interface IEPProgressEntry {
  /** IEP goal unique identifier */
  goalId: string;

  /** Student unique identifier */
  studentId: string;

  /** Student display name */
  studentName: string;

  /** Class unique identifier */
  classId?: string;

  /** Class display name */
  className?: string;

  /** Goal area/category */
  goalArea: string;

  /** Goal description text */
  goalDescription?: string;

  /** Current progress percentage (0-100) */
  currentProgress: number;

  /** Target progress percentage (0-100) */
  targetProgress: number;

  /** Goal status based on progress vs expected */
  status: IEPStatus;

  /** Next scheduled review date (ISO string) */
  nextReviewDate: string;

  /** Progress trend direction */
  trend?: TrendDirection;

  /** Days until review */
  daysUntilReview?: number;
}

/**
 * Activity feed item
 */
export interface ActivityItem {
  /** Activity unique identifier */
  id: string;

  /** Type of activity */
  type: ActivityType;

  /** Short title for the activity */
  title: string;

  /** Detailed description */
  description: string;

  /** When the activity occurred (ISO timestamp) */
  timestamp: string;

  /** Related student ID (if applicable) */
  studentId?: string;

  /** Related student name (if applicable) */
  studentName?: string;

  /** Related class ID (if applicable) */
  classId?: string;

  /** Related content/assignment ID (if applicable) */
  contentId?: string;

  /** Human-readable relative time (e.g., "2 hours ago") */
  relativeTime?: string;

  /** Whether this activity requires action */
  actionRequired?: boolean;
}

/**
 * Upcoming item (deadline, meeting, review, event)
 */
export interface UpcomingItem {
  /** Item unique identifier */
  id: string;

  /** Type of upcoming item */
  type: UpcomingType;

  /** Short title */
  title: string;

  /** Due/scheduled date (ISO date string) */
  date: string;

  /** Priority level */
  priority: PriorityLevel;

  /** Related student ID (for IEP reviews) */
  studentId?: string;

  /** Related student name (for IEP reviews) */
  studentName?: string;

  /** Related class ID */
  classId?: string;

  /** Days until this item */
  daysUntil?: number;

  /** Additional description */
  description?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGGREGATED TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Complete dashboard summary response
 */
export interface DashboardSummary {
  /** Key statistics for dashboard header */
  stats: DashboardStats;

  /** Performance breakdown by class */
  classPerformance: ClassPerformance[];

  /** At-risk students requiring attention */
  atRiskStudents: AtRiskStudent[];

  /** IEP goal progress entries */
  iepProgress: IEPProgressEntry[];

  /** Recent activity feed */
  recentActivity: ActivityItem[];

  /** Upcoming deadlines, meetings, and events */
  upcomingItems: UpcomingItem[];

  /** Metadata about the query */
  metadata?: DashboardMetadata;
}

/**
 * Dashboard query metadata
 */
export interface DashboardMetadata {
  /** When the data was fetched */
  fetchedAt: string;

  /** Period the data covers */
  period: DashboardPeriod;

  /** Whether data was served from cache */
  cached: boolean;

  /** Cache age in seconds (if cached) */
  cacheAge?: number;

  /** Query execution time in milliseconds */
  queryTimeMs?: number;

  /** Teacher ID that requested the data */
  teacherId: string;

  /** Tenant ID for the data */
  tenantId: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESPONSE WRAPPER TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * At-risk students response
 */
export interface AtRiskStudentsResponse {
  /** List of at-risk students */
  students: AtRiskStudent[];

  /** Total count of at-risk students */
  total: number;

  /** Breakdown by risk level */
  byRiskLevel?: {
    high: number;
    medium: number;
    low: number;
  };
}

/**
 * IEP progress response
 */
export interface IEPProgressResponse {
  /** List of IEP progress entries */
  entries: IEPProgressEntry[];

  /** Summary statistics */
  summary: {
    total: number;
    onTrack: number;
    atRisk: number;
    exceeded: number;
  };

  /** Upcoming reviews count */
  upcomingReviewsCount?: number;
}

/**
 * Activity feed response
 */
export interface ActivityResponse {
  /** List of activity items */
  items: ActivityItem[];

  /** Whether more items are available */
  hasMore: boolean;

  /** Total count of activities in period */
  totalCount?: number;
}

/**
 * Upcoming items response
 */
export interface UpcomingItemsResponse {
  /** List of upcoming items */
  items: UpcomingItem[];

  /** Grouped by type */
  byType?: {
    deadline: number;
    meeting: number;
    review: number;
    event: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Dashboard service interface for dependency injection
 */
export interface IDashboardService {
  /**
   * Get complete dashboard summary
   */
  getDashboardSummary(options: DashboardQueryOptions): Promise<DashboardSummary>;

  /**
   * Get dashboard stats only
   */
  getStats(options: DashboardQueryOptions): Promise<DashboardStats>;

  /**
   * Get class performance list
   */
  getClassPerformance(options: DashboardQueryOptions): Promise<ClassPerformance[]>;

  /**
   * Get at-risk students
   */
  getAtRiskStudents(options: AtRiskQueryOptions): Promise<AtRiskStudentsResponse>;

  /**
   * Get IEP progress entries
   */
  getIEPProgress(options: DashboardQueryOptions): Promise<IEPProgressResponse>;

  /**
   * Get recent activity feed
   */
  getRecentActivity(options: ActivityQueryOptions): Promise<ActivityResponse>;

  /**
   * Get upcoming items
   */
  getUpcomingItems(options: UpcomingQueryOptions): Promise<UpcomingItemsResponse>;

  /**
   * Invalidate dashboard cache for a teacher
   */
  invalidateCache(teacherId: string, tenantId: string): Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL TYPES (for repository layer)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Raw database result for class metrics
 */
export interface RawClassMetrics {
  classId: string;
  className: string;
  totalStudents: number;
  avgMastery: number;
  avgEngagement: number;
  atRiskCount: number;
  iepCount: number;
  prevAvgMastery?: number;
}

/**
 * Raw database result for student risk assessment
 */
export interface RawStudentRisk {
  learnerId: string;
  learnerName: string;
  classId: string;
  className: string;
  riskLevel: string;
  riskScore: number;
  riskFactors: string[];
  lastActivityAt: Date | null;
  engagementScore: number;
  masteryLevel: number;
}

/**
 * Raw database result for IEP goals
 */
export interface RawIEPGoal {
  id: string;
  learnerId: string;
  learnerName: string;
  classId: string | null;
  className: string | null;
  description: string;
  category: string;
  status: string;
  currentProgress: number;
  expectedProgress: number;
  targetDate: Date;
  nextReviewDate?: Date;
}

/**
 * Period date range for queries
 */
export interface PeriodDateRange {
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CACHE KEY HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Cache key configuration
 */
export interface CacheConfig {
  /** Cache key prefix */
  prefix: string;

  /** Time-to-live in seconds */
  ttlSeconds: number;
}

/**
 * Cache TTL configurations for different data types
 */
export const DASHBOARD_CACHE_CONFIG = {
  summary: { prefix: 'dashboard:summary', ttlSeconds: 300 }, // 5 minutes
  stats: { prefix: 'dashboard:stats', ttlSeconds: 300 }, // 5 minutes
  classPerformance: { prefix: 'dashboard:classes', ttlSeconds: 300 }, // 5 minutes
  atRiskStudents: { prefix: 'dashboard:at-risk', ttlSeconds: 60 }, // 1 minute
  iepProgress: { prefix: 'dashboard:iep', ttlSeconds: 300 }, // 5 minutes
  activity: { prefix: 'dashboard:activity', ttlSeconds: 60 }, // 1 minute
  upcoming: { prefix: 'dashboard:upcoming', ttlSeconds: 900 }, // 15 minutes
  aiInsights: { prefix: 'dashboard:ai-insights', ttlSeconds: 900 }, // 15 minutes
} as const;

/**
 * Build a cache key from components
 */
export function buildCacheKey(
  config: CacheConfig,
  teacherId: string,
  tenantId: string,
  period?: DashboardPeriod,
  additionalKey?: string
): string {
  const parts = [config.prefix, tenantId, teacherId];
  if (period) parts.push(period);
  if (additionalKey) parts.push(additionalKey);
  return parts.join(':');
}
