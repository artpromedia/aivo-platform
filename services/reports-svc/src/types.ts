/**
 * Type definitions for the reports service.
 */

// ══════════════════════════════════════════════════════════════════════════════
// PARENT LEARNER REPORT TYPES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Baseline summary for parent report.
 * Shows which domains have been assessed and overall readiness.
 */
export interface BaselineSummary {
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'RETEST_ALLOWED';
  completedAt: string | null;
  domains: {
    domain: string;
    assessed: boolean;
    summary: string;
  }[];
  overallSummary: string;
}

/**
 * Virtual Brain summary for parent report.
 * Strengths and focus areas in plain language.
 */
export interface VirtualBrainSummary {
  initialized: boolean;
  gradeBand: string | null;
  strengths: {
    domain: string;
    skill: string;
    description: string;
  }[];
  focusAreas: {
    domain: string;
    skill: string;
    description: string;
  }[];
  overallSummary: string;
}

/**
 * Goal summary for parent report.
 * Active goals with plain-language progress.
 */
export interface GoalSummary {
  activeGoals: {
    id: string;
    title: string;
    domain: string;
    status: string;
    progressText: string;
    startDate: string;
    targetDate: string | null;
  }[];
  completedCount: number;
  overallSummary: string;
}

/**
 * Homework summary for parent report (from analytics-svc).
 */
export interface HomeworkSummary {
  sessionsPerWeek: number;
  avgStepsPerSession: number;
  independenceScore: number;
  independenceLabel: string;
  independenceLabelText: string;
  lastSessionDate: string | null;
  totalSessions: number;
  summary: string;
}

/**
 * Focus summary for parent report (from analytics-svc).
 */
export interface FocusSummary {
  avgBreaksPerSession: number;
  avgSessionDurationMinutes: number;
  totalSessions: number;
  summary: string;
}

/**
 * Complete parent learner report.
 */
export interface ParentLearnerReport {
  learnerId: string;
  learnerName: string;
  generatedAt: string;
  reportPeriodDays: number;
  baseline: BaselineSummary;
  virtualBrain: VirtualBrainSummary;
  goals: GoalSummary;
  homework: HomeworkSummary;
  focus: FocusSummary;
}

// ══════════════════════════════════════════════════════════════════════════════
// CLASSROOM SUMMARY TYPES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Classroom baseline completion stats.
 */
export interface ClassroomBaselineStats {
  totalLearners: number;
  baselineCompleted: number;
  baselineInProgress: number;
  baselineNotStarted: number;
  completionRate: number;
}

/**
 * Classroom goal status distribution.
 */
export interface ClassroomGoalStats {
  totalGoals: number;
  statusDistribution: {
    active: number;
    completed: number;
    onHold: number;
    draft: number;
  };
  avgGoalsPerLearner: number;
}

/**
 * Classroom homework usage stats.
 */
export interface ClassroomHomeworkStats {
  learnersWithHomework: number;
  avgSessionsPerWeekPerLearner: number;
  independenceDistribution: {
    needsSupport: number;
    buildingIndependence: number;
    mostlyIndependent: number;
  };
}

/**
 * Classroom focus pattern stats.
 */
export interface ClassroomFocusStats {
  totalSessions: number;
  avgBreaksPerSession: number;
  focusLossPercentage: number;
  peakHours: number[];
}

/**
 * Learner row for classroom summary table.
 */
export interface ClassroomLearnerRow {
  learnerId: string;
  learnerName: string;
  baselineStatus: string;
  activeGoalsCount: number;
  homeworkSessionsThisWeek: number;
  independenceLabel: string;
}

/**
 * Complete classroom summary report.
 */
export interface ClassroomSummaryReport {
  classroomId: string;
  classroomName: string;
  tenantId: string;
  generatedAt: string;
  reportPeriodDays: number;
  baseline: ClassroomBaselineStats;
  goals: ClassroomGoalStats;
  homework: ClassroomHomeworkStats;
  focus: ClassroomFocusStats;
  learners: ClassroomLearnerRow[];
}

// ══════════════════════════════════════════════════════════════════════════════
// AUTH TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface AuthenticatedUser {
  sub: string;
  tenantId: string;
  role: 'parent' | 'teacher' | 'therapist' | 'district_admin' | 'admin' | 'service';
  childrenIds?: string[]; // For parents: list of their children's IDs
  classroomIds?: string[]; // For teachers: list of their classroom IDs
}

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE CLIENT TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ServiceError {
  error: string;
  statusCode: number;
}

export type ServiceResult<T> = T | ServiceError;

export function isServiceError<T>(result: ServiceResult<T>): result is ServiceError {
  return typeof result === 'object' && result !== null && 'error' in result;
}
