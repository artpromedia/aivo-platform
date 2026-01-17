// =============================================================================
// Transition Events Publisher
// =============================================================================
//
// Publishes transition events to NATS JetStream.
// Uses @aivo/events schemas for type-safe event publishing.

import { v4 as uuidv4 } from 'uuid';
import { EventPublisher, createEventPublisher } from '@aivo/events';
import type {
  TransitionStarted,
  TransitionWarning as TransitionWarningEvent,
  TransitionAcknowledged,
  TransitionRoutineStep as TransitionRoutineStepEvent,
  TransitionCompleted,
} from '@aivo/events';

import { config } from '../config.js';
import { logger } from '../logger.js';
import type {
  TransitionPlan,
  TransitionContext,
  TransitionWarning,
  TransitionRoutineStep,
} from './transition.types.js';

// Re-export payload types from @aivo/events for backwards compatibility
export type TransitionStartedPayload = TransitionStarted['payload'];
export type TransitionWarningPayload = TransitionWarningEvent['payload'];
export type TransitionAcknowledgedPayload = TransitionAcknowledged['payload'];
export type TransitionRoutineStepPayload = TransitionRoutineStepEvent['payload'];
export type TransitionCompletedPayload = TransitionCompleted['payload'];

// Service version for event source
const SERVICE_NAME = 'session-svc';
const SERVICE_VERSION = '1.0.0';

/**
 * Creates a base event envelope with standard fields.
 */
function createEventEnvelope(eventType: string, tenantId: string) {
  return {
    eventId: uuidv4(),
    tenantId,
    eventType,
    eventVersion: '1.0.0' as const,
    timestamp: new Date().toISOString(),
    source: {
      service: SERVICE_NAME,
      version: SERVICE_VERSION,
    },
  };
}

// -----------------------------------------------------------------------------
// Transition Event Publisher Service
// -----------------------------------------------------------------------------

/**
 * Transition event publisher service.
 * Publishes events to NATS JetStream using @aivo/events schemas.
 */
class TransitionEventPublisherService {
  private publisher: EventPublisher | null = null;
  private isConnecting = false;

  constructor() {
    if (config.nats.enabled) {
      this.initializePublisher();
    } else {
      logger.info('[TransitionEvents] NATS disabled, events will be logged only');
    }
  }

  private async initializePublisher(): Promise<void> {
    if (this.isConnecting || this.publisher) {
      return;
    }

    this.isConnecting = true;

    try {
      this.publisher = createEventPublisher({
        servers: config.nats.servers,
        serviceName: SERVICE_NAME,
        serviceVersion: SERVICE_VERSION,
        name: 'session-svc-transition-publisher',
        token: config.nats.token,
        user: config.nats.user,
        pass: config.nats.pass,
      });

      await this.publisher.connect();
      logger.info('[TransitionEvents] Connected to NATS');
    } catch (err) {
      logger.error({ err }, '[TransitionEvents] Failed to connect to NATS');
      this.publisher = null;
    } finally {
      this.isConnecting = false;
    }
  }

  private async ensureConnected(): Promise<EventPublisher | null> {
    if (!config.nats.enabled) {
      return null;
    }

    if (this.publisher?.isConnected()) {
      return this.publisher;
    }

    await this.initializePublisher();
    return this.publisher;
  }

  private async publishEvent(eventType: string, tenantId: string, event: unknown): Promise<void> {
    const publisher = await this.ensureConnected();

    if (publisher) {
      try {
        const result = await publisher.publish(eventType, event);
        if (result.success) {
          logger.debug({ eventType, sequence: result.sequence }, '[TransitionEvent] Published event');
        } else {
          logger.error({ eventType, error: result.error?.message }, '[TransitionEvent] Failed to publish');
        }
      } catch (error) {
        logger.error({ error, eventType }, '[TransitionEvent] Error publishing event');
      }
    } else {
      // Log event when NATS is not available
      logger.debug({ eventType, tenantId, event }, '[TransitionEvent] Event not sent (NATS unavailable)');
    }
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

    const event: TransitionStarted = {
      ...createEventEnvelope('transition.started', tenantId),
      eventType: 'transition.started',
      payload,
    };

    await this.publishEvent('transition.started', tenantId, event);
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

    const event: TransitionWarningEvent = {
      ...createEventEnvelope('transition.warning', tenantId),
      eventType: 'transition.warning',
      payload,
    };

    await this.publishEvent('transition.warning', tenantId, event);
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

    const event: TransitionAcknowledged = {
      ...createEventEnvelope('transition.acknowledged', tenantId),
      eventType: 'transition.acknowledged',
      payload,
    };

    await this.publishEvent('transition.acknowledged', tenantId, event);
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

    const event: TransitionRoutineStepEvent = {
      ...createEventEnvelope('transition.routine.step', tenantId),
      eventType: 'transition.routine.step',
      payload,
    };

    await this.publishEvent('transition.routine.step', tenantId, event);
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

    const event: TransitionCompleted = {
      ...createEventEnvelope('transition.completed', tenantId),
      eventType: 'transition.completed',
      payload,
    };

    await this.publishEvent('transition.completed', tenantId, event);
  }

  /**
   * Gracefully close the publisher connection.
   */
  async close(): Promise<void> {
    if (this.publisher) {
      await this.publisher.close();
      this.publisher = null;
    }
  }
}

// Export singleton instance
export const transitionEventPublisher = new TransitionEventPublisherService();
