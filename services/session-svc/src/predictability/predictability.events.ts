/**
 * Predictability Events Publisher - ND-2.2
 *
 * Publishes predictability-related events for analytics and monitoring.
 * TODO: Integrate with @aivo/events when predictability event schemas are added.
 */

import { logger } from '../logger.js';
import type {
  SessionOutlineItem,
  PredictabilityPreferences,
  ChangeExplanation,
} from './predictability.types.js';

// ══════════════════════════════════════════════════════════════════════════════
// EVENT PAYLOAD TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface SessionPlanCreatedPayload {
  planId: string;
  sessionId: string;
  learnerId: string;
  tenantId: string;
  structureType: 'default' | 'minimal' | 'high_support' | 'custom';
  itemCount: number;
  estimatedMinutes: number;
  hasWelcome: boolean;
  hasCheckin: boolean;
  hasGoodbye: boolean;
  activityCount: number;
  breakCount: number;
  createdAt: string;
}

export interface SessionProgressUpdatedPayload {
  planId: string;
  sessionId: string;
  learnerId: string;
  tenantId: string;
  currentItemId: string;
  currentPhase: string;
  completedItems: number;
  totalItems: number;
  progressPercent: number;
  remainingMinutes: number;
  timestamp: string;
}

export interface UnexpectedChangeRequestedPayload {
  planId: string;
  sessionId: string;
  learnerId: string;
  tenantId: string;
  changeType: 'add' | 'remove' | 'reorder' | 'skip' | 'extend';
  reason: string;
  severity: 'low' | 'medium' | 'high';
  explanation: ChangeExplanation;
  requiresApproval: boolean;
  approvalStatus?: 'pending' | 'approved' | 'declined';
  timestamp: string;
}

export interface ChangeAppliedPayload {
  planId: string;
  sessionId: string;
  learnerId: string;
  tenantId: string;
  changeId: string;
  changeType: 'add' | 'remove' | 'reorder' | 'skip' | 'extend';
  wasApproved: boolean;
  appliedAt: string;
}

export interface AnxietyReportedPayload {
  sessionId: string;
  learnerId: string;
  tenantId: string;
  level: 'mild' | 'moderate' | 'severe';
  triggerCategory?: string;
  triggerId?: string;
  supportActions: string[];
  copingStrategyUsed?: string;
  calmedDownAfterSeconds?: number;
  reportedAt: string;
}

export interface RoutineStartedPayload {
  sessionId: string;
  learnerId: string;
  tenantId: string;
  routineId: string;
  routineType: string;
  totalSteps: number;
  estimatedSeconds: number;
  isCustom: boolean;
  startedAt: string;
}

export interface RoutineStepCompletedPayload {
  sessionId: string;
  learnerId: string;
  tenantId: string;
  routineId: string;
  routineType: string;
  stepIndex: number;
  stepType: string;
  wasSkipped: boolean;
  durationSeconds: number;
  timestamp: string;
}

export interface RoutineCompletedPayload {
  sessionId: string;
  learnerId: string;
  tenantId: string;
  routineId: string;
  routineType: string;
  outcome: 'completed' | 'partial' | 'skipped' | 'interrupted';
  stepsCompleted: number;
  stepsTotal: number;
  actualDurationSeconds: number;
  plannedDurationSeconds: number;
  completedAt: string;
}

export interface PreferencesUpdatedPayload {
  learnerId: string;
  tenantId: string;
  enabled: boolean;
  warnMinutesBefore: number;
  showRemainingTime: boolean;
  useVisualSchedule: boolean;
  preferredRoutines: string[];
  changes: string[];
  updatedAt: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// EVENT PUBLISHER SERVICE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Predictability event publisher service.
 * TODO: Integrate with @aivo/events when predictability event schemas are added.
 * For now, events are logged locally.
 */
class PredictabilityEventPublisherService {
  private logEvent(eventType: string, payload: unknown): void {
    // In development, log event
    logger.info({ payload }, `[PredictabilityEvent] ${eventType}`);
  }

  /**
   * Publish when a new session plan is created
   */
  async publishSessionPlanCreated(
    tenantId: string,
    learnerId: string,
    planId: string,
    sessionId: string,
    outline: SessionOutlineItem[],
    structureType: 'default' | 'minimal' | 'high_support' | 'custom'
  ): Promise<void> {
    const payload: SessionPlanCreatedPayload = {
      planId,
      sessionId,
      learnerId,
      tenantId,
      structureType,
      itemCount: outline.length,
      estimatedMinutes: outline.reduce((sum, item) => sum + item.estimatedMinutes, 0),
      hasWelcome: outline.some((i) => i.id === 'welcome'),
      hasCheckin: outline.some((i) => i.id === 'checkin'),
      hasGoodbye: outline.some((i) => i.id === 'goodbye'),
      activityCount: outline.filter((i) => i.type === 'activity').length,
      breakCount: outline.filter((i) => i.type === 'break').length,
      createdAt: new Date().toISOString(),
    };

    this.logEvent('predictability.session_plan.created', payload);
  }

  /**
   * Publish when session progress is updated
   */
  async publishProgressUpdated(
    tenantId: string,
    learnerId: string,
    planId: string,
    sessionId: string,
    currentItemId: string,
    phase: string,
    progress: { completed: number; total: number; percentage: number; remainingMinutes: number }
  ): Promise<void> {
    const payload: SessionProgressUpdatedPayload = {
      planId,
      sessionId,
      learnerId,
      tenantId,
      currentItemId,
      currentPhase: phase,
      completedItems: progress.completed,
      totalItems: progress.total,
      progressPercent: progress.percentage,
      remainingMinutes: progress.remainingMinutes,
      timestamp: new Date().toISOString(),
    };

    this.logEvent('predictability.progress.updated', payload);
  }

  /**
   * Publish when an unexpected change is requested
   */
  async publishUnexpectedChangeRequested(
    tenantId: string,
    learnerId: string,
    planId: string,
    sessionId: string,
    changeType: 'add' | 'remove' | 'reorder' | 'skip' | 'extend',
    reason: string,
    explanation: ChangeExplanation,
    requiresApproval: boolean
  ): Promise<void> {
    const payload: UnexpectedChangeRequestedPayload = {
      planId,
      sessionId,
      learnerId,
      tenantId,
      changeType,
      reason,
      severity: explanation.severity,
      explanation,
      requiresApproval,
      approvalStatus: requiresApproval ? 'pending' : undefined,
      timestamp: new Date().toISOString(),
    };

    this.logEvent('predictability.change.requested', payload);
  }

  /**
   * Publish when a change is applied to the session plan
   */
  async publishChangeApplied(
    tenantId: string,
    learnerId: string,
    planId: string,
    sessionId: string,
    changeId: string,
    changeType: 'add' | 'remove' | 'reorder' | 'skip' | 'extend',
    wasApproved: boolean
  ): Promise<void> {
    const payload: ChangeAppliedPayload = {
      planId,
      sessionId,
      learnerId,
      tenantId,
      changeId,
      changeType,
      wasApproved,
      appliedAt: new Date().toISOString(),
    };

    this.logEvent('predictability.change.applied', payload);
  }

  /**
   * Publish when anxiety is reported during session
   */
  async publishAnxietyReported(
    tenantId: string,
    sessionId: string,
    learnerId: string,
    level: 'mild' | 'moderate' | 'severe',
    supportActions: string[],
    triggerCategory?: string,
    triggerId?: string
  ): Promise<void> {
    const payload: AnxietyReportedPayload = {
      sessionId,
      learnerId,
      tenantId,
      level,
      triggerCategory,
      triggerId,
      supportActions,
      reportedAt: new Date().toISOString(),
    };

    this.logEvent('predictability.anxiety.reported', payload);
  }

  /**
   * Publish when a routine is started
   */
  async publishRoutineStarted(
    tenantId: string,
    sessionId: string,
    learnerId: string,
    routineId: string,
    routineType: string,
    totalSteps: number,
    estimatedSeconds: number,
    isCustom: boolean
  ): Promise<void> {
    const payload: RoutineStartedPayload = {
      sessionId,
      learnerId,
      tenantId,
      routineId,
      routineType,
      totalSteps,
      estimatedSeconds,
      isCustom,
      startedAt: new Date().toISOString(),
    };

    this.logEvent('predictability.routine.started', payload);
  }

  /**
   * Publish when a routine step is completed
   */
  async publishRoutineStepCompleted(
    tenantId: string,
    sessionId: string,
    learnerId: string,
    routineId: string,
    routineType: string,
    stepIndex: number,
    stepType: string,
    wasSkipped: boolean,
    durationSeconds: number
  ): Promise<void> {
    const payload: RoutineStepCompletedPayload = {
      sessionId,
      learnerId,
      tenantId,
      routineId,
      routineType,
      stepIndex,
      stepType,
      wasSkipped,
      durationSeconds,
      timestamp: new Date().toISOString(),
    };

    this.logEvent('predictability.routine.step_completed', payload);
  }

  /**
   * Publish when a routine is completed
   */
  async publishRoutineCompleted(
    tenantId: string,
    sessionId: string,
    learnerId: string,
    routineId: string,
    routineType: string,
    outcome: 'completed' | 'partial' | 'skipped' | 'interrupted',
    stepsCompleted: number,
    stepsTotal: number,
    actualDurationSeconds: number,
    plannedDurationSeconds: number
  ): Promise<void> {
    const payload: RoutineCompletedPayload = {
      sessionId,
      learnerId,
      tenantId,
      routineId,
      routineType,
      outcome,
      stepsCompleted,
      stepsTotal,
      actualDurationSeconds,
      plannedDurationSeconds,
      completedAt: new Date().toISOString(),
    };

    this.logEvent('predictability.routine.completed', payload);
  }

  /**
   * Publish when preferences are updated
   */
  async publishPreferencesUpdated(
    tenantId: string,
    learnerId: string,
    preferences: PredictabilityPreferences,
    changes: string[]
  ): Promise<void> {
    const payload: PreferencesUpdatedPayload = {
      learnerId,
      tenantId,
      enabled: preferences.enabled,
      warnMinutesBefore: preferences.warnMinutesBefore,
      showRemainingTime: preferences.showRemainingTime,
      useVisualSchedule: preferences.useVisualSchedule,
      preferredRoutines: preferences.preferredRoutineTypes,
      changes,
      updatedAt: new Date().toISOString(),
    };

    this.logEvent('predictability.preferences.updated', payload);
  }

  /**
   * Gracefully close the publisher connection.
   */
  async close(): Promise<void> {
    // No-op for now; will be used when integrating with NATS
    logger.info('[PredictabilityEventPublisher] Closing publisher');
  }
}

// Singleton instance
export const predictabilityEventPublisher = new PredictabilityEventPublisherService();
