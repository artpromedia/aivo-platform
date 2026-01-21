/**
 * Predictability Events Publisher - ND-2.2
 *
 * Publishes predictability-related events for analytics and monitoring.
 * Uses @aivo/events schemas for type-safe event publishing.
 */

import { createEventPublisher } from '@aivo/events';
import type {
  SessionPlanCreated,
  SessionProgressUpdated,
  UnexpectedChangeRequested,
  ChangeApplied,
  AnxietyReported,
  RoutineStarted,
  RoutineStepCompleted,
  RoutineCompleted,
  PreferencesUpdated,
  EventPublisher,
} from '@aivo/events';
import { v4 as uuidv4 } from 'uuid';

import { config } from '../config.js';
import { logger } from '../logger.js';

import type {
  SessionOutlineItem,
  PredictabilityPreferences,
  ChangeExplanation,
} from './predictability.types.js';

// Re-export payload types from @aivo/events for backwards compatibility
export type SessionPlanCreatedPayload = SessionPlanCreated['payload'];
export type SessionProgressUpdatedPayload = SessionProgressUpdated['payload'];
export type UnexpectedChangeRequestedPayload = UnexpectedChangeRequested['payload'];
export type ChangeAppliedPayload = ChangeApplied['payload'];
export type AnxietyReportedPayload = AnxietyReported['payload'];
export type RoutineStartedPayload = RoutineStarted['payload'];
export type RoutineStepCompletedPayload = RoutineStepCompleted['payload'];
export type RoutineCompletedPayload = RoutineCompleted['payload'];
export type PreferencesUpdatedPayload = PreferencesUpdated['payload'];

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

// ══════════════════════════════════════════════════════════════════════════════
// EVENT PUBLISHER SERVICE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Predictability event publisher service.
 * Publishes events to NATS JetStream using @aivo/events schemas.
 */
class PredictabilityEventPublisherService {
  private publisher: EventPublisher | null = null;
  private isConnecting = false;

  constructor() {
    if (config.nats.enabled) {
      this.initializePublisher();
    } else {
      logger.info('[PredictabilityEvents] NATS disabled, events will be logged only');
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
        name: 'session-svc-predictability-publisher',
        token: config.nats.token,
        user: config.nats.user,
        pass: config.nats.pass,
      });

      await this.publisher.connect();
      logger.info('[PredictabilityEvents] Connected to NATS');
    } catch (err) {
      logger.error({ err }, '[PredictabilityEvents] Failed to connect to NATS');
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

  private async publishEvent(_eventType: string, _tenantId: string, event: unknown): Promise<void> {
    const publisher = await this.ensureConnected();

    if (publisher) {
      try {
        // Use publishRaw for custom event types
        const result = await publisher.publishRaw(
          event as Parameters<typeof publisher.publishRaw>[0]
        );
        if (result.success) {
          logger.debug(
            { eventType: _eventType, eventId: result.eventId },
            '[PredictabilityEvent] Published event'
          );
        } else {
          logger.error(
            { eventType: _eventType, error: result.error?.message },
            '[PredictabilityEvent] Failed to publish'
          );
        }
      } catch (error) {
        logger.error(
          { error, eventType: _eventType },
          '[PredictabilityEvent] Error publishing event'
        );
      }
    } else {
      // Log event when NATS is not available
      logger.debug(
        { eventType: _eventType, tenantId: _tenantId, event },
        '[PredictabilityEvent] Event not sent (NATS unavailable)'
      );
    }
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

    const event: SessionPlanCreated = {
      ...createEventEnvelope('predictability.session_plan.created', tenantId),
      eventType: 'predictability.session_plan.created',
      payload,
    };

    await this.publishEvent('predictability.session_plan.created', tenantId, event);
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
      currentItemId,
      currentPhase: phase,
      completedItems: progress.completed,
      totalItems: progress.total,
      progressPercent: progress.percentage,
      remainingMinutes: progress.remainingMinutes,
      timestamp: new Date().toISOString(),
    };

    const event: SessionProgressUpdated = {
      ...createEventEnvelope('predictability.progress.updated', tenantId),
      eventType: 'predictability.progress.updated',
      payload,
    };

    await this.publishEvent('predictability.progress.updated', tenantId, event);
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
      changeType,
      reason,
      severity: explanation.severity,
      explanation: {
        severity: explanation.severity,
        title: explanation.title,
        message: explanation.message,
        iconType: explanation.iconType,
      },
      requiresApproval,
      approvalStatus: requiresApproval ? 'pending' : undefined,
      timestamp: new Date().toISOString(),
    };

    const event: UnexpectedChangeRequested = {
      ...createEventEnvelope('predictability.change.requested', tenantId),
      eventType: 'predictability.change.requested',
      payload,
    };

    await this.publishEvent('predictability.change.requested', tenantId, event);
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
      changeId,
      changeType,
      wasApproved,
      appliedAt: new Date().toISOString(),
    };

    const event: ChangeApplied = {
      ...createEventEnvelope('predictability.change.applied', tenantId),
      eventType: 'predictability.change.applied',
      payload,
    };

    await this.publishEvent('predictability.change.applied', tenantId, event);
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
      level,
      triggerCategory,
      triggerId,
      supportActions,
      reportedAt: new Date().toISOString(),
    };

    const event: AnxietyReported = {
      ...createEventEnvelope('predictability.anxiety.reported', tenantId),
      eventType: 'predictability.anxiety.reported',
      payload,
    };

    await this.publishEvent('predictability.anxiety.reported', tenantId, event);
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
      routineId,
      routineType,
      totalSteps,
      estimatedSeconds,
      isCustom,
      startedAt: new Date().toISOString(),
    };

    const event: RoutineStarted = {
      ...createEventEnvelope('predictability.routine.started', tenantId),
      eventType: 'predictability.routine.started',
      payload,
    };

    await this.publishEvent('predictability.routine.started', tenantId, event);
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
      routineId,
      routineType,
      stepIndex,
      stepType,
      wasSkipped,
      durationSeconds,
      timestamp: new Date().toISOString(),
    };

    const event: RoutineStepCompleted = {
      ...createEventEnvelope('predictability.routine.step_completed', tenantId),
      eventType: 'predictability.routine.step_completed',
      payload,
    };

    await this.publishEvent('predictability.routine.step_completed', tenantId, event);
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
      routineId,
      routineType,
      outcome,
      stepsCompleted,
      stepsTotal,
      actualDurationSeconds,
      plannedDurationSeconds,
      completedAt: new Date().toISOString(),
    };

    const event: RoutineCompleted = {
      ...createEventEnvelope('predictability.routine.completed', tenantId),
      eventType: 'predictability.routine.completed',
      payload,
    };

    await this.publishEvent('predictability.routine.completed', tenantId, event);
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
      enabled: preferences.enabled,
      warnMinutesBefore: preferences.warnMinutesBefore,
      showRemainingTime: preferences.showRemainingTime,
      useVisualSchedule: preferences.useVisualSchedule,
      preferredRoutines: preferences.preferredRoutineTypes,
      changes,
      updatedAt: new Date().toISOString(),
    };

    const event: PreferencesUpdated = {
      ...createEventEnvelope('predictability.preferences.updated', tenantId),
      eventType: 'predictability.preferences.updated',
      payload,
    };

    await this.publishEvent('predictability.preferences.updated', tenantId, event);
  }

  /**
   * Gracefully close the publisher connection.
   */
  async close(): Promise<void> {
    if (this.publisher) {
      await this.publisher.close();
      this.publisher = null;
    }
    logger.info('[PredictabilityEventPublisher] Publisher closed');
  }
}

// Singleton instance
export const predictabilityEventPublisher = new PredictabilityEventPublisherService();
