// =============================================================================
// Transition Events Publisher
// =============================================================================
//
// Publishes transition events to NATS JetStream.
// TODO: Add transition event types to @aivo/events library

import { logger } from '../logger.js';
import type {
  TransitionPlan,
  TransitionContext,
  TransitionWarning,
  TransitionRoutineStep,
} from './transition.types.js';

// -----------------------------------------------------------------------------
// Event Payload Types
// -----------------------------------------------------------------------------

export interface TransitionStartedPayload {
  transitionId: string;
  sessionId: string;
  learnerId: string;
  tenantId: string;
  fromActivity?: {
    id: string;
    title: string;
    type: string;
  };
  toActivity: {
    id: string;
    title: string;
    type: string;
  };
  plan: {
    totalDuration: number;
    warningIntervals: number[];
    visualStyle: string;
    colorScheme: string;
    enableAudio: boolean;
    enableHaptic: boolean;
    hasRoutine: boolean;
    hasFirstThenBoard: boolean;
  };
  scheduledAt: string;
}

export interface TransitionWarningPayload {
  transitionId: string;
  sessionId: string;
  learnerId: string;
  tenantId: string;
  warningNumber: number;
  secondsRemaining: number;
  isTimerVisible: boolean;
  visualStyle: string;
  audioType: string | null;
  hapticPattern: string | null;
  timestamp: string;
}

export interface TransitionAcknowledgedPayload {
  transitionId: string;
  sessionId: string;
  learnerId: string;
  tenantId: string;
  acknowledgedAt: string;
  secondsBeforeStart: number;
  readyState: 'ready' | 'needs_more_time' | 'skipped';
}

export interface TransitionRoutineStepPayload {
  transitionId: string;
  sessionId: string;
  learnerId: string;
  tenantId: string;
  stepIndex: number;
  stepType: string;
  stepDuration: number;
  completed: boolean;
  skipped: boolean;
  timestamp: string;
}

export interface TransitionCompletedPayload {
  transitionId: string;
  sessionId: string;
  learnerId: string;
  tenantId: string;
  fromActivityId: string;
  toActivityId: string;
  outcome: 'smooth' | 'successful' | 'struggled' | 'refused' | 'timed_out';
  plannedDuration: number;
  actualDuration: number;
  warningsDelivered: number;
  warningsAcknowledged: number;
  routineStepsCompleted: number;
  routineStepsTotal: number;
  learnerInteractions: number;
  completedAt: string;
}

// -----------------------------------------------------------------------------
// Transition Event Publisher Service
// -----------------------------------------------------------------------------

/**
 * Transition event publisher service.
 * TODO: Integrate with @aivo/events when transition event schemas are added.
 * For now, events are logged locally.
 */
class TransitionEventPublisherService {
  private logEvent(eventType: string, payload: unknown): void {
    logger.info({ payload }, `[TransitionEvent] ${eventType}`);
  }

  /**
   * Publish when a transition is scheduled to begin.
   */
  async publishTransitionStarted(
    tenantId: string,
    transitionId: string,
    sessionId: string,
    learnerId: string,
    plan: TransitionPlan,
    context: TransitionContext
  ): Promise<void> {
    const payload: TransitionStartedPayload = {
      transitionId,
      sessionId,
      learnerId,
      tenantId,
      fromActivity: context.fromActivity
        ? {
            id: context.fromActivity.id,
            title: context.fromActivity.title,
            type: context.fromActivity.type,
          }
        : undefined,
      toActivity: {
        id: context.toActivity.id,
        title: context.toActivity.title,
        type: context.toActivity.type,
      },
      plan: {
        totalDuration: plan.totalDuration,
        warningIntervals: plan.warnings.map((w) => w.secondsBefore),
        visualStyle: plan.visualSettings.style,
        colorScheme: plan.visualSettings.colorScheme,
        enableAudio: plan.audioSettings.enabled,
        enableHaptic: plan.warnings.some((w) => w.type === 'haptic'),
        hasRoutine: !!plan.routine && plan.routine.length > 0,
        hasFirstThenBoard: !!plan.firstThenBoard,
      },
      scheduledAt: new Date().toISOString(),
    };

    this.logEvent('transition.started', payload);
  }

  /**
   * Publish when a warning is delivered to the learner.
   */
  async publishTransitionWarning(
    tenantId: string,
    transitionId: string,
    sessionId: string,
    learnerId: string,
    warning: TransitionWarning,
    warningNumber: number
  ): Promise<void> {
    const payload: TransitionWarningPayload = {
      transitionId,
      sessionId,
      learnerId,
      tenantId,
      warningNumber,
      secondsRemaining: warning.secondsBefore,
      isTimerVisible: warning.type === 'visual',
      visualStyle: warning.type === 'visual' ? warning.intensity : 'subtle',
      audioType: warning.type === 'audio' || warning.type === 'spoken' ? warning.type : null,
      hapticPattern: warning.type === 'haptic' ? warning.intensity : null,
      timestamp: new Date().toISOString(),
    };

    this.logEvent('transition.warning', payload);
  }

  /**
   * Publish when a learner acknowledges the transition.
   */
  async publishTransitionAcknowledged(
    tenantId: string,
    transitionId: string,
    sessionId: string,
    learnerId: string,
    secondsBeforeStart: number,
    readyState: 'ready' | 'needs_more_time' | 'skipped'
  ): Promise<void> {
    const payload: TransitionAcknowledgedPayload = {
      transitionId,
      sessionId,
      learnerId,
      tenantId,
      acknowledgedAt: new Date().toISOString(),
      secondsBeforeStart,
      readyState,
    };

    this.logEvent('transition.acknowledged', payload);
  }

  /**
   * Publish when a routine step is completed or skipped.
   */
  async publishRoutineStepProgress(
    tenantId: string,
    transitionId: string,
    sessionId: string,
    learnerId: string,
    stepIndex: number,
    step: TransitionRoutineStep,
    completed: boolean,
    skipped: boolean
  ): Promise<void> {
    const payload: TransitionRoutineStepPayload = {
      transitionId,
      sessionId,
      learnerId,
      tenantId,
      stepIndex,
      stepType: step.type,
      stepDuration: step.duration,
      completed,
      skipped,
      timestamp: new Date().toISOString(),
    };

    this.logEvent('transition.routine.step', payload);
  }

  /**
   * Publish when a transition is completed (learner moved to next activity).
   */
  async publishTransitionCompleted(
    tenantId: string,
    transitionId: string,
    sessionId: string,
    learnerId: string,
    analytics: {
      fromActivityId: string;
      toActivityId: string;
      outcome: 'smooth' | 'successful' | 'struggled' | 'refused' | 'timed_out';
      plannedDuration: number;
      actualDuration: number;
      warningsDelivered: number;
      warningsAcknowledged: number;
      routineStepsCompleted: number;
      routineStepsTotal: number;
      learnerInteractions: number;
    }
  ): Promise<void> {
    const payload: TransitionCompletedPayload = {
      transitionId,
      sessionId,
      learnerId,
      tenantId,
      ...analytics,
      completedAt: new Date().toISOString(),
    };

    this.logEvent('transition.completed', payload);
  }

  /**
   * Gracefully close the publisher connection.
   */
  async close(): Promise<void> {
    // No-op for now - will implement when NATS integration is added
  }
}

// Export singleton instance
export const transitionEventPublisher = new TransitionEventPublisherService();
