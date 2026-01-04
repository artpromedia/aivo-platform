// =============================================================================
// session-svc Event Publisher Service
// =============================================================================
//
// Publishes session events to NATS JetStream.
// Falls back to logging when NATS is disabled or unavailable.

import { EventPublisher, createEventPublisher } from '@aivo/events';
import type {
  LearningSessionStarted,
  LearningSessionEnded,
  ActivityStarted,
  ActivityCompleted,
} from '@aivo/events';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { SessionType, SessionOrigin } from '../types.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface SessionData {
  id: string;
  tenantId: string;
  learnerId: string;
  sessionType: string;
  origin?: string;
  startedAt: Date;
  metadata?: Record<string, unknown>;
}

interface SessionEndData {
  sessionId: string;
  tenantId: string;
  learnerId: string;
  durationMs: number;
  endReason: 'completed' | 'user_exit' | 'timeout' | 'app_background' | 'connection_lost' | 'error';
  summary: {
    activitiesStarted: number;
    activitiesCompleted: number;
    correctAnswers: number;
    incorrectAnswers: number;
    hintsUsed: number;
    avgFocusScore?: number;
  };
  endedAt: Date;
}

interface ActivityData {
  sessionId: string;
  tenantId: string;
  learnerId: string;
  activityId: string;
  activityType: 'lesson' | 'quiz' | 'practice' | 'game' | 'video' | 'reading' | 'interactive';
  contentId: string;
  skillId?: string;
  difficultyLevel?: number;
  sequenceNumber: number;
  startedAt: Date;
}

interface ActivityCompletionData {
  sessionId: string;
  tenantId: string;
  learnerId: string;
  activityId: string;
  durationMs: number;
  outcome: 'completed' | 'skipped' | 'abandoned' | 'timed_out';
  score?: number;
  attempts?: number;
  masteryLevel?: number;
  onTaskRatio?: number;
  completedAt: Date;
}

// -----------------------------------------------------------------------------
// Session Event Publisher Service
// -----------------------------------------------------------------------------

class SessionEventPublisherService {
  private publisher: EventPublisher | null = null;
  private isConnecting = false;
  private connectionError: Error | null = null;

  constructor() {
    if (config.nats.enabled) {
      this.initializePublisher();
    } else {
      logger.info('NATS disabled, events will be logged only');
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
        serviceName: 'session-svc',
        serviceVersion: '0.1.0',
        name: 'session-svc-publisher',
        token: config.nats.token,
        user: config.nats.user,
        pass: config.nats.pass,
      });

      await this.publisher.connect();
      logger.info('Connected to NATS');
      this.connectionError = null;
    } catch (err) {
      this.connectionError = err instanceof Error ? err : new Error(String(err));
      logger.error({ err }, 'Failed to connect to NATS');
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

    // Try to reconnect
    await this.initializePublisher();
    return this.publisher;
  }

  // ---------------------------------------------------------------------------
  // Session Events
  // ---------------------------------------------------------------------------

  async publishSessionStarted(session: SessionData): Promise<void> {
    const publisher = await this.ensureConnected();

    // Map session type to schema enum
    const sessionTypeMap: Record<string, LearningSessionStarted['payload']['sessionType']> = {
      [SessionType.LEARNING]: 'LEARNING',
      [SessionType.HOMEWORK]: 'HOMEWORK',
      [SessionType.BASELINE]: 'BASELINE',
      [SessionType.PRACTICE]: 'PRACTICE',
      [SessionType.ASSESSMENT]: 'ASSESSMENT',
      [SessionType.SEL]: 'REVIEW', // Map SEL to REVIEW
    };

    // Map origin to schema enum
    const originMap: Record<string, LearningSessionStarted['payload']['origin']> = {
      [SessionOrigin.MOBILE_LEARNER]: 'MOBILE_LEARNER',
      [SessionOrigin.WEB_LEARNER]: 'WEB_LEARNER',
      [SessionOrigin.TEACHER_LED]: 'WEB_TEACHER',
      [SessionOrigin.HOMEWORK_HELPER]: 'MOBILE_LEARNER',
      [SessionOrigin.PARENT_APP]: 'MOBILE_PARENT',
      [SessionOrigin.SYSTEM]: 'API',
    };

    const payload: LearningSessionStarted['payload'] = {
      sessionId: session.id,
      learnerId: session.learnerId,
      sessionType: sessionTypeMap[session.sessionType] ?? 'LEARNING',
      origin: originMap[session.origin ?? ''] ?? 'API',
      gradeBand: (session.metadata?.gradeBand as LearningSessionStarted['payload']['gradeBand']) ?? '5',
      subjectId: session.metadata?.subjectId as string | undefined,
      courseId: session.metadata?.courseId as string | undefined,
      deviceType: session.metadata?.deviceType as 'mobile' | 'tablet' | 'desktop' | undefined,
      initialActivityId: session.metadata?.initialActivityId as string | undefined,
      startedAt: session.startedAt.toISOString(),
    };

    if (publisher) {
      try {
        const result = await publisher.publishLearningSessionStarted(
          session.tenantId,
          payload,
          { correlationId: session.id }
        );

        if (result.success) {
          logger.debug({ sessionId: session.id, sequence: result.sequence }, 'Published session.started');
        } else {
          logger.error({ sessionId: session.id, error: result.error?.message }, 'Failed to publish session.started');
        }
      } catch (err) {
        logger.error({ err, sessionId: session.id }, 'Error publishing session.started');
      }
    } else {
      // Log event when NATS is not available
      logger.debug({ eventType: 'learning.session.started', tenantId: session.tenantId, payload }, 'Event not sent (NATS unavailable)');
    }
  }

  async publishSessionEnded(data: SessionEndData): Promise<void> {
    const publisher = await this.ensureConnected();

    const payload: LearningSessionEnded['payload'] = {
      sessionId: data.sessionId,
      learnerId: data.learnerId,
      durationMs: data.durationMs,
      endReason: data.endReason,
      summary: data.summary,
      endedAt: data.endedAt.toISOString(),
    };

    if (publisher) {
      try {
        const result = await publisher.publishLearningSessionEnded(
          data.tenantId,
          payload,
          { correlationId: data.sessionId }
        );

        if (result.success) {
          logger.debug({ sessionId: data.sessionId, sequence: result.sequence }, 'Published session.ended');
        } else {
          logger.error({ sessionId: data.sessionId, error: result.error?.message }, 'Failed to publish session.ended');
        }
      } catch (err) {
        logger.error({ err, sessionId: data.sessionId }, 'Error publishing session.ended');
      }
    } else {
      logger.debug({ eventType: 'learning.session.ended', tenantId: data.tenantId, payload }, 'Event not sent (NATS unavailable)');
    }
  }

  // ---------------------------------------------------------------------------
  // Activity Events
  // ---------------------------------------------------------------------------

  async publishActivityStarted(data: ActivityData): Promise<void> {
    const publisher = await this.ensureConnected();

    const payload: ActivityStarted['payload'] = {
      sessionId: data.sessionId,
      learnerId: data.learnerId,
      activityId: data.activityId,
      activityType: data.activityType,
      contentId: data.contentId,
      skillId: data.skillId,
      difficultyLevel: data.difficultyLevel as 1 | 2 | 3 | 4 | 5 | undefined,
      sequenceNumber: data.sequenceNumber,
      startedAt: data.startedAt.toISOString(),
    };

    if (publisher) {
      try {
        const result = await publisher.publishActivityStarted(
          data.tenantId,
          payload,
          { correlationId: data.sessionId }
        );

        if (result.success) {
          logger.debug({ activityId: data.activityId, sessionId: data.sessionId }, 'Published activity.started');
        }
      } catch (err) {
        logger.error({ err, activityId: data.activityId }, 'Error publishing activity.started');
      }
    }
  }

  async publishActivityCompleted(data: ActivityCompletionData): Promise<void> {
    const publisher = await this.ensureConnected();

    const payload: ActivityCompleted['payload'] = {
      sessionId: data.sessionId,
      learnerId: data.learnerId,
      activityId: data.activityId,
      durationMs: data.durationMs,
      outcome: data.outcome,
      score: data.score,
      attempts: data.attempts,
      masteryLevel: data.masteryLevel,
      onTaskRatio: data.onTaskRatio,
      completedAt: data.completedAt.toISOString(),
    };

    if (publisher) {
      try {
        const result = await publisher.publishActivityCompleted(
          data.tenantId,
          payload,
          { correlationId: data.sessionId }
        );

        if (result.success) {
          logger.debug({ activityId: data.activityId, sessionId: data.sessionId }, 'Published activity.completed');
        }
      } catch (err) {
        logger.error({ err, activityId: data.activityId }, 'Error publishing activity.completed');
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async shutdown(): Promise<void> {
    if (this.publisher) {
      await this.publisher.close();
      this.publisher = null;
      logger.info('Disconnected from NATS');
    }
  }

  isHealthy(): boolean {
    if (!config.nats.enabled) {
      return true; // Healthy when disabled
    }
    return this.publisher?.isConnected() ?? false;
  }
}

// -----------------------------------------------------------------------------
// Singleton Export
// -----------------------------------------------------------------------------

export const sessionEventPublisher = new SessionEventPublisherService();
