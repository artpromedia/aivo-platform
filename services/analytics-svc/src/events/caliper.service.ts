// ══════════════════════════════════════════════════════════════════════════════
// CALIPER ANALYTICS SERVICE
// IMS Global Caliper Analytics 1.2 compliant event generation
// ══════════════════════════════════════════════════════════════════════════════

import { createHash, randomUUID } from 'crypto';
import { Redis } from 'ioredis';

import { logger, metrics } from '@aivo/ts-observability';

// ─── Caliper Event Types ───────────────────────────────────────────────────────

/**
 * Caliper Event Types (IMS Global Caliper 1.2)
 * @see https://www.imsglobal.org/caliper
 */
export const CALIPER_EVENT_TYPES = {
  // Learning Events
  NavigationEvent: 'NavigationEvent',
  ViewEvent: 'ViewEvent',
  AnnotationEvent: 'AnnotationEvent',
  AssessmentEvent: 'AssessmentEvent',
  AssessmentItemEvent: 'AssessmentItemEvent',
  GradeEvent: 'GradeEvent',
  MediaEvent: 'MediaEvent',
  ReadingEvent: 'ReadingEvent',
  SessionEvent: 'SessionEvent',
  // Outcome Events
  OutcomeEvent: 'OutcomeEvent',
  // Forum Events
  ForumEvent: 'ForumEvent',
  MessageEvent: 'MessageEvent',
  ThreadEvent: 'ThreadEvent',
  // Tool Events
  ToolUseEvent: 'ToolUseEvent',
  ToolLaunchEvent: 'ToolLaunchEvent',
  // Resource Events
  ResourceManagementEvent: 'ResourceManagementEvent',
  // Completion
  CompletionEvent: 'CompletionEvent',
} as const;

export type CaliperEventType = keyof typeof CALIPER_EVENT_TYPES;

/**
 * Caliper Actions
 */
export const CALIPER_ACTIONS = {
  // Navigation
  NavigatedTo: 'NavigatedTo',
  // View
  Viewed: 'Viewed',
  // Session
  LoggedIn: 'LoggedIn',
  LoggedOut: 'LoggedOut',
  TimedOut: 'TimedOut',
  // Assessment
  Started: 'Started',
  Paused: 'Paused',
  Resumed: 'Resumed',
  Submitted: 'Submitted',
  Completed: 'Completed',
  // Assessment Item
  Answered: 'Answered',
  Skipped: 'Skipped',
  // Grade
  Graded: 'Graded',
  // Media
  Played: 'Played',
  PausedMedia: 'Paused',
  ResumedMedia: 'Resumed',
  Seeked: 'Seeked',
  Ended: 'Ended',
  // Annotation
  Bookmarked: 'Bookmarked',
  Highlighted: 'Highlighted',
  Tagged: 'Tagged',
  // Forum
  Posted: 'Posted',
  Replied: 'Replied',
  // Resource
  Created: 'Created',
  Updated: 'Updated',
  Deleted: 'Deleted',
  Retrieved: 'Retrieved',
  // Tool
  Used: 'Used',
  Launched: 'Launched',
} as const;

export type CaliperAction = keyof typeof CALIPER_ACTIONS;

/**
 * Caliper Entity Types
 */
export const CALIPER_ENTITY_TYPES = {
  // Agent
  Person: 'Person',
  SoftwareApplication: 'SoftwareApplication',
  Organization: 'Organization',
  CourseSection: 'CourseSection',
  Group: 'Group',
  // Digital Resource
  DigitalResource: 'DigitalResource',
  DigitalResourceCollection: 'DigitalResourceCollection',
  Document: 'Document',
  WebPage: 'WebPage',
  MediaObject: 'MediaObject',
  VideoObject: 'VideoObject',
  AudioObject: 'AudioObject',
  ImageObject: 'ImageObject',
  // Assessment
  Assessment: 'Assessment',
  AssessmentItem: 'AssessmentItem',
  // Learning Objective
  LearningObjective: 'LearningObjective',
  // Result
  Result: 'Result',
  Score: 'Score',
  // Annotation
  Annotation: 'Annotation',
  Bookmark: 'Bookmark',
  Highlight: 'Highlight',
  Tag: 'Tag',
  // Session
  Session: 'Session',
  // Message
  Message: 'Message',
  Thread: 'Thread',
  Forum: 'Forum',
} as const;

export type CaliperEntityType = keyof typeof CALIPER_ENTITY_TYPES;

// ─── Caliper Interfaces ────────────────────────────────────────────────────────

export interface CaliperEntity {
  '@context'?: string;
  '@type': string;
  id: string;
  name?: string;
  description?: string;
  dateCreated?: string;
  dateModified?: string;
  extensions?: Record<string, unknown>;
}

export interface CaliperAgent extends CaliperEntity {
  '@type': 'Person' | 'SoftwareApplication' | 'Organization';
}

export interface CaliperSession extends CaliperEntity {
  '@type': 'Session';
  user?: CaliperAgent;
  dateStarted?: string;
  duration?: string;
}

export interface CaliperDigitalResource extends CaliperEntity {
  '@type': string;
  mediaType?: string;
  isPartOf?: CaliperEntity;
  learningObjectives?: CaliperEntity[];
}

export interface CaliperAssessment extends CaliperDigitalResource {
  '@type': 'Assessment';
  items?: CaliperAssessmentItem[];
  maxScore?: number;
  maxSubmits?: number;
  maxAttempts?: number;
}

export interface CaliperAssessmentItem extends CaliperDigitalResource {
  '@type': 'AssessmentItem';
  isPartOf?: CaliperAssessment;
  maxScore?: number;
  maxAttempts?: number;
}

export interface CaliperResult extends CaliperEntity {
  '@type': 'Result';
  attempt?: CaliperAttempt;
  maxResultScore?: number;
  resultScore?: number;
  comment?: string;
}

export interface CaliperScore extends CaliperEntity {
  '@type': 'Score';
  attempt?: CaliperAttempt;
  maxScore?: number;
  scoreGiven?: number;
  comment?: string;
}

export interface CaliperAttempt extends CaliperEntity {
  '@type': 'Attempt';
  assignee?: CaliperAgent;
  assignable?: CaliperEntity;
  count?: number;
  dateStarted?: string;
  dateEnded?: string;
  duration?: string;
}

export interface CaliperEvent {
  '@context': string;
  '@type': string;
  id: string;
  actor: CaliperAgent;
  action: string;
  object: CaliperEntity;
  generated?: CaliperEntity;
  target?: CaliperEntity;
  eventTime: string;
  edApp?: CaliperAgent;
  group?: CaliperEntity;
  membership?: CaliperEntity;
  session?: CaliperSession;
  federatedSession?: CaliperSession;
  extensions?: Record<string, unknown>;
}

export interface CaliperEnvelope {
  sensor: string;
  sendTime: string;
  dataVersion: string;
  data: CaliperEvent[];
}

// ─── Service Types ─────────────────────────────────────────────────────────────

export interface CaliperServiceConfig {
  endpoint: string;
  apiKey: string;
  sensorId: string;
  dataVersion: string;
  bufferSize: number;
  flushIntervalMs: number;
  enabled: boolean;
}

export interface CaliperEventInput {
  type: CaliperEventType;
  actor: string;
  action?: CaliperAction;
  object: {
    type: CaliperEntityType;
    id: string;
    name?: string;
    description?: string;
    isPartOf?: { id: string; type: CaliperEntityType };
  };
  generated?: {
    score?: number;
    maxScore?: number;
    duration?: number;
    comment?: string;
  };
  target?: {
    type: CaliperEntityType;
    id: string;
    name?: string;
  };
  context?: {
    tenantId: string;
    classId?: string;
    courseId?: string;
    sessionId?: string;
  };
}

const DEFAULT_CONFIG: CaliperServiceConfig = {
  endpoint: process.env['CALIPER_ENDPOINT'] ?? 'http://localhost:8080/caliper',
  apiKey: process.env['CALIPER_API_KEY'] ?? '',
  sensorId: 'https://aivolearning.com/sensor/1',
  dataVersion: 'http://purl.imsglobal.org/ctx/caliper/v1p2',
  bufferSize: 50,
  flushIntervalMs: 10000,
  enabled: true,
};

const CALIPER_CONTEXT = 'http://purl.imsglobal.org/ctx/caliper/v1p2';

// ─── Caliper Service Implementation ────────────────────────────────────────────

export class CaliperService {
  private config: CaliperServiceConfig;
  private eventBuffer: CaliperEvent[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private isShuttingDown = false;

  constructor(
    private readonly redis: Redis,
    config?: Partial<CaliperServiceConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the Caliper service
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('Caliper service is disabled');
      return;
    }

    // Start periodic flush
    this.flushInterval = setInterval(() => {
      void this.flushBuffer();
    }, this.config.flushIntervalMs);

    logger.info('Caliper service initialized', {
      endpoint: this.config.endpoint,
      sensorId: this.config.sensorId,
    });
  }

  /**
   * Shutdown the service gracefully
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    await this.flushBuffer();
    logger.info('Caliper service shutdown complete');
  }

  /**
   * Send a Caliper event
   */
  async sendEvent(input: CaliperEventInput): Promise<string> {
    if (!this.config.enabled) {
      return '';
    }

    const event = this.buildEvent(input);
    this.eventBuffer.push(event);

    // Flush if buffer is full
    if (this.eventBuffer.length >= this.config.bufferSize) {
      await this.flushBuffer();
    }

    metrics.increment('caliper.events.generated', {
      type: input.type,
    });

    return event.id;
  }

  /**
   * Send event immediately (bypass buffer)
   */
  async sendEventImmediate(input: CaliperEventInput): Promise<string> {
    if (!this.config.enabled) {
      return '';
    }

    const event = this.buildEvent(input);
    await this.sendEvents([event]);
    return event.id;
  }

  /**
   * Build a Caliper event from input
   */
  private buildEvent(input: CaliperEventInput): CaliperEvent {
    const eventId = `urn:uuid:${randomUUID()}`;
    const action = input.action ?? this.inferAction(input.type);

    const event: CaliperEvent = {
      '@context': CALIPER_CONTEXT,
      '@type': CALIPER_EVENT_TYPES[input.type],
      id: eventId,
      actor: this.buildActor(input.actor),
      action: CALIPER_ACTIONS[action as CaliperAction] || action,
      object: this.buildObject(input.object),
      eventTime: new Date().toISOString(),
      edApp: this.buildEdApp(),
    };

    // Add generated result if provided
    if (input.generated) {
      event.generated = this.buildGenerated(input.generated, input.actor);
    }

    // Add target if provided
    if (input.target) {
      event.target = this.buildTarget(input.target);
    }

    // Add context-based properties
    if (input.context) {
      if (input.context.classId) {
        event.group = {
          '@type': CALIPER_ENTITY_TYPES.CourseSection,
          id: `urn:aivo:class:${input.context.classId}`,
        };
      }

      if (input.context.sessionId) {
        event.session = {
          '@type': 'Session',
          id: `urn:aivo:session:${input.context.sessionId}`,
          user: event.actor,
        };
      }

      // Add tenant to extensions
      event.extensions = {
        ...event.extensions,
        tenantId: input.context.tenantId,
      };
    }

    return event;
  }

  /**
   * Build actor entity (Person)
   */
  private buildActor(actorId: string): CaliperAgent {
    // Hash for FERPA compliance
    const hashedId = this.hashStudentId(actorId);

    return {
      '@type': 'Person',
      id: `urn:aivo:user:${hashedId}`,
    };
  }

  /**
   * Build edApp (Software Application)
   */
  private buildEdApp(): CaliperAgent {
    return {
      '@type': 'SoftwareApplication',
      id: 'urn:aivo:app:platform',
      name: 'AIVO Learning Platform',
    };
  }

  /**
   * Build object entity
   */
  private buildObject(object: CaliperEventInput['object']): CaliperEntity {
    const entity: CaliperDigitalResource = {
      '@type': CALIPER_ENTITY_TYPES[object.type],
      id: `urn:aivo:${object.type.toLowerCase()}:${object.id}`,
      name: object.name,
      description: object.description,
    };

    if (object.isPartOf) {
      entity.isPartOf = {
        '@type': CALIPER_ENTITY_TYPES[object.isPartOf.type],
        id: `urn:aivo:${object.isPartOf.type.toLowerCase()}:${object.isPartOf.id}`,
      };
    }

    return entity;
  }

  /**
   * Build target entity
   */
  private buildTarget(target: CaliperEventInput['target']): CaliperEntity | undefined {
    if (!target) return undefined;

    return {
      '@type': CALIPER_ENTITY_TYPES[target.type],
      id: `urn:aivo:${target.type.toLowerCase()}:${target.id}`,
      name: target.name,
    };
  }

  /**
   * Build generated result/score entity
   */
  private buildGenerated(
    generated: NonNullable<CaliperEventInput['generated']>,
    actorId: string
  ): CaliperEntity {
    if (generated.score !== undefined) {
      const score: CaliperScore = {
        '@type': 'Score',
        id: `urn:uuid:${randomUUID()}`,
        scoreGiven: generated.score,
        maxScore: generated.maxScore,
        comment: generated.comment,
      };

      return score;
    }

    const result: CaliperResult = {
      '@type': 'Result',
      id: `urn:uuid:${randomUUID()}`,
      comment: generated.comment,
    };

    return result;
  }

  /**
   * Infer action from event type
   */
  private inferAction(type: CaliperEventType): CaliperAction {
    switch (type) {
      case 'NavigationEvent':
        return 'NavigatedTo';
      case 'ViewEvent':
        return 'Viewed';
      case 'SessionEvent':
        return 'LoggedIn';
      case 'AssessmentEvent':
      case 'CompletionEvent':
        return 'Completed';
      case 'AssessmentItemEvent':
        return 'Answered';
      case 'GradeEvent':
        return 'Graded';
      case 'MediaEvent':
        return 'Played';
      case 'ForumEvent':
      case 'MessageEvent':
        return 'Posted';
      case 'ToolUseEvent':
        return 'Used';
      case 'ToolLaunchEvent':
        return 'Launched';
      default:
        return 'Completed';
    }
  }

  /**
   * Hash student ID for privacy
   */
  private hashStudentId(studentId: string): string {
    return createHash('sha256').update(studentId).digest('hex');
  }

  /**
   * Flush event buffer
   */
  private async flushBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) {
      return;
    }

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    await this.sendEvents(events);
  }

  /**
   * Send events to endpoint
   */
  private async sendEvents(events: CaliperEvent[]): Promise<void> {
    if (!this.config.endpoint || !this.config.apiKey) {
      // No endpoint configured - store locally
      await this.storeEventsLocally(events);
      return;
    }

    try {
      const envelope: CaliperEnvelope = {
        sensor: this.config.sensorId,
        sendTime: new Date().toISOString(),
        dataVersion: this.config.dataVersion,
        data: events,
      };

      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(envelope),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Caliper endpoint responded with ${response.status}: ${error}`);
      }

      metrics.increment('caliper.events.sent', { count: String(events.length) });
      logger.debug(`Sent ${events.length} Caliper events`);
    } catch (error) {
      logger.error('Failed to send Caliper events', { error });

      // Re-queue if not shutting down
      if (!this.isShuttingDown) {
        this.eventBuffer.unshift(...events.slice(0, 100));
      }

      // Store locally as fallback
      await this.storeEventsLocally(events);
    }
  }

  /**
   * Store events locally when endpoint is unavailable
   */
  private async storeEventsLocally(events: CaliperEvent[]): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();

      for (const event of events) {
        pipeline.lpush('caliper:pending_events', JSON.stringify(event));
      }

      pipeline.ltrim('caliper:pending_events', 0, 9999);
      pipeline.expire('caliper:pending_events', 86400 * 7);

      await pipeline.exec();
    } catch (error) {
      logger.error('Failed to store Caliper events locally', { error });
    }
  }

  // ============================================================================
  // CONVENIENCE METHODS
  // ============================================================================

  /**
   * Track navigation event
   */
  async trackNavigation(
    studentId: string,
    pageId: string,
    pageName: string,
    context: { tenantId: string; classId?: string }
  ): Promise<void> {
    await this.sendEvent({
      type: 'NavigationEvent',
      actor: studentId,
      action: 'NavigatedTo',
      object: {
        type: 'WebPage',
        id: pageId,
        name: pageName,
      },
      context,
    });
  }

  /**
   * Track view event
   */
  async trackView(
    studentId: string,
    resourceId: string,
    resourceName: string,
    resourceType: CaliperEntityType = 'DigitalResource',
    context: { tenantId: string; classId?: string }
  ): Promise<void> {
    await this.sendEvent({
      type: 'ViewEvent',
      actor: studentId,
      action: 'Viewed',
      object: {
        type: resourceType,
        id: resourceId,
        name: resourceName,
      },
      context,
    });
  }

  /**
   * Track session start
   */
  async trackSessionStart(
    studentId: string,
    sessionId: string,
    context: { tenantId: string }
  ): Promise<void> {
    await this.sendEvent({
      type: 'SessionEvent',
      actor: studentId,
      action: 'LoggedIn',
      object: {
        type: 'SoftwareApplication' as CaliperEntityType,
        id: 'platform',
        name: 'AIVO Platform',
      },
      context: {
        ...context,
        sessionId,
      },
    });
  }

  /**
   * Track session end
   */
  async trackSessionEnd(
    studentId: string,
    sessionId: string,
    context: { tenantId: string }
  ): Promise<void> {
    await this.sendEvent({
      type: 'SessionEvent',
      actor: studentId,
      action: 'LoggedOut',
      object: {
        type: 'SoftwareApplication' as CaliperEntityType,
        id: 'platform',
        name: 'AIVO Platform',
      },
      context: {
        ...context,
        sessionId,
      },
    });
  }

  /**
   * Track assessment started
   */
  async trackAssessmentStarted(
    studentId: string,
    assessmentId: string,
    assessmentName: string,
    context: { tenantId: string; classId?: string }
  ): Promise<void> {
    await this.sendEvent({
      type: 'AssessmentEvent',
      actor: studentId,
      action: 'Started',
      object: {
        type: 'Assessment',
        id: assessmentId,
        name: assessmentName,
      },
      context,
    });
  }

  /**
   * Track assessment submitted
   */
  async trackAssessmentSubmitted(
    studentId: string,
    assessmentId: string,
    assessmentName: string,
    result: { score: number; maxScore: number; duration: number },
    context: { tenantId: string; classId?: string }
  ): Promise<void> {
    await this.sendEvent({
      type: 'AssessmentEvent',
      actor: studentId,
      action: 'Submitted',
      object: {
        type: 'Assessment',
        id: assessmentId,
        name: assessmentName,
      },
      generated: {
        score: result.score,
        maxScore: result.maxScore,
        duration: result.duration,
      },
      context,
    });
  }

  /**
   * Track assessment item answered
   */
  async trackQuestionAnswered(
    studentId: string,
    questionId: string,
    assessmentId: string,
    result: { score: number; maxScore: number },
    context: { tenantId: string }
  ): Promise<void> {
    await this.sendEvent({
      type: 'AssessmentItemEvent',
      actor: studentId,
      action: 'Answered',
      object: {
        type: 'AssessmentItem',
        id: questionId,
        isPartOf: { type: 'Assessment', id: assessmentId },
      },
      generated: {
        score: result.score,
        maxScore: result.maxScore,
      },
      context,
    });
  }

  /**
   * Track media event
   */
  async trackMediaEvent(
    studentId: string,
    mediaId: string,
    mediaName: string,
    action: 'Played' | 'PausedMedia' | 'ResumedMedia' | 'Ended',
    context: { tenantId: string; lessonId?: string }
  ): Promise<void> {
    await this.sendEvent({
      type: 'MediaEvent',
      actor: studentId,
      action: action as CaliperAction,
      object: {
        type: 'VideoObject',
        id: mediaId,
        name: mediaName,
      },
      context,
    });
  }

  /**
   * Track grade event
   */
  async trackGraded(
    studentId: string,
    assessmentId: string,
    assessmentName: string,
    result: { score: number; maxScore: number; comment?: string },
    context: { tenantId: string; classId?: string }
  ): Promise<void> {
    await this.sendEvent({
      type: 'GradeEvent',
      actor: studentId,
      action: 'Graded',
      object: {
        type: 'Assessment',
        id: assessmentId,
        name: assessmentName,
      },
      generated: {
        score: result.score,
        maxScore: result.maxScore,
        comment: result.comment,
      },
      context,
    });
  }

  /**
   * Track completion event
   */
  async trackCompletion(
    studentId: string,
    resourceId: string,
    resourceName: string,
    resourceType: CaliperEntityType = 'DigitalResource',
    result: { score?: number; duration?: number },
    context: { tenantId: string; classId?: string }
  ): Promise<void> {
    await this.sendEvent({
      type: 'CompletionEvent',
      actor: studentId,
      action: 'Completed',
      object: {
        type: resourceType,
        id: resourceId,
        name: resourceName,
      },
      generated: {
        score: result.score,
        duration: result.duration,
      },
      context,
    });
  }

  /**
   * Track tool use
   */
  async trackToolUsed(
    studentId: string,
    toolId: string,
    toolName: string,
    context: { tenantId: string; lessonId?: string }
  ): Promise<void> {
    await this.sendEvent({
      type: 'ToolUseEvent',
      actor: studentId,
      action: 'Used',
      object: {
        type: 'SoftwareApplication' as CaliperEntityType,
        id: toolId,
        name: toolName,
      },
      context,
    });
  }

  /**
   * Track forum post
   */
  async trackForumPost(
    studentId: string,
    messageId: string,
    threadId: string,
    context: { tenantId: string; classId?: string }
  ): Promise<void> {
    await this.sendEvent({
      type: 'MessageEvent',
      actor: studentId,
      action: 'Posted',
      object: {
        type: 'Message',
        id: messageId,
        isPartOf: { type: 'Thread', id: threadId },
      },
      context,
    });
  }
}
