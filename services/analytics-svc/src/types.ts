// ══════════════════════════════════════════════════════════════════════════════
// ANALYTICS TYPES
// Response shapes for analytics endpoints
// ══════════════════════════════════════════════════════════════════════════════

// ─── Independence Scoring ──────────────────────────────────────────────────────

/**
 * Independence score labels based on ratio of independent steps.
 * 
 * Heuristic:
 * - For each homework submission, count steps completed without hint revealed
 * - independenceScore = (steps without hint) / (total completed steps)
 * 
 * Labels:
 * - 0.0 - 0.3: "Needs a lot of support"
 * - 0.3 - 0.7: "Building independence"
 * - 0.7 - 1.0: "Mostly independent"
 */
export type IndependenceLabel = 
  | 'needs_support'
  | 'building_independence'
  | 'mostly_independent';

export function getIndependenceLabel(score: number): IndependenceLabel {
  if (score < 0.3) return 'needs_support';
  if (score < 0.7) return 'building_independence';
  return 'mostly_independent';
}

export function getIndependenceLabelText(label: IndependenceLabel): string {
  switch (label) {
    case 'needs_support':
      return 'Needs a lot of support';
    case 'building_independence':
      return 'Building independence';
    case 'mostly_independent':
      return 'Mostly independent';
  }
}

// ─── Parent-Facing Responses ───────────────────────────────────────────────────

/**
 * GET /analytics/parents/:parentId/learners/:learnerId/homework-summary
 * Simplified homework metrics for parent dashboard.
 */
export interface ParentHomeworkSummary {
  /** Learner ID */
  learnerId: string;
  
  /** Average homework sessions per week (last 4 weeks) */
  homeworkSessionsPerWeek: number;
  
  /** Average steps completed per homework submission */
  avgStepsPerHomework: number;
  
  /** Independence score (0-1): ratio of steps without hints */
  independenceScore: number;
  
  /** Human-readable independence label */
  independenceLabel: IndependenceLabel;
  
  /** Descriptive text for independence */
  independenceLabelText: string;
  
  /** Last homework submission date (ISO string) */
  lastHomeworkDate: string | null;
  
  /** Total homework sessions in the period */
  totalHomeworkSessions: number;
}

/**
 * GET /analytics/parents/:parentId/learners/:learnerId/focus-summary
 * Simplified focus metrics for parent dashboard.
 */
export interface ParentFocusSummary {
  /** Learner ID */
  learnerId: string;
  
  /** Average focus breaks per session */
  avgFocusBreaksPerSession: number;
  
  /** Average session duration in minutes */
  avgSessionDurationMinutes: number;
  
  /** Total sessions analyzed */
  totalSessions: number;
  
  /** Backend-computed text summary */
  summary: string;
}

// ─── Teacher/District-Facing Responses ─────────────────────────────────────────

/**
 * Per-learner homework usage data for classroom view.
 */
export interface LearnerHomeworkUsage {
  learnerId: string;
  learnerName?: string;
  homeworkSessionsTotal: number;
  homeworkSessionsPerWeek: number;
  avgStepsPerHomework: number;
  independenceScore: number;
  independenceLabel: IndependenceLabel;
  lastHomeworkDate: string | null;
}

/**
 * GET /analytics/tenants/:tenantId/classrooms/:classroomId/homework-usage
 * Aggregated homework metrics for a classroom.
 */
export interface ClassroomHomeworkUsage {
  classroomId: string;
  tenantId: string;
  periodDays: number;
  
  /** Aggregate metrics */
  totalHomeworkSessions: number;
  avgSessionsPerLearner: number;
  avgIndependenceScore: number;
  
  /** Distribution of independence scores */
  independenceDistribution: {
    needsSupport: number;
    buildingIndependence: number;
    mostlyIndependent: number;
  };
  
  /** Per-learner breakdown */
  learners: LearnerHomeworkUsage[];
}

/**
 * Per-learner focus data for classroom view.
 */
export interface LearnerFocusData {
  learnerId: string;
  learnerName?: string;
  totalSessions: number;
  sessionsWithFocusLoss: number;
  avgFocusBreaksPerSession: number;
  avgSessionDurationMinutes: number;
}

/**
 * GET /analytics/tenants/:tenantId/classrooms/:classroomId/focus-patterns
 * Aggregated focus metrics for a classroom.
 */
export interface ClassroomFocusPatterns {
  classroomId: string;
  tenantId: string;
  periodDays: number;
  
  /** Aggregate metrics */
  totalSessions: number;
  sessionsWithFocusLoss: number;
  focusLossPercentage: number;
  avgFocusBreaksPerSession: number;
  
  /** Focus events by day of week (0=Sunday, 6=Saturday) */
  focusEventsByDayOfWeek: number[];
  
  /** Focus events by hour of day (0-23) */
  focusEventsByHour: number[];
  
  /** Per-learner breakdown */
  learners: LearnerFocusData[];
}

// ─── Request Types ─────────────────────────────────────────────────────────────

export interface AnalyticsQueryParams {
  /** Number of days to analyze (default: 28) */
  days?: number;
}
