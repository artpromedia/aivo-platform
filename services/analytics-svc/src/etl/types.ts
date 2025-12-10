/**
 * ETL Types
 *
 * Type definitions for the analytics ETL pipeline.
 */

// ══════════════════════════════════════════════════════════════════════════════
// JOB METADATA
// ══════════════════════════════════════════════════════════════════════════════

export type JobName =
  | 'sync_dim_tenant'
  | 'sync_dim_learner'
  | 'sync_dim_user'
  | 'sync_dim_subject'
  | 'sync_dim_skill'
  | 'build_fact_sessions'
  | 'build_fact_focus_events'
  | 'build_fact_homework_events'
  | 'build_fact_learning_progress'
  | 'build_fact_recommendation_events';

export type JobStatus = 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';

export interface JobRunRecord {
  id: string;
  jobName: JobName;
  runDate: Date;
  targetDate: Date | null;
  status: JobStatus;
  rowsProcessed: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsDeleted: number;
  durationMs: number;
  errorMessage: string | null;
  startedAt: Date;
  completedAt: Date | null;
}

export interface JobResult {
  jobName: JobName;
  status: JobStatus;
  rowsProcessed: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsDeleted: number;
  durationMs: number;
  errorMessage?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// DIMENSION TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface DimTenant {
  tenantKey: number;
  tenantId: string;
  tenantName: string;
  tenantType: string;
  districtId: string | null;
  state: string | null;
  country: string;
  timezone: string;
  isActive: boolean;
  createdAt: Date;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  isCurrent: boolean;
}

export interface DimLearner {
  learnerKey: number;
  learnerId: string;
  tenantId: string;
  gradeBand: string;
  gradeLevel: number | null;
  isActive: boolean;
  createdAt: Date;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  isCurrent: boolean;
}

export interface DimUser {
  userKey: number;
  userId: string;
  tenantId: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  isCurrent: boolean;
}

export interface DimSubject {
  subjectKey: number;
  subjectCode: string;
  subjectName: string;
  description: string | null;
}

export interface DimSkill {
  skillKey: number;
  skillId: string;
  subjectKey: number;
  skillCode: string;
  skillName: string;
  description: string | null;
  gradeBand: string | null;
  parentSkillId: string | null;
  depth: number;
}

export interface DimDate {
  dateKey: number;
  fullDate: Date;
  year: number;
  quarter: number;
  month: number;
  week: number;
  dayOfYear: number;
  dayOfMonth: number;
  dayOfWeek: number;
  dayName: string;
  monthName: string;
  isWeekend: boolean;
  isSchoolDay: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// FACT TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface FactSession {
  sessionKey: number;
  sessionId: string;
  dateKey: number;
  tenantKey: number;
  learnerKey: number;
  sessionType: string;
  origin: string;
  durationSeconds: number;
  activitiesAssigned: number;
  activitiesCompleted: number;
  activitiesSkipped: number;
  correctResponses: number;
  incorrectResponses: number;
  hintsUsed: number;
  focusBreaksCount: number;
  focusInterventionsCount: number;
  startedAt: Date;
  endedAt: Date | null;
}

export interface FactFocusEvent {
  focusEventKey: number;
  sessionKey: number;
  dateKey: number;
  tenantKey: number;
  learnerKey: number;
  eventType: string;
  eventTime: Date;
  durationSeconds: number | null;
  interventionType: string | null;
  interventionCompleted: boolean | null;
  focusScore: number | null;
}

export interface FactHomeworkEvent {
  homeworkEventKey: number;
  submissionId: string;
  sessionKey: number | null;
  dateKey: number;
  tenantKey: number;
  learnerKey: number;
  subject: string;
  gradeBand: string;
  stepCount: number;
  stepsCompleted: number;
  hintsRevealed: number;
  correctResponses: number;
  totalResponses: number;
  completionRate: number;
  submittedAt: Date;
  completedAt: Date | null;
}

export interface FactLearningProgress {
  progressKey: number;
  dateKey: number;
  tenantKey: number;
  learnerKey: number;
  subjectKey: number;
  totalSkills: number;
  masteredSkills: number;
  inProgressSkills: number;
  notStartedSkills: number;
  averageMastery: number;
  skillsGainedToday: number;
  practiceMinutesToday: number;
  snapshotAt: Date;
}

export interface FactRecommendationEvent {
  recommendationEventKey: number;
  recommendationId: string;
  dateKey: number;
  tenantKey: number;
  learnerKey: number;
  skillKey: number | null;
  recommendationType: string;
  source: string;
  wasAccepted: boolean | null;
  wasDeclined: boolean | null;
  responseTimeSeconds: number | null;
  createdAt: Date;
  respondedAt: Date | null;
}

// ══════════════════════════════════════════════════════════════════════════════
// ETL OPTIONS
// ══════════════════════════════════════════════════════════════════════════════

export interface ETLOptions {
  /** Target date for fact tables (defaults to yesterday) */
  targetDate?: Date;
  /** Whether to force re-run even if already processed */
  force?: boolean;
  /** Dry run mode - log but don't commit */
  dryRun?: boolean;
  /** Specific tenant to process (null = all) */
  tenantId?: string | null;
  /** Batch size for inserts */
  batchSize?: number;
}

export interface ETLContext {
  options: ETLOptions;
  targetDate: Date;
  targetDateKey: number;
  startTime: Date;
  logger: ETLLogger;
}

export interface ETLLogger {
  info: (message: string, data?: Record<string, unknown>) => void;
  warn: (message: string, data?: Record<string, unknown>) => void;
  error: (message: string, data?: Record<string, unknown>) => void;
  debug: (message: string, data?: Record<string, unknown>) => void;
}
