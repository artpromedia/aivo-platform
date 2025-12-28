// ══════════════════════════════════════════════════════════════════════════════
// ANALYTICS EVENT SERVICE
// Comprehensive event tracking with Kinesis streaming
// FERPA/GDPR compliant data handling
// ══════════════════════════════════════════════════════════════════════════════

import { Kinesis, PutRecordsCommand, PutRecordsRequestEntry } from '@aws-sdk/client-kinesis';
import { createHash } from 'crypto';
import { Redis } from 'ioredis';

import { logger, metrics } from '@aivo/ts-observability';

import type { PrismaClient } from '../../generated/prisma';
import {
  AnalyticsEvent,
  AssessmentEvent,
  CollaborationEvent,
  EngagementEvent,
  EventContext,
  EventMetadata,
  LearningEvent,
  SystemEvent,
  createEventId,
  validateEventDetailed,
} from './event.types';
import type { XAPIService } from './xapi.service';
import type { CaliperService } from './caliper.service';

// ─── Configuration ─────────────────────────────────────────────────────────────

export interface EventServiceConfig {
  kinesisStreamName: string;
  awsRegion: string;
  bufferSize: number;
  flushIntervalMs: number;
  enableXAPI: boolean;
  enableCaliper: boolean;
  redactPII: boolean;
}

const DEFAULT_CONFIG: EventServiceConfig = {
  kinesisStreamName: 'aivo-analytics-events',
  awsRegion: 'us-east-1',
  bufferSize: 100,
  flushIntervalMs: 5000,
  enableXAPI: true,
  enableCaliper: true,
  redactPII: true,
};

// ─── Event Service ─────────────────────────────────────────────────────────────

export class EventService {
  private kinesis: Kinesis;
  private eventBuffer: AnalyticsEvent[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private config: EventServiceConfig;
  private isShuttingDown = false;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
    private readonly xapiService?: XAPIService,
    private readonly caliperService?: CaliperService,
    config?: Partial<EventServiceConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.kinesis = new Kinesis({
      region: this.config.awsRegion,
    });
  }

  /**
   * Initialize the event service
   */
  async initialize(): Promise<void> {
    // Start periodic flush
    this.flushInterval = setInterval(() => {
      void this.flushBuffer();
    }, this.config.flushIntervalMs);

    logger.info('EventService initialized', {
      streamName: this.config.kinesisStreamName,
      bufferSize: this.config.bufferSize,
      flushInterval: this.config.flushIntervalMs,
    });
  }

  /**
   * Shutdown the event service gracefully
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    // Flush remaining events
    await this.flushBuffer();

    logger.info('EventService shutdown complete');
  }

  // ============================================================================
  // LEARNING EVENTS
  // ============================================================================

  /**
   * Track lesson started event
   */
  async trackLessonStarted(
    studentId: string,
    lessonId: string,
    context: EventContext
  ): Promise<void> {
    const event: LearningEvent = {
      id: createEventId(),
      type: 'lesson.started',
      category: 'learning',
      timestamp: new Date(),
      studentId,
      tenantId: context.tenantId,
      data: {
        lessonId,
        classId: context.classId,
        assignmentId: context.assignmentId,
      },
      context: this.buildContext(context),
      metadata: this.buildMetadata(context),
    };

    await this.trackEvent(event);
    await this.updateRealTimeMetrics('lessons_started', context);
  }

  /**
   * Track lesson completed event
   */
  async trackLessonCompleted(
    studentId: string,
    lessonId: string,
    result: {
      score: number;
      timeSpentSeconds: number;
      questionsAnswered: number;
      questionsCorrect: number;
      masteryGained: number;
    },
    context: EventContext
  ): Promise<void> {
    const event: LearningEvent = {
      id: createEventId(),
      type: 'lesson.completed',
      category: 'learning',
      timestamp: new Date(),
      studentId,
      tenantId: context.tenantId,
      data: {
        lessonId,
        classId: context.classId,
        ...result,
      },
      context: this.buildContext(context),
      metadata: this.buildMetadata(context),
    };

    await this.trackEvent(event);

    // Generate xAPI statement if enabled
    if (this.config.enableXAPI && this.xapiService) {
      await this.xapiService.generateStatement({
        actor: { id: studentId },
        verb: 'completed',
        object: { type: 'lesson', id: lessonId },
        result: {
          score: { scaled: result.score / 100 },
          duration: `PT${result.timeSpentSeconds}S`,
          success: result.score >= 70,
        },
        context: { tenantId: context.tenantId },
      });
    }

    // Generate Caliper event if enabled
    if (this.config.enableCaliper && this.caliperService) {
      await this.caliperService.sendEvent({
        type: 'CompletionEvent',
        actor: studentId,
        object: { type: 'DigitalResource', id: lessonId },
        generated: {
          score: result.score,
          duration: result.timeSpentSeconds,
        },
      });
    }

    await this.updateRealTimeMetrics('lessons_completed', context);
  }

  /**
   * Track question answered event
   */
  async trackQuestionAnswered(
    studentId: string,
    questionId: string,
    result: {
      correct: boolean;
      score: number;
      timeSpentSeconds: number;
      attemptNumber: number;
      response: unknown;
    },
    context: EventContext
  ): Promise<void> {
    const event: LearningEvent = {
      id: createEventId(),
      type: 'question.answered',
      category: 'learning',
      timestamp: new Date(),
      studentId,
      tenantId: context.tenantId,
      data: {
        questionId,
        lessonId: context.lessonId,
        assessmentId: context.assessmentId,
        correct: result.correct,
        score: result.score,
        timeSpentSeconds: result.timeSpentSeconds,
        attemptNumber: result.attemptNumber,
        // Hash response for privacy - don't store actual content
        responseHash: this.hashResponse(result.response),
      },
      context: this.buildContext(context),
      metadata: this.buildMetadata(context),
    };

    await this.trackEvent(event);
  }

  /**
   * Track hint requested event
   */
  async trackHintRequested(
    studentId: string,
    questionId: string,
    hintLevel: number,
    context: EventContext
  ): Promise<void> {
    const event: LearningEvent = {
      id: createEventId(),
      type: 'question.hint_requested',
      category: 'learning',
      timestamp: new Date(),
      studentId,
      tenantId: context.tenantId,
      data: {
        questionId,
        lessonId: context.lessonId,
        hintLevel,
      },
      context: this.buildContext(context),
      metadata: this.buildMetadata(context),
    };

    await this.trackEvent(event);
  }

  /**
   * Track skill mastery change
   */
  async trackSkillMasteryChange(
    studentId: string,
    skillId: string,
    change: {
      previousLevel: number;
      newLevel: number;
      delta: number;
      source: 'lesson' | 'assessment' | 'practice';
    },
    context: EventContext
  ): Promise<void> {
    const event: LearningEvent = {
      id: createEventId(),
      type: 'skill.mastery_changed',
      category: 'learning',
      timestamp: new Date(),
      studentId,
      tenantId: context.tenantId,
      data: {
        skillId,
        ...change,
      },
      context: this.buildContext(context),
      metadata: this.buildMetadata(context),
    };

    await this.trackEvent(event);

    // Check for mastery achievement (≥90% mastery)
    if (change.newLevel >= 0.9 && change.previousLevel < 0.9) {
      await this.trackEvent({
        ...event,
        id: createEventId(),
        type: 'skill.mastered',
      });
    }
  }

  // ============================================================================
  // ASSESSMENT EVENTS
  // ============================================================================

  /**
   * Track assessment started
   */
  async trackAssessmentStarted(
    studentId: string,
    assessmentId: string,
    attemptId: string,
    context: EventContext
  ): Promise<void> {
    const event: AssessmentEvent = {
      id: createEventId(),
      type: 'assessment.started',
      category: 'assessment',
      timestamp: new Date(),
      studentId,
      tenantId: context.tenantId,
      data: {
        assessmentId,
        attemptId,
        classId: context.classId,
      },
      context: this.buildContext(context),
      metadata: this.buildMetadata(context),
    };

    await this.trackEvent(event);
  }

  /**
   * Track assessment submitted
   */
  async trackAssessmentSubmitted(
    studentId: string,
    assessmentId: string,
    attemptId: string,
    result: {
      score: number;
      totalPoints: number;
      percentageScore: number;
      timeSpentSeconds: number;
      questionsAnswered: number;
      questionsTotal: number;
      passed: boolean;
    },
    context: EventContext
  ): Promise<void> {
    const event: AssessmentEvent = {
      id: createEventId(),
      type: 'assessment.submitted',
      category: 'assessment',
      timestamp: new Date(),
      studentId,
      tenantId: context.tenantId,
      data: {
        assessmentId,
        attemptId,
        classId: context.classId,
        ...result,
      },
      context: this.buildContext(context),
      metadata: this.buildMetadata(context),
    };

    await this.trackEvent(event);

    // Generate xAPI statement
    if (this.config.enableXAPI && this.xapiService) {
      await this.xapiService.generateStatement({
        actor: { id: studentId },
        verb: 'completed',
        object: { type: 'assessment', id: assessmentId },
        result: {
          score: {
            scaled: result.percentageScore / 100,
            raw: result.score,
            max: result.totalPoints,
          },
          duration: `PT${result.timeSpentSeconds}S`,
          success: result.passed,
          completion: true,
        },
        context: { tenantId: context.tenantId },
      });
    }

    await this.updateRealTimeMetrics('assessments_submitted', context);
  }

  /**
   * Track baseline assessment started
   */
  async trackBaselineStarted(
    studentId: string,
    baselineId: string,
    context: EventContext
  ): Promise<void> {
    const event: AssessmentEvent = {
      id: createEventId(),
      type: 'baseline.started',
      category: 'assessment',
      timestamp: new Date(),
      studentId,
      tenantId: context.tenantId,
      data: {
        assessmentId: baselineId,
        classId: context.classId,
      },
      context: this.buildContext(context),
      metadata: this.buildMetadata(context),
    };

    await this.trackEvent(event);
  }

  /**
   * Track baseline assessment completed
   */
  async trackBaselineCompleted(
    studentId: string,
    baselineId: string,
    result: {
      skillLevels: Record<string, number>;
      questionsAnswered: number;
      timeSpentSeconds: number;
    },
    context: EventContext
  ): Promise<void> {
    const event: AssessmentEvent = {
      id: createEventId(),
      type: 'baseline.completed',
      category: 'assessment',
      timestamp: new Date(),
      studentId,
      tenantId: context.tenantId,
      data: {
        assessmentId: baselineId,
        classId: context.classId,
        ...result,
      },
      context: this.buildContext(context),
      metadata: this.buildMetadata(context),
    };

    await this.trackEvent(event);
  }

  // ============================================================================
  // ENGAGEMENT EVENTS
  // ============================================================================

  /**
   * Track user session
   */
  async trackSession(
    studentId: string,
    action: 'started' | 'ended' | 'heartbeat',
    sessionData: {
      sessionId: string;
      duration?: number;
      pageViews?: number;
      interactions?: number;
    },
    context: EventContext
  ): Promise<void> {
    const event: EngagementEvent = {
      id: createEventId(),
      type: `session.${action}`,
      category: 'engagement',
      timestamp: new Date(),
      studentId,
      tenantId: context.tenantId,
      data: sessionData,
      context: this.buildContext(context),
      metadata: this.buildMetadata(context),
    };

    await this.trackEvent(event);

    if (action === 'started') {
      await this.trackDailyActiveUser(studentId, context.tenantId);
    }

    // Update last activity timestamp
    await this.redis.set(
      `analytics:student:${studentId}:last_activity`,
      Date.now().toString(),
      'EX',
      86400 * 30 // 30 days
    );
  }

  /**
   * Track page view
   */
  async trackPageView(
    studentId: string,
    page: {
      path: string;
      title: string;
      referrer?: string;
      timeOnPage?: number;
    },
    context: EventContext
  ): Promise<void> {
    const event: EngagementEvent = {
      id: createEventId(),
      type: 'page.viewed',
      category: 'engagement',
      timestamp: new Date(),
      studentId,
      tenantId: context.tenantId,
      data: page,
      context: this.buildContext(context),
      metadata: this.buildMetadata(context),
    };

    await this.trackEvent(event);
  }

  /**
   * Track interaction (click, scroll, focus, etc.)
   */
  async trackInteraction(
    studentId: string,
    interaction: {
      type: 'click' | 'hover' | 'scroll' | 'focus' | 'input';
      target: string;
      value?: unknown;
    },
    context: EventContext
  ): Promise<void> {
    // Only track significant interactions to reduce noise
    if (!this.isSignificantInteraction(interaction)) {
      return;
    }

    const event: EngagementEvent = {
      id: createEventId(),
      type: `interaction.${interaction.type}`,
      category: 'engagement',
      timestamp: new Date(),
      studentId,
      tenantId: context.tenantId,
      data: interaction,
      context: this.buildContext(context),
      metadata: this.buildMetadata(context),
    };

    await this.trackEvent(event);
  }

  /**
   * Track video events
   */
  async trackVideoEvent(
    studentId: string,
    action: 'played' | 'paused' | 'completed',
    videoData: {
      videoId: string;
      position: number;
      duration: number;
    },
    context: EventContext
  ): Promise<void> {
    const event: EngagementEvent = {
      id: createEventId(),
      type: `video.${action}`,
      category: 'engagement',
      timestamp: new Date(),
      studentId,
      tenantId: context.tenantId,
      data: videoData,
      context: this.buildContext(context),
      metadata: this.buildMetadata(context),
    };

    await this.trackEvent(event);
  }

  /**
   * Track streak events
   */
  async trackStreak(
    studentId: string,
    action: 'extended' | 'broken',
    streakDays: number,
    context: EventContext
  ): Promise<void> {
    const event: EngagementEvent = {
      id: createEventId(),
      type: `streak.${action}`,
      category: 'engagement',
      timestamp: new Date(),
      studentId,
      tenantId: context.tenantId,
      data: { streakDays },
      context: this.buildContext(context),
      metadata: this.buildMetadata(context),
    };

    await this.trackEvent(event);
  }

  /**
   * Track badge earned
   */
  async trackBadgeEarned(
    studentId: string,
    badgeId: string,
    badgeName: string,
    context: EventContext
  ): Promise<void> {
    const event: EngagementEvent = {
      id: createEventId(),
      type: 'badge.earned',
      category: 'engagement',
      timestamp: new Date(),
      studentId,
      tenantId: context.tenantId,
      data: { badgeId, badgeName },
      context: this.buildContext(context),
      metadata: this.buildMetadata(context),
    };

    await this.trackEvent(event);
  }

  // ============================================================================
  // SYSTEM EVENTS
  // ============================================================================

  /**
   * Track client error
   */
  async trackClientError(
    error: {
      errorCode: string;
      errorMessage: string;
      stackTrace?: string;
      componentName?: string;
    },
    context: EventContext,
    studentId?: string
  ): Promise<void> {
    const event: SystemEvent = {
      id: createEventId(),
      type: 'error.client',
      category: 'system',
      timestamp: new Date(),
      tenantId: context.tenantId,
      studentId,
      data: {
        ...error,
        // Truncate stack trace for storage
        stackTrace: error.stackTrace?.substring(0, 2000),
      },
      context: this.buildContext(context),
      metadata: this.buildMetadata(context),
    };

    await this.trackEvent(event);
  }

  /**
   * Track API latency
   */
  async trackApiLatency(
    endpoint: string,
    latencyMs: number,
    statusCode: number,
    context: EventContext
  ): Promise<void> {
    // Only track slow requests (>500ms) to reduce volume
    if (latencyMs < 500) {
      return;
    }

    const event: SystemEvent = {
      id: createEventId(),
      type: 'performance.api_latency',
      category: 'system',
      timestamp: new Date(),
      tenantId: context.tenantId,
      data: {
        endpoint,
        latencyMs,
        statusCode,
      },
      context: this.buildContext(context),
      metadata: this.buildMetadata(context),
    };

    await this.trackEvent(event);
  }

  /**
   * Track authentication events
   */
  async trackAuthEvent(
    action: 'login' | 'logout' | 'session_expired',
    userId: string,
    authMethod: string,
    context: EventContext
  ): Promise<void> {
    const event: SystemEvent = {
      id: createEventId(),
      type: `auth.${action}`,
      category: 'system',
      timestamp: new Date(),
      tenantId: context.tenantId,
      studentId: userId,
      data: {
        authMethod,
      },
      context: this.buildContext(context),
      metadata: this.buildMetadata(context),
    };

    await this.trackEvent(event);
  }

  // ============================================================================
  // COLLABORATION EVENTS
  // ============================================================================

  /**
   * Track collaboration room events
   */
  async trackCollaborationEvent(
    studentId: string,
    action: 'joined' | 'left',
    roomId: string,
    collaboratorCount: number,
    context: EventContext
  ): Promise<void> {
    const event: CollaborationEvent = {
      id: createEventId(),
      type: `collaboration.${action}`,
      category: 'collaboration',
      timestamp: new Date(),
      studentId,
      tenantId: context.tenantId,
      data: {
        roomId,
        collaboratorCount,
      },
      context: this.buildContext(context),
      metadata: this.buildMetadata(context),
    };

    await this.trackEvent(event);
  }

  // ============================================================================
  // CORE EVENT TRACKING
  // ============================================================================

  /**
   * Track a generic event
   */
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    // Validate event
    const validation = validateEventDetailed(event);
    if (!validation.valid) {
      logger.warn('Invalid analytics event', {
        eventId: event.id,
        errors: validation.errors,
      });
      return;
    }

    // Redact PII if configured
    if (this.config.redactPII) {
      event = this.redactPII(event);
    }

    // Add to buffer
    this.eventBuffer.push(event);

    // Flush if buffer is full
    if (this.eventBuffer.length >= this.config.bufferSize) {
      await this.flushBuffer();
    }

    // Track metrics
    metrics.increment('analytics.events.tracked', {
      type: event.type,
      category: event.category,
    });

    // Update real-time aggregates
    await this.updateRealTimeAggregates(event);
  }

  /**
   * Track batch of events
   */
  async trackEvents(events: AnalyticsEvent[]): Promise<void> {
    for (const event of events) {
      await this.trackEvent(event);
    }
  }

  /**
   * Flush event buffer to Kinesis
   */
  private async flushBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) {
      return;
    }

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      // Prepare records for Kinesis
      const records: PutRecordsRequestEntry[] = events.map((event) => ({
        Data: Buffer.from(JSON.stringify(event)),
        PartitionKey: event.tenantId || event.studentId || 'default',
      }));

      // Kinesis limit is 500 records per batch
      const batches = this.chunkArray(records, 500);

      for (const batch of batches) {
        const command = new PutRecordsCommand({
          StreamName: this.config.kinesisStreamName,
          Records: batch,
        });

        const result = await this.kinesis.send(command);

        // Check for failed records
        if (result.FailedRecordCount && result.FailedRecordCount > 0) {
          logger.warn('Some records failed to write to Kinesis', {
            failedCount: result.FailedRecordCount,
            totalCount: batch.length,
          });
        }
      }

      metrics.increment('analytics.events.flushed', { count: String(events.length) });
      logger.debug(`Flushed ${events.length} analytics events to Kinesis`);
    } catch (error) {
      logger.error('Failed to flush analytics events to Kinesis', { error });

      // Re-add events to buffer for retry (with limit to prevent memory issues)
      if (!this.isShuttingDown && this.eventBuffer.length < 10000) {
        this.eventBuffer.unshift(...events);
      }

      // Persist to fallback storage
      await this.persistToFallback(events);
    }
  }

  /**
   * Persist events to fallback storage (database)
   */
  private async persistToFallback(events: AnalyticsEvent[]): Promise<void> {
    try {
      // @ts-expect-error - Model may not exist yet
      await this.prisma.analyticsEventFallback?.createMany({
        data: events.map((event) => ({
          eventId: event.id,
          eventType: event.type,
          eventData: event as unknown,
          createdAt: event.timestamp,
        })),
      });

      logger.info('Events persisted to fallback storage', {
        count: events.length,
      });
    } catch (error) {
      logger.error('Failed to persist events to fallback storage', { error });
    }
  }

  // ============================================================================
  // REAL-TIME METRICS
  // ============================================================================

  /**
   * Update real-time aggregates in Redis
   */
  private async updateRealTimeAggregates(event: AnalyticsEvent): Promise<void> {
    const now = new Date();
    const hourKey = this.formatDateKey(now, 'hour');
    const dayKey = this.formatDateKey(now, 'day');

    const pipeline = this.redis.pipeline();

    // Hourly event counts (TTL: 7 days)
    pipeline.hincrby(`analytics:hourly:${hourKey}:events`, event.type, 1);
    pipeline.expire(`analytics:hourly:${hourKey}:events`, 86400 * 7);

    // Daily event counts (TTL: 90 days)
    pipeline.hincrby(`analytics:daily:${dayKey}:events`, event.type, 1);
    pipeline.expire(`analytics:daily:${dayKey}:events`, 86400 * 90);

    // Tenant-specific counts (TTL: 30 days)
    if (event.tenantId) {
      pipeline.hincrby(`analytics:tenant:${event.tenantId}:${dayKey}`, event.type, 1);
      pipeline.expire(`analytics:tenant:${event.tenantId}:${dayKey}`, 86400 * 30);
    }

    // Student activity tracking (TTL: 30 days)
    if (event.studentId) {
      pipeline.zadd(
        `analytics:student:${event.studentId}:activity`,
        now.getTime(),
        event.id
      );
      pipeline.expire(`analytics:student:${event.studentId}:activity`, 86400 * 30);
    }

    await pipeline.exec();
  }

  /**
   * Track daily active user
   */
  private async trackDailyActiveUser(
    studentId: string,
    tenantId: string
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    await this.redis
      .pipeline()
      // Global DAU
      .sadd(`analytics:dau:${today}`, studentId)
      .expire(`analytics:dau:${today}`, 86400 * 90)
      // Tenant DAU
      .sadd(`analytics:dau:${tenantId}:${today}`, studentId)
      .expire(`analytics:dau:${tenantId}:${today}`, 86400 * 90)
      .exec();
  }

  /**
   * Update real-time metrics counter
   */
  private async updateRealTimeMetrics(
    metric: string,
    context: EventContext
  ): Promise<void> {
    const minuteKey = Math.floor(Date.now() / 60000);

    await this.redis
      .pipeline()
      .incr(`analytics:realtime:${metric}:${minuteKey}`)
      .expire(`analytics:realtime:${metric}:${minuteKey}`, 3600) // 1 hour TTL
      .exec();
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private buildContext(context: EventContext): Partial<EventContext> {
    return {
      classId: context.classId,
      lessonId: context.lessonId,
      assessmentId: context.assessmentId,
      sessionId: context.sessionId,
    };
  }

  private buildMetadata(context: EventContext): EventMetadata {
    return {
      userAgent: context.userAgent,
      ipAddress: context.ipAddress ? this.hashIpAddress(context.ipAddress) : undefined,
      deviceType: context.deviceType,
      platform: context.platform,
      appVersion: context.appVersion,
      timezone: context.timezone,
      source: 'server',
    };
  }

  private isSignificantInteraction(interaction: {
    type: string;
    target: string;
  }): boolean {
    // Filter out noise - only track meaningful interactions
    const significantTargets = [
      'button',
      'link',
      'input',
      'select',
      'lesson',
      'question',
      'video',
      'submit',
      'next',
      'prev',
      'hint',
      'answer',
    ];

    const target = interaction.target?.toLowerCase() ?? '';
    return significantTargets.some((t) => target.includes(t));
  }

  private hashResponse(response: unknown): string {
    const data = typeof response === 'string' ? response : JSON.stringify(response);
    return createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  private hashIpAddress(ip: string): string {
    return createHash('sha256').update(ip).digest('hex').substring(0, 16);
  }

  private redactPII(event: AnalyticsEvent): AnalyticsEvent {
    return {
      ...event,
      metadata: {
        ...event.metadata,
        ipAddress: event.metadata.ipAddress
          ? this.hashIpAddress(event.metadata.ipAddress)
          : undefined,
        userAgent: undefined, // Remove completely for privacy
      },
    };
  }

  private formatDateKey(date: Date, granularity: 'hour' | 'day'): string {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();

    if (granularity === 'hour') {
      const hour = date.getUTCHours();
      return `${year}:${month}:${day}:${hour}`;
    }

    return `${year}:${month}:${day}`;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
