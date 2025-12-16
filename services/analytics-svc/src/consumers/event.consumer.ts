/**
 * Event Consumer - NATS JetStream consumer for learning events
 *
 * Processes events from various services and stores them in the analytics database.
 * Updates real-time metrics as events arrive.
 */

import type {
  JetStreamClient,
  JetStreamManager,
  NatsConnection,
  JsMsg,
} from 'nats';
import { AckPolicy, RetentionPolicy } from 'nats';

import { prisma } from '../prisma.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Learning event types for analytics - matches all incoming event types */
type LearningEventType =
  | 'SESSION_STARTED'
  | 'SESSION_ENDED'
  | 'SESSION_PAUSED'
  | 'SESSION_RESUMED'
  | 'CONTENT_VIEWED'
  | 'CONTENT_STARTED'
  | 'CONTENT_COMPLETED'
  | 'CONTENT_PROGRESS'
  | 'CONTENT_BOOKMARKED'
  | 'CONTENT_RATED'
  | 'VIDEO_PLAY'
  | 'VIDEO_PAUSE'
  | 'VIDEO_SEEK'
  | 'VIDEO_COMPLETE'
  | 'VIDEO_PLAYED'
  | 'VIDEO_PAUSED'
  | 'VIDEO_COMPLETED'
  | 'VIDEO_SEEKED'
  | 'ASSESSMENT_STARTED'
  | 'ASSESSMENT_COMPLETED'
  | 'ASSESSMENT_SUBMITTED'
  | 'ASSESSMENT_GRADED'
  | 'QUESTION_ANSWERED'
  | 'QUESTION_SKIPPED'
  | 'HINT_USED'
  | 'HINT_REQUESTED'
  | 'EXPLANATION_VIEWED'
  | 'TOPIC_MASTERED'
  | 'MILESTONE_REACHED'
  | 'BADGE_EARNED'
  | 'XP_EARNED'
  | 'STREAK_UPDATED'
  | 'STREAK_CONTINUED'
  | 'STREAK_BROKEN'
  | 'LEVEL_UP'
  | 'ACHIEVEMENT_UNLOCKED'
  | 'GOAL_SET'
  | 'GOAL_PROGRESS'
  | 'GOAL_COMPLETED'
  | 'FOCUS_SESSION_STARTED'
  | 'FOCUS_SESSION_ENDED'
  | 'DISTRACTION_DETECTED'
  | 'BREAK_TAKEN'
  | 'AI_TUTOR_QUERY'
  | 'AI_EXPLANATION_REQUESTED'
  | 'AI_FEEDBACK_RECEIVED'
  | 'AI_RECOMMENDATION_SHOWN'
  | 'AI_RECOMMENDATION_CLICKED'
  | 'SEARCH_PERFORMED'
  | 'RECOMMENDATION_CLICKED'
  | 'LOGIN'
  | 'LOGOUT';

/** Event categories */
type LearningEventCategory =
  | 'LEARNING'
  | 'ASSESSMENT'
  | 'ENGAGEMENT'
  | 'ACHIEVEMENT'
  | 'FOCUS'
  | 'AI_INTERACTION'
  | 'NAVIGATION'
  | 'SYSTEM';

interface IncomingEvent {
  type: string;
  userId: string;
  tenantId: string;
  timestamp: string;
  data: Record<string, unknown>;
  context?: {
    sessionId?: string;
    contentId?: string;
    contentType?: string;
    subjectId?: string;
    topicId?: string;
    assessmentId?: string;
    questionId?: string;
    deviceType?: string;
    platform?: string;
    appVersion?: string;
  };
}

interface EventMapping {
  type: LearningEventType;
  category: LearningEventCategory;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT TYPE MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

const EVENT_TYPE_MAPPING: Record<string, EventMapping> = {
  // Content events
  'content.viewed': { type: 'CONTENT_VIEWED', category: 'LEARNING' },
  'content.started': { type: 'CONTENT_STARTED', category: 'LEARNING' },
  'content.completed': { type: 'CONTENT_COMPLETED', category: 'LEARNING' },
  'content.progress': { type: 'CONTENT_PROGRESS', category: 'LEARNING' },
  'content.bookmarked': { type: 'CONTENT_BOOKMARKED', category: 'LEARNING' },
  'content.rated': { type: 'CONTENT_RATED', category: 'LEARNING' },

  // Video events
  'video.play': { type: 'VIDEO_PLAY', category: 'LEARNING' },
  'video.pause': { type: 'VIDEO_PAUSE', category: 'LEARNING' },
  'video.seek': { type: 'VIDEO_SEEK', category: 'LEARNING' },
  'video.complete': { type: 'VIDEO_COMPLETE', category: 'LEARNING' },

  // Assessment events
  'assessment.attempt.started': { type: 'ASSESSMENT_STARTED', category: 'ASSESSMENT' },
  'assessment.attempt.completed': { type: 'ASSESSMENT_COMPLETED', category: 'ASSESSMENT' },
  'assessment.response.submitted': { type: 'QUESTION_ANSWERED', category: 'ASSESSMENT' },
  'assessment.hint.used': { type: 'HINT_USED', category: 'ASSESSMENT' },

  // Session events
  'session.started': { type: 'SESSION_STARTED', category: 'LEARNING' },
  'session.ended': { type: 'SESSION_ENDED', category: 'LEARNING' },
  'session.paused': { type: 'SESSION_PAUSED', category: 'LEARNING' },
  'session.resumed': { type: 'SESSION_RESUMED', category: 'LEARNING' },

  // Engagement events
  'engagement.xp.earned': { type: 'XP_EARNED', category: 'ENGAGEMENT' },
  'engagement.badge.earned': { type: 'BADGE_EARNED', category: 'ENGAGEMENT' },
  'engagement.streak.updated': { type: 'STREAK_UPDATED', category: 'ENGAGEMENT' },
  'engagement.level.up': { type: 'LEVEL_UP', category: 'ENGAGEMENT' },
  'engagement.achievement.unlocked': { type: 'ACHIEVEMENT_UNLOCKED', category: 'ENGAGEMENT' },

  // AI events
  'ai.tutor.query': { type: 'AI_TUTOR_QUERY', category: 'AI_INTERACTION' },
  'ai.explanation.requested': { type: 'AI_EXPLANATION_REQUESTED', category: 'AI_INTERACTION' },
  'ai.feedback.received': { type: 'AI_FEEDBACK_RECEIVED', category: 'AI_INTERACTION' },

  // Search/Navigation
  'search.performed': { type: 'SEARCH_PERFORMED', category: 'NAVIGATION' },
  'recommendation.clicked': { type: 'RECOMMENDATION_CLICKED', category: 'NAVIGATION' },

  // Auth events
  'auth.user.logged_in': { type: 'LOGIN', category: 'SYSTEM' },
  'auth.user.logged_out': { type: 'LOGOUT', category: 'SYSTEM' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT CONSUMER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class EventConsumer {
  private js: JetStreamClient | null = null;
  private jsm: JetStreamManager | null = null;
  private isRunning = false;

  constructor(
    private readonly nc: NatsConnection,
  ) {}

  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Event consumer is already running');
      return;
    }

    this.js = this.nc.jetstream();
    this.jsm = await this.nc.jetstreamManager();

    // Ensure stream exists
    await this.ensureStream();

    // Start consuming
    await this.startConsumer();

    this.isRunning = true;
    console.log('[EventConsumer] Started consuming learning events');
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    console.log('[EventConsumer] Stopped');
  }

  private async ensureStream(): Promise<void> {
    if (!this.jsm) return;

    const streamName = 'ANALYTICS_EVENTS';
    const subjects = [
      'content.>',
      'video.>',
      'assessment.>',
      'session.>',
      'engagement.>',
      'ai.>',
      'search.>',
      'recommendation.>',
      'auth.user.logged_in',
      'auth.user.logged_out',
    ];

    try {
      await this.jsm.streams.info(streamName);
      console.log(`[EventConsumer] Stream ${streamName} already exists`);
    } catch {
      // Stream doesn't exist, create it
      await this.jsm.streams.add({
        name: streamName,
        subjects,
        retention: RetentionPolicy.Limits,
        max_msgs: 10_000_000,
        max_age: 7 * 24 * 60 * 60 * 1_000_000_000, // 7 days in nanoseconds
        storage: 'file' as unknown as number,
        num_replicas: 1,
      });
      console.log(`[EventConsumer] Created stream ${streamName}`);
    }
  }

  private async startConsumer(): Promise<void> {
    if (!this.js || !this.jsm) return;

    const streamName = 'ANALYTICS_EVENTS';
    const consumerName = 'analytics-processor';

    // Ensure consumer exists
    try {
      await this.jsm.consumers.info(streamName, consumerName);
    } catch {
      await this.jsm.consumers.add(streamName, {
        durable_name: consumerName,
        ack_policy: AckPolicy.Explicit,
        max_deliver: 3,
        ack_wait: 30_000_000_000, // 30 seconds in nanoseconds
      });
    }

    // Get consumer
    const consumer = await this.js.consumers.get(streamName, consumerName);

    // Process messages
    void this.processMessages(consumer);
  }

  private async processMessages(consumer: unknown): Promise<void> {
    // Type assertion for JetStream consumer
    const typedConsumer = consumer as { consume: () => Promise<AsyncIterable<JsMsg>> };
    const messages = await typedConsumer.consume();

    for await (const msg of messages) {
      if (!this.isRunning) break;

      try {
        const event = JSON.parse(new TextDecoder().decode(msg.data)) as IncomingEvent;
        await this.processEvent(event);
        msg.ack();
      } catch (error) {
        console.error('[EventConsumer] Error processing event:', error);
        
        // Check redelivery count
        const deliveryCount = (msg as unknown as { info?: { deliveryCount?: number } }).info?.deliveryCount ?? 1;
        if (deliveryCount >= 3) {
          console.error('[EventConsumer] Max retries reached, terminating message');
          msg.term();
        } else {
          msg.nak();
        }
      }
    }
  }

  private async processEvent(event: IncomingEvent): Promise<void> {
    const mapping = EVENT_TYPE_MAPPING[event.type] as EventMapping | undefined;

    if (!mapping) {
      console.warn(`[EventConsumer] Unknown event type: ${event.type}`);
      return;
    }

    const { type, category } = mapping;
    const context = event.context ?? {};

    // Extract metrics from event data
    const duration = this.extractDuration(event);
    const score = this.extractScore(event);

    // Store raw event
    await prisma.learningEvent.create({
      data: {
        tenantId: event.tenantId,
        userId: event.userId,
        sessionId: context.sessionId ?? null,
        eventType: type,
        eventCategory: category,
        contentId: context.contentId ?? null,
        contentType: context.contentType ?? null,
        subjectId: context.subjectId ?? null,
        topicId: context.topicId ?? null,
        assessmentId: context.assessmentId ?? null,
        questionId: context.questionId ?? null,
        data: event.data,
        duration,
        score,
        deviceType: context.deviceType ?? null,
        platform: context.platform ?? null,
        appVersion: context.appVersion ?? null,
        timestamp: new Date(event.timestamp),
        processedAt: new Date(),
      },
    });

    // Update real-time metrics
    await this.updateRealTimeMetrics(event, type, category, duration, score);
  }

  private extractDuration(event: IncomingEvent): number | null {
    const data = event.data;
    if (typeof data.duration === 'number') return data.duration;
    if (typeof data.timeSpent === 'number') return data.timeSpent;
    if (typeof data.timeSpentSeconds === 'number') return data.timeSpentSeconds;
    return null;
  }

  private extractScore(event: IncomingEvent): number | null {
    const data = event.data;
    if (typeof data.score === 'number') return data.score;
    if (typeof data.percentage === 'number') return data.percentage;
    return null;
  }

  private async updateRealTimeMetrics(
    event: IncomingEvent,
    type: LearningEventType,
    _category: LearningEventCategory,
    duration: number | null,
    score: number | null,
  ): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build update object based on event type
    const updates = this.getMetricUpdates(type, duration, score);

    if (Object.keys(updates).length === 0) return;

    // Update daily user metrics
    await prisma.dailyUserMetrics.upsert({
      where: {
        tenantId_userId_date: {
          tenantId: event.tenantId,
          userId: event.userId,
          date: today,
        },
      },
      create: {
        tenantId: event.tenantId,
        userId: event.userId,
        date: today,
        ...this.getMetricDefaults(type, duration, score),
      },
      update: updates,
    });

    // Update content metrics if applicable
    if (event.context?.contentId) {
      await this.updateContentMetrics(event, type, today, duration);
    }

    // Update topic progress if applicable
    const context = event.context;
    if (context?.topicId && context.subjectId) {
      await this.updateTopicProgress(event, type, duration);
    }
  }

  private getMetricUpdates(
    type: LearningEventType,
    duration: number | null,
    score: number | null,
  ): Record<string, { increment: number }> {
    const updates: Record<string, { increment: number }> = {};

    switch (type) {
      case 'SESSION_STARTED':
        updates.sessionsCount = { increment: 1 };
        break;
      case 'CONTENT_VIEWED':
        updates.contentViewed = { increment: 1 };
        if (duration) updates.totalTimeSeconds = { increment: duration };
        break;
      case 'CONTENT_COMPLETED':
        updates.contentCompleted = { increment: 1 };
        break;
      case 'VIDEO_COMPLETE':
        updates.videosWatched = { increment: 1 };
        if (duration) updates.videoTimeSeconds = { increment: duration };
        break;
      case 'ASSESSMENT_STARTED':
        updates.assessmentsStarted = { increment: 1 };
        break;
      case 'ASSESSMENT_COMPLETED':
        updates.assessmentsCompleted = { increment: 1 };
        break;
      case 'QUESTION_ANSWERED':
        updates.questionsAnswered = { increment: 1 };
        break;
      case 'XP_EARNED':
        updates.xpEarned = { increment: score ?? 0 };
        break;
      case 'BADGE_EARNED':
        updates.badgesEarned = { increment: 1 };
        break;
      case 'AI_TUTOR_QUERY':
      case 'AI_EXPLANATION_REQUESTED':
        updates.aiInteractions = { increment: 1 };
        break;
    }

    if (duration) {
      updates.activeTimeSeconds = { increment: duration };
    }

    return updates;
  }

  private getMetricDefaults(
    type: LearningEventType,
    duration: number | null,
    score: number | null,
  ): Partial<Record<string, number | boolean>> {
    const defaults: Partial<Record<string, number | boolean>> = {
      totalTimeSeconds: 0,
      activeTimeSeconds: duration ?? 0,
      sessionsCount: type === 'SESSION_STARTED' ? 1 : 0,
      contentViewed: type === 'CONTENT_VIEWED' ? 1 : 0,
      contentCompleted: type === 'CONTENT_COMPLETED' ? 1 : 0,
      videosWatched: type === 'VIDEO_COMPLETE' ? 1 : 0,
      videoTimeSeconds: type === 'VIDEO_COMPLETE' && duration ? duration : 0,
      assessmentsStarted: type === 'ASSESSMENT_STARTED' ? 1 : 0,
      assessmentsCompleted: type === 'ASSESSMENT_COMPLETED' ? 1 : 0,
      questionsAnswered: type === 'QUESTION_ANSWERED' ? 1 : 0,
      questionsCorrect: 0,
      xpEarned: type === 'XP_EARNED' ? (score ?? 0) : 0,
      badgesEarned: type === 'BADGE_EARNED' ? 1 : 0,
      aiInteractions: ['AI_TUTOR_QUERY', 'AI_EXPLANATION_REQUESTED'].includes(type) ? 1 : 0,
    };

    return defaults;
  }

  private async updateContentMetrics(
    event: IncomingEvent,
    type: LearningEventType,
    date: Date,
    duration: number | null,
  ): Promise<void> {
    const contentId = event.context?.contentId;
    const contentType = event.context?.contentType ?? 'unknown';

    if (!contentId) return;

    const updates: Record<string, { increment: number }> = {};

    switch (type) {
      case 'CONTENT_VIEWED':
      case 'CONTENT_STARTED':
        updates.views = { increment: 1 };
        break;
      case 'CONTENT_COMPLETED':
        updates.completions = { increment: 1 };
        break;
      case 'CONTENT_BOOKMARKED':
        updates.bookmarks = { increment: 1 };
        break;
      case 'CONTENT_RATED':
        updates.ratings = { increment: 1 };
        break;
      case 'ASSESSMENT_COMPLETED':
        updates.attempts = { increment: 1 };
        break;
    }

    if (duration) {
      updates.totalTimeSeconds = { increment: duration };
    }

    if (Object.keys(updates).length > 0) {
      await prisma.dailyContentMetrics.upsert({
        where: {
          tenantId_contentId_date: {
            tenantId: event.tenantId,
            contentId,
            date,
          },
        },
        create: {
          tenantId: event.tenantId,
          contentId,
          contentType,
          date,
          views: type === 'CONTENT_VIEWED' ? 1 : 0,
          completions: type === 'CONTENT_COMPLETED' ? 1 : 0,
          totalTimeSeconds: duration ?? 0,
        },
        update: updates,
      });
    }
  }

  private async updateTopicProgress(
    event: IncomingEvent,
    type: LearningEventType,
    duration: number | null,
  ): Promise<void> {
    const { userId, tenantId } = event;
    const topicId = event.context?.topicId;
    const subjectId = event.context?.subjectId;

    if (!topicId || !subjectId) return;

    const updates: Record<string, unknown> = {
      lastAccessedAt: new Date(),
    };

    if (duration) {
      updates.totalTimeSeconds = { increment: duration };
    }

    if (type === 'CONTENT_COMPLETED') {
      updates.completedContent = { increment: 1 };
    }

    if (type === 'ASSESSMENT_COMPLETED') {
      updates.assessmentsTaken = { increment: 1 };
    }

    await prisma.topicProgress.upsert({
      where: {
        userId_topicId: { userId, topicId },
      },
      create: {
        tenantId,
        userId,
        subjectId,
        topicId,
        totalTimeSeconds: duration ?? 0,
        completedContent: type === 'CONTENT_COMPLETED' ? 1 : 0,
        assessmentsTaken: type === 'ASSESSMENT_COMPLETED' ? 1 : 0,
        firstAccessedAt: new Date(),
        lastAccessedAt: new Date(),
      },
      update: updates,
    });
  }
}
