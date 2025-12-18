/**
 * Predictability Types - ND-2.2
 *
 * Type definitions for predictability enforcement in learning sessions.
 * Ensures consistent routines, advance warnings, and structured experiences
 * for learners who require predictable flow.
 */

// ══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Routine types for predictable session structure
 */
export type RoutineType =
  | 'WELCOME'     // Start of session
  | 'CHECKIN'     // Emotional check-in
  | 'TRANSITION'  // Between activities
  | 'BREAK'       // Break routine
  | 'RETURN'      // Return from break
  | 'GOODBYE'     // End of session
  | 'CELEBRATION' // After achievement
  | 'CALMING';    // When overwhelmed

/**
 * Predictability event types for logging
 */
export type PredictabilityEventType =
  | 'SESSION_START'
  | 'SESSION_END'
  | 'ACTIVITY_CHANGE'
  | 'UNEXPECTED_CHANGE'
  | 'ROUTINE_COMPLETED'
  | 'ROUTINE_SKIPPED'
  | 'BREAK_TAKEN'
  | 'CHANGE_EXPLAINED'
  | 'LEARNER_ANXIOUS'
  | 'PREDICTABILITY_RESTORED';

/**
 * Predictability level - controls strictness of session structure
 */
export type PredictabilityLevel = 'minimal' | 'moderate' | 'high' | 'strict';

/**
 * Session phase during predictable flow
 */
export type SessionPhase = 'welcome' | 'checkin' | 'main' | 'break' | 'goodbye';

/**
 * Outline item status
 */
export type OutlineItemStatus = 'upcoming' | 'current' | 'completed' | 'skipped';

/**
 * Routine step types
 */
export type RoutineStepType =
  | 'greeting'
  | 'breathing'
  | 'preview'
  | 'checkin'
  | 'movement'
  | 'affirmation'
  | 'custom';

/**
 * Change types that can occur in a session
 */
export type UnexpectedChangeType =
  | 'add_activity'
  | 'remove_activity'
  | 'reorder'
  | 'replace'
  | 'extend_time';

/**
 * Learner response to unexpected changes
 */
export type LearnerChangeResponse = 'accepted' | 'anxious' | 'refused';

// ══════════════════════════════════════════════════════════════════════════════
// CORE INTERFACES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Learner's predictability preferences
 */
export interface PredictabilityPreferences {
  id: string;
  learnerId: string;
  tenantId: string;

  // Core predictability settings
  requiresPredictableFlow: boolean;
  predictabilityLevel: PredictabilityLevel;

  // Session structure preferences
  alwaysShowSessionOutline: boolean;
  showEstimatedDurations: boolean;
  showProgressIndicator: boolean;
  announceActivityChanges: boolean;

  // Routine preferences
  preferConsistentOrder: boolean;
  preferFamiliarContent: boolean;
  preferSameTimeOfDay: boolean;
  typicalSessionTime?: string; // "HH:mm" format

  // Transition preferences
  transitionWarningMinutes: number;
  requireTransitionAcknowledgment: boolean;
  showFirstThenBoard: boolean;

  // Surprise handling
  allowSurpriseRewards: boolean;
  allowDynamicContent: boolean;
  warnBeforeNewContent: boolean;

  // Change tolerance
  maxUnexpectedChanges: number;
  requireChangeExplanation: boolean;

  // Routine elements to include
  includeWelcomeRoutine: boolean;
  includeCheckInRoutine: boolean;
  includeGoodbyeRoutine: boolean;
  includeBreakRoutines: boolean;

  // Comfort elements
  showFamiliarCharacter: boolean;
  characterName?: string;
  characterAvatarUrl?: string;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for creating/updating predictability preferences
 */
export interface PredictabilityPreferencesInput {
  learnerId: string;
  tenantId: string;
  requiresPredictableFlow?: boolean;
  predictabilityLevel?: PredictabilityLevel;
  alwaysShowSessionOutline?: boolean;
  showEstimatedDurations?: boolean;
  showProgressIndicator?: boolean;
  announceActivityChanges?: boolean;
  preferConsistentOrder?: boolean;
  preferFamiliarContent?: boolean;
  preferSameTimeOfDay?: boolean;
  typicalSessionTime?: string;
  transitionWarningMinutes?: number;
  requireTransitionAcknowledgment?: boolean;
  showFirstThenBoard?: boolean;
  allowSurpriseRewards?: boolean;
  allowDynamicContent?: boolean;
  warnBeforeNewContent?: boolean;
  maxUnexpectedChanges?: number;
  requireChangeExplanation?: boolean;
  includeWelcomeRoutine?: boolean;
  includeCheckInRoutine?: boolean;
  includeGoodbyeRoutine?: boolean;
  includeBreakRoutines?: boolean;
  showFamiliarCharacter?: boolean;
  characterName?: string;
  characterAvatarUrl?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTINE INTERFACES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * A single step within a routine
 */
export interface RoutineStep {
  id: string;
  type: RoutineStepType;
  title: string;
  instruction: string;
  durationSeconds: number;
  mediaUrl?: string;
  isSkippable: boolean;
  requiresInteraction: boolean;
}

/**
 * A complete session routine (e.g., welcome, goodbye)
 */
export interface SessionRoutine {
  id: string;
  tenantId: string;
  name: string;
  type: RoutineType;
  description?: string;
  steps: RoutineStep[];
  totalDurationSeconds: number;
  isDefault: boolean;
  targetAgeMin?: number;
  targetAgeMax?: number;
  isCustomizable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Routine data for use in session plans (subset of SessionRoutine)
 */
export interface SessionRoutineData {
  id: string;
  name: string;
  type: RoutineType;
  steps: RoutineStep[];
  totalDurationSeconds: number;
}

/**
 * Input for creating a routine
 */
export interface SessionRoutineInput {
  tenantId: string;
  name: string;
  type: RoutineType;
  description?: string;
  steps: RoutineStep[];
  isDefault?: boolean;
  targetAgeMin?: number;
  targetAgeMax?: number;
  isCustomizable?: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// SESSION STRUCTURE INTERFACES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Structure definition for a session template
 */
export interface SessionStructureDefinition {
  welcome?: {
    routineId: string;
    required: boolean;
  };
  checkin?: {
    routineId: string;
    required: boolean;
  };
  mainContent: {
    minActivities: number;
    maxActivities: number;
    breakAfterActivities: number;
  };
  breaks?: {
    routineId: string;
    minDurationMinutes: number;
  };
  goodbye?: {
    routineId: string;
    required: boolean;
  };
}

/**
 * A session structure template
 */
export interface SessionStructureTemplate {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  structure: SessionStructureDefinition;
  targetDurationMinutes: number;
  flexibilityPercent: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ══════════════════════════════════════════════════════════════════════════════
// SESSION PLAN INTERFACES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * An item in the session outline
 */
export interface SessionOutlineItem {
  id: string;
  title: string;
  type: 'routine' | 'activity' | 'break';
  estimatedMinutes: number;
  status: OutlineItemStatus;
  icon: string;
  color: string;
  isNew?: boolean;
  description?: string;
}

/**
 * Character/companion information
 */
export interface CharacterInfo {
  name: string;
  avatarUrl: string;
}

/**
 * A complete predictable session plan
 */
export interface PredictableSessionPlan {
  sessionId: string;
  learnerId: string;
  tenantId: string;

  // Overall structure
  outline: SessionOutlineItem[];

  // Routines to use
  welcomeRoutine?: SessionRoutineData;
  checkInRoutine?: SessionRoutineData;
  transitionRoutine?: SessionRoutineData;
  breakRoutine?: SessionRoutineData;
  goodbyeRoutine?: SessionRoutineData;

  // Settings
  preferences: PredictabilityPreferences;

  // Timing
  estimatedTotalMinutes: number;
  startedAt?: Date;
  completedAt?: Date;

  // Character
  character?: CharacterInfo;

  // State
  currentPhase: SessionPhase;
  currentActivityIndex: number;
  unexpectedChangesCount: number;
}

/**
 * Activity input for creating a session plan
 */
export interface SessionActivityInput {
  id: string;
  title: string;
  type: string;
  estimatedMinutes: number;
  isNew?: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// CHANGE MANAGEMENT INTERFACES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Request to make an unexpected change to a session
 */
export interface UnexpectedChangeRequest {
  sessionId: string;
  changeType: UnexpectedChangeType;
  reason: string;
  details: UnexpectedChangeDetails;
}

/**
 * Details for different change types
 */
export interface UnexpectedChangeDetails {
  // For add_activity
  activityId?: string;
  title?: string;
  activityType?: string;
  estimatedMinutes?: number;
  afterItemId?: string;

  // For remove_activity
  itemId?: string;

  // For extend_time
  additionalMinutes?: number;

  // For reorder
  fromIndex?: number;
  toIndex?: number;

  // For replace
  oldItemId?: string;
  newItemId?: string;
}

/**
 * Explanation for an unexpected change
 */
export interface ChangeExplanation {
  changeType: string;
  reason: string;
  whatWillHappen: string;
  whatStaysSame: string;
  visualAid?: string;
}

/**
 * Result of requesting an unexpected change
 */
export interface ChangeRequestResult {
  allowed: boolean;
  explanation?: ChangeExplanation;
  reason?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// ANXIETY/CALMING INTERFACES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Result of reporting learner anxiety
 */
export interface AnxietyReportResult {
  recommendations: string[];
  shouldPause: boolean;
  calmingRoutine?: SessionRoutineData;
}

// ══════════════════════════════════════════════════════════════════════════════
// LOGGING INTERFACES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Predictability event log entry
 */
export interface PredictabilityLogEntry {
  id: string;
  sessionId: string;
  learnerId: string;
  tenantId: string;
  eventType: PredictabilityEventType;
  details: PredictabilityEventDetails;
  predictabilityMaintained: boolean;
  unexpectedChangeCount: number;
  timestamp: Date;
}

/**
 * Details for predictability events
 */
export interface PredictabilityEventDetails {
  expectedActivity?: string;
  actualActivity?: string;
  reason?: string;
  learnerResponse?: LearnerChangeResponse;
  routineType?: RoutineType;
  phase?: SessionPhase;
  changeType?: UnexpectedChangeType;
  allowed?: boolean;
  changeCount?: number;
  trigger?: string;
  outlineItemCount?: number;
  estimatedMinutes?: number;
  predictabilityLevel?: PredictabilityLevel;
}

// ══════════════════════════════════════════════════════════════════════════════
// API RESPONSE INTERFACES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Paginated list response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Predictability stats for analytics
 */
export interface PredictabilityStats {
  tenantId: string;
  period: {
    start: Date;
    end: Date;
  };
  totalSessions: number;
  predictableSessionsCount: number;
  averageUnexpectedChanges: number;
  routineCompletionRate: number;
  anxietyIncidents: number;
  mostSkippedRoutineType?: RoutineType;
  mostTriggeredAnxietyCause?: string;
}

/**
 * Learner predictability analytics
 */
export interface LearnerPredictabilityAnalytics {
  learnerId: string;
  sessionsCount: number;
  averageUnexpectedChanges: number;
  routinePreferences: {
    mostCompletedType: RoutineType;
    mostSkippedType?: RoutineType;
  };
  anxietyTriggers: string[];
  recommendedLevel: PredictabilityLevel;
}
