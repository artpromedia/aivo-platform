/**
 * Analytics Types for Teacher Portal
 *
 * Comprehensive types for teacher analytics dashboards,
 * early warning systems, and IEP progress tracking.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TIME & PERIOD TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Time periods for analytics queries
 */
export type TimePeriod = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

/**
 * Student risk levels for early warning system
 */
export type RiskLevel = 'on-track' | 'watch' | 'at-risk' | 'critical';

/**
 * Engagement levels based on activity patterns
 */
export type EngagementLevel = 'highly-engaged' | 'engaged' | 'passive' | 'disengaged' | 'absent';

/**
 * Trend direction for skill mastery
 */
export type MasteryTrend = 'improving' | 'stable' | 'declining';

/**
 * Priority levels for recommendations and alerts
 */
export type PriorityLevel = 'high' | 'medium' | 'low';

/**
 * Severity levels for warnings
 */
export type SeverityLevel = 'high' | 'medium' | 'low';

// ═══════════════════════════════════════════════════════════════════════════════
// TREND DATA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Direction of a trend
 */
export type TrendDirection = 'up' | 'down' | 'stable';

/**
 * Trend data for visualizing progress over time
 */
export interface TrendData {
  direction: TrendDirection;
  percentChange: number;
  dataPoints: TrendDataPoint[];
}

export interface TrendDataPoint {
  date: string;
  value: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLASS OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Class overview metrics - the at-a-glance view teachers need
 */
export interface ClassOverviewMetrics {
  classId: string;
  className: string;
  period: TimePeriod;

  // Summary stats
  totalStudents: number;
  activeStudents: number;
  averageMastery: number;
  averageEngagement: number;
  totalLearningTime: number; // minutes

  // Distribution
  masteryDistribution: MasteryDistribution;

  // Risk breakdown
  riskDistribution: RiskDistribution;

  // Trends
  masteryTrend: TrendData;
  engagementTrend: TrendData;

  // Top insights (limited to 3-5 for quick consumption)
  insights: ClassInsight[];

  // Comparison to previous period
  previousPeriodComparison: PeriodComparison;
}

export interface MasteryDistribution {
  mastered: number; // >= 90%
  proficient: number; // 70-89%
  developing: number; // 50-69%
  beginning: number; // < 50%
}

export interface RiskDistribution {
  onTrack: number;
  watch: number;
  atRisk: number;
  critical: number;
}

export interface PeriodComparison {
  masteryChange: number;
  engagementChange: number;
  timeChange: number;
}

/**
 * Class-level insights for teachers
 */
export interface ClassInsight {
  type: 'success' | 'warning' | 'info' | 'action';
  priority: number; // 1-10, higher = more urgent
  title: string;
  description: string;
  affectedStudents?: string[];
  suggestedAction?: string;
  relatedSkillId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STUDENT ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Comprehensive student analytics - deep dive into individual progress
 */
export interface StudentAnalytics {
  studentId: string;
  studentName: string;
  gradeLevel: number;

  // Overall metrics
  overallMastery: number;
  masteryTrend: TrendData;
  engagementLevel: EngagementLevel;
  riskLevel: RiskLevel;
  riskFactors: string[];

  // Time metrics
  totalLearningTime: number;
  averageSessionLength: number;
  sessionsCompleted: number;
  lastActiveDate: Date | string;
  streakDays: number;

  // Skill breakdown
  skillMastery: SkillMasteryDetail[];
  strengthAreas: string[];
  growthAreas: string[];

  // Engagement details
  engagementMetrics: EngagementMetrics;

  // IEP data (if applicable)
  iepProgress?: IEPProgressSummary;

  // Accommodations
  activeAccommodations: string[];

  // Recent activity
  recentSessions: SessionSummary[];

  // Recommendations
  recommendations: StudentRecommendation[];
}

export interface EngagementMetrics {
  averageTimeOnTask: number;
  completionRate: number;
  hintUsageRate: number;
  correctFirstAttemptRate: number;
}

/**
 * Detailed skill mastery information
 */
export interface SkillMasteryDetail {
  skillId: string;
  skillName: string;
  domain: string;
  mastery: number;
  trend: MasteryTrend;
  practiceCount: number;
  lastPracticed?: Date | string;
  estimatedTimeToMastery?: number; // minutes
}

/**
 * Session summary for recent activity
 */
export interface SessionSummary {
  sessionId: string;
  date: Date | string;
  duration: number;
  activitiesCompleted: number;
  averageScore: number;
  skillsPracticed: string[];
  engagementLevel: EngagementLevel;
}

/**
 * Actionable recommendations for teachers
 */
export interface StudentRecommendation {
  type: 'skill-focus' | 'engagement' | 'pacing' | 'intervention' | 'enrichment';
  priority: PriorityLevel;
  title: string;
  description: string;
  actionItems: string[];
  relatedSkills?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SKILL MASTERY MATRIX
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Skill mastery matrix for class-wide skill gap analysis
 */
export interface SkillMasteryMatrix {
  classId: string;
  skills: SkillInfo[];
  students: StudentSkillData[];
  classAverageBySkill: Record<string, number>;
  skillsNeedingAttention: string[]; // Skills where class average < 60%
}

export interface SkillInfo {
  skillId: string;
  skillName: string;
  domain: string;
  standardId?: string;
}

export interface StudentSkillData {
  studentId: string;
  studentName: string;
  masteryBySkill: Record<string, SkillMasteryCell>;
}

export interface SkillMasteryCell {
  mastery: number;
  trend: TrendDirection;
  attempts: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EARLY WARNING SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Early warning report for a class
 */
export interface EarlyWarningReport {
  classId: string;
  generatedAt: Date | string;

  criticalStudents: EarlyWarningStudent[];
  atRiskStudents: EarlyWarningStudent[];
  watchStudents: EarlyWarningStudent[];

  classLevelWarnings: ClassLevelWarning[];
}

export interface ClassLevelWarning {
  type: string;
  severity: SeverityLevel;
  message: string;
  affectedCount: number;
}

/**
 * Individual student early warning data
 */
export interface EarlyWarningStudent {
  studentId: string;
  studentName: string;
  riskLevel: RiskLevel;
  riskScore: number; // 0-100
  primaryRiskFactors: RiskFactor[];
  daysAtRisk: number;
  suggestedInterventions: string[];
  lastTeacherContact?: Date | string;
}

export interface RiskFactor {
  factor: string;
  severity: number;
  description: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// IEP PROGRESS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * IEP progress summary for a student
 */
export interface IEPProgressSummary {
  hasIEP: boolean;
  goals: IEPGoalProgress[];
  nextReviewDate?: Date | string;
  accommodationsActive: string[];
}

export interface IEPGoalProgress {
  goalId: string;
  description: string;
  targetDate: Date | string;
  currentProgress: number;
  targetProgress: number;
  status: IEPGoalStatus;
  lastUpdated: Date | string;
}

export type IEPGoalStatus = 'on-track' | 'at-risk' | 'behind' | 'met';

/**
 * IEP class report - overview of all IEP students in a class
 */
export interface IEPClassReport {
  classId: string;
  className: string;
  totalStudentsWithIEP: number;
  totalGoals: number;
  goalsOnTrack: number;
  goalsAtRisk: number;
  students: IEPStudentReport[];
  upcomingReviewDates: UpcomingReview[];
}

export interface IEPStudentReport {
  studentId: string;
  studentName: string;
  goals: IEPGoalDetail[];
  accommodations: AccommodationInfo[];
  overallProgress: number;
  goalsAtRisk: number;
}

export interface IEPGoalDetail {
  goalId: string;
  description: string;
  category: string;
  targetDate: Date | string;
  currentProgress: number;
  expectedProgress: number;
  status: IEPGoalStatus;
  recentProgress: ProgressEntry[];
  relatedSkill?: string;
}

export interface ProgressEntry {
  date: Date | string;
  value: number;
  notes?: string;
}

export interface AccommodationInfo {
  type: string;
  description: string;
  isActive: boolean;
}

export interface UpcomingReview {
  studentId: string;
  studentName: string;
  reviewDate: Date | string;
  daysUntil: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENGAGEMENT ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Engagement analytics for a class
 */
export interface ClassEngagementAnalytics {
  classId: string;
  period?: TimePeriod;

  // Summary metrics
  totalStudents: number;
  activeStudents: number;
  averageTimeOnTask: number;
  completionRate: number;
  averageSessionsPerWeek: number;

  // Trends
  timeOnTaskTrend?: TrendData;
  completionRateTrend?: TrendData;
  sessionsTrend?: TrendData;

  // Overall engagement score (0-100) - optional for backward compat
  overallEngagement?: number;
  engagementTrend?: TrendData;

  // Breakdown by level
  distribution: EngagementDistribution;
  engagementDistribution?: EngagementDistribution;

  // Time-based patterns
  weeklyActivity: WeeklyActivityData[];
  peakActivityTimes?: ActivityTimeSlot[];
  dailyEngagementPattern?: DailyPattern[];

  // Student-level data
  lowEngagementStudents: LowEngagementStudent[];
  studentEngagement?: StudentEngagementData[];
}

export interface WeeklyActivityData {
  day: string;
  sessions: number;
  avgDuration: number;
}

export interface LowEngagementStudent {
  studentId: string;
  studentName: string;
  engagementLevel: EngagementLevel;
  lastActiveDate: Date | string;
}

export interface EngagementDistribution {
  highlyEngaged: number;
  engaged: number;
  passive: number;
  disengaged: number;
  absent: number;
}

export interface ActivityTimeSlot {
  hour: number;
  dayOfWeek: number;
  averageActivity: number;
}

export interface DailyPattern {
  date: string;
  engagementScore: number;
  activeStudents: number;
  totalTimeMinutes: number;
}

export interface StudentEngagementData {
  studentId: string;
  studentName: string;
  engagementLevel: EngagementLevel;
  engagementScore: number;
  trend: TrendDirection;
  lastActive: Date | string;
  sessionsThisPeriod: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

export type ReportType = 'class-summary' | 'student-progress' | 'skill-mastery' | 'iep-progress';
export type ReportFormat = 'pdf' | 'csv' | 'xlsx';

export interface ReportGenerationOptions {
  studentIds?: string[];
  period?: TimePeriod;
  includeCharts?: boolean;
}

export interface GeneratedReport {
  downloadUrl: string;
  expiresAt: Date | string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPARISON ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ClassComparisonResult {
  classes: ClassComparisonData[];
  aggregated: AggregatedComparison;
}

export interface ClassComparisonData {
  classId: string;
  className: string;
  averageMastery: number;
  averageEngagement: number;
  totalStudents: number;
  activeStudents: number;
  atRiskCount: number;
}

export interface AggregatedComparison {
  totalStudents: number;
  averageMastery: number;
  averageEngagement: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// API REQUEST/RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface LogIEPProgressRequest {
  value: number;
  notes?: string;
  recordedAt: string;
}

export interface LogTeacherContactRequest {
  contactType: 'conference' | 'email' | 'phone' | 'note';
  notes: string;
  contactDate?: string;
}
