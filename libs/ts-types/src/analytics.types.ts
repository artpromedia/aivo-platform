/**
 * Analytics Types for Frontend Applications
 *
 * Shared types for analytics and progress tracking features including:
 * - Learner Progress Summary
 * - Subject Progress
 * - Activity Events
 * - Goals Tracking
 * - Engagement Metrics
 * - Weekly/Monthly Reports
 */

// ============================================================================
// Date Range Types
// ============================================================================

export interface DateRange {
  from: Date | string;
  to: Date | string;
}

export type TimePeriod = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

// ============================================================================
// Trend Types
// ============================================================================

export type ProgressTrend = 'improving' | 'steady' | 'declining';

export type PeerComparison = 'above' | 'average' | 'below';

export type TrendDirection = 'up' | 'down' | 'stable';

// ============================================================================
// Learner Progress Summary Types
// ============================================================================

export interface LearnerProgressSummary {
  learnerId: string;
  period: DateRange;

  // Time metrics
  totalLearningTime: number; // minutes
  averageDailyTime: number; // minutes
  longestStreak: number; // days
  currentStreak: number; // days

  // Completion metrics
  lessonsCompleted: number;
  lessonsAttempted: number;
  assessmentsPassed: number;
  assessmentsFailed: number;

  // Subject breakdown
  subjectProgress: SubjectProgressDetail[];

  // Skill mastery
  skillsAcquired: AcquiredSkill[];
  skillsInProgress: SkillProgressItem[];

  // Engagement
  engagementScore: number; // 0-100
  focusScore: number; // 0-100

  // Trends
  progressTrend: ProgressTrend;
  comparisonToPeers?: PeerComparison;

  // Metadata
  generatedAt: string;
  dataQuality?: 'complete' | 'partial' | 'estimated';
}

export interface SubjectProgressDetail {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  currentLevel: number;
  targetLevel: number;
  completionPercentage: number;
  masteryScore: number; // 0-100
  lessonsCompleted: number;
  totalLessons: number;
  recentActivity: string; // ISO date
  trend: ProgressTrend;
  colorHex?: string;
}

export interface AcquiredSkill {
  skillId: string;
  skillCode: string;
  skillName: string;
  masteryLevel: number; // 1-5
  acquiredAt: string; // ISO date
  subjectId?: string;
}

export interface SkillProgressItem {
  skillId: string;
  skillCode: string;
  skillName: string;
  currentLevel: number;
  targetLevel: number;
  progressPercent: number;
  estimatedCompletionDate?: string;
  subjectId?: string;
}

// ============================================================================
// Activity Event Types
// ============================================================================

export type ActivityEventType =
  | 'lesson'
  | 'assessment'
  | 'practice'
  | 'game'
  | 'break'
  | 'reading'
  | 'writing'
  | 'homework'
  | 'video'
  | 'achievement';

export type ActivityResult = 'completed' | 'partial' | 'abandoned' | 'in_progress';

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  timestamp: string; // ISO date
  duration: number; // seconds
  subject?: string;
  subjectCode?: string;
  title: string;
  description?: string;
  result?: ActivityResult;
  score?: number; // 0-100
  xpEarned?: number;
  metadata?: Record<string, unknown>;
}

export interface ActivityTimeline {
  events: ActivityEvent[];
  totalCount: number;
  hasMore: boolean;
  nextCursor?: string;
  filters?: ActivityTimelineFilters;
}

export interface ActivityTimelineFilters {
  types?: ActivityEventType[];
  subjects?: string[];
  dateRange?: DateRange;
  minScore?: number;
  result?: ActivityResult;
}

// ============================================================================
// Daily/Weekly Stats Types
// ============================================================================

export interface DailyStat {
  date: string; // YYYY-MM-DD
  day?: string; // Mon, Tue, etc.
  minutes: number;
  xp: number;
  lessonsCompleted?: number;
  assessmentsCompleted?: number;
}

export interface WeeklyStat {
  weekStart: string; // ISO date
  weekEnd: string; // ISO date
  totalMinutes: number;
  totalXp: number;
  lessonsCompleted: number;
  assessmentsCompleted: number;
  averageDailyMinutes: number;
  daysActive: number;
}

export interface WeeklySummary {
  studentId: string;
  weekStart: string;
  weekEnd: string;

  // Highlights
  highlights: string[];

  // Lessons
  lessonsCompleted: LessonCompletion[];

  // Achievements
  achievements: AchievementUnlock[];

  // Stats
  totalTimeMinutes: number;
  totalXp: number;
  sessionsCount: number;

  // Subject breakdown
  subjectBreakdown: SubjectTimeBreakdown[];

  // Comparison
  comparedToLastWeek?: WeeklyComparison;
}

export interface LessonCompletion {
  id: string;
  title: string;
  subject: string;
  subjectCode?: string;
  score: number;
  completedAt: string;
  duration?: number;
}

export interface AchievementUnlock {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
  unlockedAt: string;
  xpReward?: number;
}

export interface SubjectTimeBreakdown {
  subjectCode: string;
  subjectName: string;
  minutes: number;
  percentage: number;
  lessonsCompleted: number;
  colorHex?: string;
}

export interface WeeklyComparison {
  timeChange: number; // percentage
  xpChange: number; // percentage
  lessonsChange: number; // count difference
  trend: TrendDirection;
}

// ============================================================================
// Goals Types
// ============================================================================

export type GoalStatus = 'active' | 'completed' | 'expired' | 'paused';

export type GoalType = 'daily' | 'weekly' | 'monthly' | 'custom';

export type GoalCategory =
  | 'time'
  | 'lessons'
  | 'xp'
  | 'streak'
  | 'mastery'
  | 'subject'
  | 'skill';

export interface LearnerGoal {
  id: string;
  learnerId: string;
  title: string;
  description?: string;
  type: GoalType;
  category: GoalCategory;
  status: GoalStatus;

  // Progress
  currentValue: number;
  targetValue: number;
  progressPercent: number;

  // Dates
  startDate: string;
  endDate: string;
  completedAt?: string;

  // Rewards
  xpReward?: number;
  coinReward?: number;
  badgeId?: string;

  // Metadata
  subjectId?: string;
  skillId?: string;
  createdBy: 'system' | 'teacher' | 'parent' | 'learner';
}

export interface GoalsData {
  activeGoals: LearnerGoal[];
  completedGoals: LearnerGoal[];
  upcomingGoals?: LearnerGoal[];
  streakGoal?: StreakGoal;
}

export interface StreakGoal {
  currentStreak: number;
  longestStreak: number;
  todayCompleted: boolean;
  streakGoalDays: number;
  streakGoalProgress: number;
}

// ============================================================================
// Engagement Metrics Types
// ============================================================================

export interface LearnerEngagementMetrics {
  learnerId: string;
  period: DateRange;

  // Session metrics
  totalSessions: number;
  averageSessionDuration: number; // minutes
  longestSession: number; // minutes

  // Activity metrics
  contentViewed: number;
  contentCompleted: number;
  videosWatched: number;
  assessmentsStarted: number;
  assessmentsCompleted: number;
  questionsAnswered: number;
  questionsCorrect: number;

  // Interaction metrics
  interactionsPerSession: number;
  focusTimePercent: number;
  breaksTaken: number;

  // Scores
  engagementScore: number; // 0-100
  focusScore: number; // 0-100
  consistencyScore: number; // 0-100

  // Patterns
  peakActivityTime?: string; // HH:MM format
  preferredSubjects?: string[];
  averageAccuracy?: number;
}

// ============================================================================
// Progress Report Types
// ============================================================================

export interface ProgressReport {
  studentId: string;
  generatedAt: string;
  period: DateRange;

  // Summary
  summary: ProgressReportSummary;

  // Details
  subjectReports: SubjectReport[];
  activityTimeline: ActivityEvent[];
  goals: GoalsData;
  engagement: LearnerEngagementMetrics;

  // Insights
  strengths: string[];
  areasForGrowth: string[];
  recommendations: string[];

  // Metadata
  reportType: 'weekly' | 'monthly' | 'quarterly' | 'custom';
  exportable: boolean;
}

export interface ProgressReportSummary {
  totalTimeMinutes: number;
  totalXp: number;
  lessonsCompleted: number;
  assessmentsPassed: number;
  skillsAcquired: number;
  currentStreak: number;
  overallTrend: ProgressTrend;
  peerComparison?: PeerComparison;
}

export interface SubjectReport {
  subjectId: string;
  subjectCode: string;
  subjectName: string;

  // Progress
  startingMastery: number;
  currentMastery: number;
  masteryGain: number;
  lessonsCompleted: number;
  assessmentsPassed: number;

  // Time
  timeSpentMinutes: number;
  timePercentage: number;

  // Skills
  skillsMastered: string[];
  skillsInProgress: string[];

  // Trends
  trend: ProgressTrend;
  weeklyProgress: WeeklyProgressPoint[];
}

export interface WeeklyProgressPoint {
  weekStart: string;
  mastery: number;
  lessonsCompleted: number;
  timeMinutes: number;
}

// ============================================================================
// Cache Configuration Types
// ============================================================================

export interface AnalyticsCacheConfig {
  progress: {
    ttlSeconds: number; // 300 = 5 minutes
    keyBy: 'learnerId' | 'period';
  };
  activity: {
    ttlSeconds: number; // 60 = 1 minute
    keyBy: 'cursor';
  };
  goals: {
    ttlSeconds: number; // 300 = 5 minutes
    keyBy: 'learnerId';
  };
  engagement: {
    ttlSeconds: number; // 600 = 10 minutes
    keyBy: 'period';
  };
}

export const DEFAULT_ANALYTICS_CACHE_CONFIG: AnalyticsCacheConfig = {
  progress: { ttlSeconds: 300, keyBy: 'learnerId' },
  activity: { ttlSeconds: 60, keyBy: 'cursor' },
  goals: { ttlSeconds: 300, keyBy: 'learnerId' },
  engagement: { ttlSeconds: 600, keyBy: 'period' },
};

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface GetProgressSummaryRequest {
  learnerId: string;
  period?: DateRange;
  includeSkills?: boolean;
  includeEngagement?: boolean;
}

export interface GetActivityTimelineRequest {
  learnerId: string;
  filters?: ActivityTimelineFilters;
  limit?: number;
  cursor?: string;
}

export interface GetGoalsRequest {
  learnerId: string;
  status?: GoalStatus[];
  type?: GoalType[];
  includeCompleted?: boolean;
}

export interface GetWeeklySummaryRequest {
  studentId: string;
  weekStart?: string;
  includeComparison?: boolean;
}

export interface GetProgressReportRequest {
  studentId: string;
  period: DateRange;
  reportType?: 'weekly' | 'monthly' | 'quarterly' | 'custom';
  sections?: ('summary' | 'subjects' | 'activities' | 'goals' | 'engagement')[];
}
