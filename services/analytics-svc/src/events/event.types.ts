// ══════════════════════════════════════════════════════════════════════════════
// ANALYTICS EVENT TYPES
// Comprehensive event schema for learning analytics
// Compliant with FERPA/GDPR data handling requirements
// ══════════════════════════════════════════════════════════════════════════════

// ─── Event Categories ──────────────────────────────────────────────────────────

export type EventCategory =
  | 'learning'
  | 'assessment'
  | 'engagement'
  | 'system'
  | 'collaboration'
  | 'content';

export type LearningEventType =
  | 'lesson.started'
  | 'lesson.completed'
  | 'lesson.paused'
  | 'lesson.resumed'
  | 'lesson.abandoned'
  | 'question.viewed'
  | 'question.answered'
  | 'question.hint_requested'
  | 'question.skipped'
  | 'skill.mastery_changed'
  | 'skill.mastered'
  | 'skill.practiced'
  | 'goal.created'
  | 'goal.completed'
  | 'goal.progress_updated';

export type AssessmentEventType =
  | 'assessment.started'
  | 'assessment.submitted'
  | 'assessment.graded'
  | 'assessment.retake_started'
  | 'assessment.timed_out'
  | 'baseline.started'
  | 'baseline.completed';

export type EngagementEventType =
  | 'session.started'
  | 'session.ended'
  | 'session.heartbeat'
  | 'page.viewed'
  | 'interaction.click'
  | 'interaction.scroll'
  | 'interaction.focus'
  | 'interaction.input'
  | 'video.played'
  | 'video.paused'
  | 'video.completed'
  | 'streak.extended'
  | 'streak.broken'
  | 'badge.earned'
  | 'level.up';

export type SystemEventType =
  | 'error.client'
  | 'error.server'
  | 'performance.slow_load'
  | 'performance.api_latency'
  | 'auth.login'
  | 'auth.logout'
  | 'auth.session_expired';

export type CollaborationEventType =
  | 'collaboration.joined'
  | 'collaboration.left'
  | 'chat.message_sent'
  | 'comment.created'
  | 'comment.resolved';

export type ContentEventType =
  | 'content.created'
  | 'content.published'
  | 'content.updated'
  | 'content.archived';

export type EventType =
  | LearningEventType
  | AssessmentEventType
  | EngagementEventType
  | SystemEventType
  | CollaborationEventType
  | ContentEventType;

// ─── Event Context ─────────────────────────────────────────────────────────────

/**
 * Context information for events
 * Contains identifiers and session information
 */
export interface EventContext {
  /** Tenant/organization ID */
  tenantId: string;
  /** Class ID if applicable */
  classId?: string;
  /** Lesson ID if applicable */
  lessonId?: string;
  /** Assessment ID if applicable */
  assessmentId?: string;
  /** Assignment ID if applicable */
  assignmentId?: string;
  /** Current session ID */
  sessionId?: string;
  /** User agent string */
  userAgent?: string;
  /** IP address (will be hashed for privacy) */
  ipAddress?: string;
  /** Device type */
  deviceType?: 'desktop' | 'tablet' | 'mobile' | 'unknown';
  /** Platform */
  platform?: 'web' | 'ios' | 'android';
  /** App version */
  appVersion?: string;
  /** User timezone */
  timezone?: string;
  /** Screen resolution */
  screenResolution?: string;
  /** Language preference */
  language?: string;
}

/**
 * Metadata for events
 * Contains privacy-safe device and session info
 */
export interface EventMetadata {
  /** Hashed user agent */
  userAgent?: string;
  /** Hashed IP address (privacy-compliant) */
  ipAddress?: string;
  /** Device type */
  deviceType?: string;
  /** Platform */
  platform?: string;
  /** App version */
  appVersion?: string;
  /** User timezone */
  timezone?: string;
  /** Screen resolution */
  screenResolution?: string;
  /** Event source */
  source?: 'client' | 'server' | 'worker';
  /** SDK version */
  sdkVersion?: string;
}

// ─── Base Event ────────────────────────────────────────────────────────────────

/**
 * Base analytics event structure
 */
export interface AnalyticsEvent {
  /** Unique event ID */
  id: string;
  /** Event type */
  type: EventType;
  /** Event category */
  category: EventCategory;
  /** Event timestamp */
  timestamp: Date;
  /** Student/user ID (optional for system events) */
  studentId?: string;
  /** Tenant ID */
  tenantId: string;
  /** Event-specific data */
  data: Record<string, unknown>;
  /** Context information */
  context: Partial<EventContext>;
  /** Metadata */
  metadata: EventMetadata;
}

// ─── Specific Event Types ──────────────────────────────────────────────────────

/**
 * Learning event structure
 */
export interface LearningEvent extends AnalyticsEvent {
  type: LearningEventType;
  category: 'learning';
  studentId: string;
  data: {
    lessonId?: string;
    questionId?: string;
    skillId?: string;
    classId?: string;
    assignmentId?: string;
    score?: number;
    timeSpentSeconds?: number;
    questionsAnswered?: number;
    questionsCorrect?: number;
    masteryGained?: number;
    correct?: boolean;
    attemptNumber?: number;
    responseHash?: string;
    previousLevel?: number;
    newLevel?: number;
    delta?: number;
    source?: 'lesson' | 'assessment' | 'practice';
    [key: string]: unknown;
  };
}

/**
 * Assessment event structure
 */
export interface AssessmentEvent extends AnalyticsEvent {
  type: AssessmentEventType;
  category: 'assessment';
  studentId: string;
  data: {
    assessmentId: string;
    attemptId?: string;
    classId?: string;
    score?: number;
    totalPoints?: number;
    percentageScore?: number;
    timeSpentSeconds?: number;
    questionsAnswered?: number;
    questionsTotal?: number;
    passed?: boolean;
    gradedBy?: 'auto' | 'teacher';
    [key: string]: unknown;
  };
}

/**
 * Engagement event structure
 */
export interface EngagementEvent extends AnalyticsEvent {
  type: EngagementEventType;
  category: 'engagement';
  data: {
    sessionId?: string;
    duration?: number;
    pageViews?: number;
    interactions?: number;
    path?: string;
    title?: string;
    referrer?: string;
    timeOnPage?: number;
    type?: string;
    target?: string;
    value?: unknown;
    videoId?: string;
    position?: number;
    streakDays?: number;
    badgeId?: string;
    newLevel?: number;
    [key: string]: unknown;
  };
}

/**
 * System event structure
 */
export interface SystemEvent extends AnalyticsEvent {
  type: SystemEventType;
  category: 'system';
  data: {
    errorCode?: string;
    errorMessage?: string;
    stackTrace?: string;
    endpoint?: string;
    latencyMs?: number;
    statusCode?: number;
    authMethod?: string;
    [key: string]: unknown;
  };
}

/**
 * Collaboration event structure
 */
export interface CollaborationEvent extends AnalyticsEvent {
  type: CollaborationEventType;
  category: 'collaboration';
  studentId: string;
  data: {
    roomId?: string;
    collaboratorCount?: number;
    messageLength?: number;
    commentId?: string;
    targetType?: string;
    targetId?: string;
    [key: string]: unknown;
  };
}

// ─── Event Validation ──────────────────────────────────────────────────────────

/**
 * Validate an analytics event
 */
export function validateEvent(event: Partial<AnalyticsEvent>): event is AnalyticsEvent {
  return !!(
    event.id &&
    event.type &&
    event.category &&
    event.timestamp &&
    event.tenantId
  );
}

/**
 * Event validation result
 */
export interface EventValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate event with detailed errors
 */
export function validateEventDetailed(event: Partial<AnalyticsEvent>): EventValidationResult {
  const errors: string[] = [];

  if (!event.id) errors.push('Missing event ID');
  if (!event.type) errors.push('Missing event type');
  if (!event.category) errors.push('Missing event category');
  if (!event.timestamp) errors.push('Missing timestamp');
  if (!event.tenantId) errors.push('Missing tenant ID');

  // Learning and assessment events require student ID
  if (
    (event.category === 'learning' || event.category === 'assessment') &&
    !event.studentId
  ) {
    errors.push('Learning and assessment events require student ID');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ─── Event Factory ─────────────────────────────────────────────────────────────

/**
 * Create a new event ID
 */
export function createEventId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 11);
  return `evt_${timestamp}_${random}`;
}

/**
 * Create a base event structure
 */
export function createBaseEvent(
  type: EventType,
  category: EventCategory,
  tenantId: string,
  data: Record<string, unknown>,
  context?: Partial<EventContext>,
  studentId?: string
): AnalyticsEvent {
  return {
    id: createEventId(),
    type,
    category,
    timestamp: new Date(),
    tenantId,
    studentId,
    data,
    context: context ?? {},
    metadata: {
      source: 'server',
    },
  };
}

// ─── Privacy Utilities ─────────────────────────────────────────────────────────

import { createHash } from 'crypto';

/**
 * Hash sensitive data for privacy compliance
 */
export function hashSensitiveData(data: string, salt?: string): string {
  const toHash = salt ? `${data}:${salt}` : data;
  return createHash('sha256').update(toHash).digest('hex').substring(0, 16);
}

/**
 * Anonymize event for export/sharing
 * Removes or hashes PII fields
 */
export function anonymizeEvent(event: AnalyticsEvent): AnalyticsEvent {
  return {
    ...event,
    studentId: event.studentId ? hashSensitiveData(event.studentId) : undefined,
    metadata: {
      ...event.metadata,
      ipAddress: event.metadata.ipAddress
        ? hashSensitiveData(event.metadata.ipAddress)
        : undefined,
      userAgent: undefined, // Remove completely
    },
  };
}

// ─── Time Range Types ──────────────────────────────────────────────────────────

export interface TimeRange {
  startDate?: string | Date;
  endDate?: string | Date;
  period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

export type Aggregation = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'distinct';

// ─── Batch Event Types ─────────────────────────────────────────────────────────

export interface EventBatch {
  events: AnalyticsEvent[];
  batchId: string;
  source: string;
  receivedAt: Date;
}

export interface BatchResult {
  batchId: string;
  processed: number;
  failed: number;
  errors: Array<{ eventId: string; error: string }>;
}
