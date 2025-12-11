/**
 * Integration Service Types
 * 
 * Type definitions for webhooks, API keys, and public APIs.
 */

import { z } from 'zod';

// ══════════════════════════════════════════════════════════════════════════════
// WEBHOOK EVENT TYPES
// ══════════════════════════════════════════════════════════════════════════════

export const WebhookEventTypes = {
  // Session events
  SESSION_STARTED: 'SESSION_STARTED',
  SESSION_COMPLETED: 'SESSION_COMPLETED',
  SESSION_ABANDONED: 'SESSION_ABANDONED',

  // Assessment events
  BASELINE_STARTED: 'BASELINE_STARTED',
  BASELINE_COMPLETED: 'BASELINE_COMPLETED',
  ASSESSMENT_COMPLETED: 'ASSESSMENT_COMPLETED',

  // Learning events
  SKILL_MASTERY_UPDATED: 'SKILL_MASTERY_UPDATED',
  RECOMMENDATION_CREATED: 'RECOMMENDATION_CREATED',
  ACTIVITY_COMPLETED: 'ACTIVITY_COMPLETED',

  // Engagement events
  STREAK_MILESTONE: 'STREAK_MILESTONE',
  ACHIEVEMENT_UNLOCKED: 'ACHIEVEMENT_UNLOCKED',

  // Administrative events
  LEARNER_ENROLLED: 'LEARNER_ENROLLED',
  LEARNER_UNENROLLED: 'LEARNER_UNENROLLED',
} as const;

export type WebhookEventType = keyof typeof WebhookEventTypes;

// ══════════════════════════════════════════════════════════════════════════════
// WEBHOOK PAYLOAD SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

/** Base webhook payload structure */
export const WebhookPayloadBaseSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.string(),
  tenantId: z.string().uuid(),
  timestamp: z.string().datetime(),
  version: z.string().default('1.0'),
});

/** Session completed event payload */
export const SessionCompletedPayloadSchema = WebhookPayloadBaseSchema.extend({
  eventType: z.literal('SESSION_COMPLETED'),
  data: z.object({
    sessionId: z.string().uuid(),
    learnerId: z.string().uuid(),
    subject: z.string(),
    sessionType: z.string(),
    startedAt: z.string().datetime(),
    endedAt: z.string().datetime(),
    durationMinutes: z.number(),
    activitiesCompleted: z.number(),
    activitiesTotal: z.number(),
    averageScore: z.number().optional(),
  }),
});

/** Baseline completed event payload */
export const BaselineCompletedPayloadSchema = WebhookPayloadBaseSchema.extend({
  eventType: z.literal('BASELINE_COMPLETED'),
  data: z.object({
    baselineId: z.string().uuid(),
    learnerId: z.string().uuid(),
    subject: z.string(),
    startedAt: z.string().datetime(),
    completedAt: z.string().datetime(),
    questionsAnswered: z.number(),
    estimatedGradeLevel: z.string().optional(),
  }),
});

/** Skill mastery updated event payload */
export const SkillMasteryUpdatedPayloadSchema = WebhookPayloadBaseSchema.extend({
  eventType: z.literal('SKILL_MASTERY_UPDATED'),
  data: z.object({
    learnerId: z.string().uuid(),
    skillId: z.string(),
    skillName: z.string(),
    subject: z.string(),
    previousMastery: z.number(),
    newMastery: z.number(),
    masteryLevel: z.enum(['NOT_STARTED', 'EMERGING', 'DEVELOPING', 'PROFICIENT', 'MASTERED']),
  }),
});

/** Recommendation created event payload */
export const RecommendationCreatedPayloadSchema = WebhookPayloadBaseSchema.extend({
  eventType: z.literal('RECOMMENDATION_CREATED'),
  data: z.object({
    recommendationId: z.string().uuid(),
    learnerId: z.string().uuid(),
    recommendationType: z.string(),
    subject: z.string().optional(),
    reason: z.string().optional(),
    expiresAt: z.string().datetime().optional(),
  }),
});

/** Activity completed event payload */
export const ActivityCompletedPayloadSchema = WebhookPayloadBaseSchema.extend({
  eventType: z.literal('ACTIVITY_COMPLETED'),
  data: z.object({
    activityId: z.string().uuid(),
    sessionId: z.string().uuid(),
    learnerId: z.string().uuid(),
    activityType: z.string(),
    subject: z.string(),
    score: z.number().optional(),
    timeSpentSeconds: z.number(),
    completedAt: z.string().datetime(),
  }),
});

/** Learner enrolled event payload */
export const LearnerEnrolledPayloadSchema = WebhookPayloadBaseSchema.extend({
  eventType: z.literal('LEARNER_ENROLLED'),
  data: z.object({
    learnerId: z.string().uuid(),
    classroomId: z.string().uuid().optional(),
    schoolId: z.string().uuid().optional(),
    enrolledAt: z.string().datetime(),
    gradeBand: z.string().optional(),
  }),
});

export type WebhookPayload = 
  | z.infer<typeof SessionCompletedPayloadSchema>
  | z.infer<typeof BaselineCompletedPayloadSchema>
  | z.infer<typeof SkillMasteryUpdatedPayloadSchema>
  | z.infer<typeof RecommendationCreatedPayloadSchema>
  | z.infer<typeof ActivityCompletedPayloadSchema>
  | z.infer<typeof LearnerEnrolledPayloadSchema>;

// ══════════════════════════════════════════════════════════════════════════════
// API KEY TYPES
// ══════════════════════════════════════════════════════════════════════════════

export const ApiScopes = {
  READ_LEARNER_PROGRESS: 'READ_LEARNER_PROGRESS',
  READ_SESSION_DATA: 'READ_SESSION_DATA',
  READ_ANALYTICS: 'READ_ANALYTICS',
  WRITE_EXTERNAL_EVENTS: 'WRITE_EXTERNAL_EVENTS',
  WRITE_ENROLLMENTS: 'WRITE_ENROLLMENTS',
  MANAGE_WEBHOOKS: 'MANAGE_WEBHOOKS',
} as const;

export type ApiScope = keyof typeof ApiScopes;

// ══════════════════════════════════════════════════════════════════════════════
// REQUEST/RESPONSE SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

/** Create webhook endpoint request */
export const CreateWebhookEndpointSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  url: z.string().url(),
  eventTypes: z.array(z.nativeEnum(WebhookEventTypes)).min(1),
  filterJson: z.object({
    subjects: z.array(z.string()).optional(),
    grades: z.array(z.string()).optional(),
    classroomIds: z.array(z.string().uuid()).optional(),
  }).optional(),
  enabled: z.boolean().default(true),
});

export type CreateWebhookEndpointRequest = z.infer<typeof CreateWebhookEndpointSchema>;

/** Update webhook endpoint request */
export const UpdateWebhookEndpointSchema = CreateWebhookEndpointSchema.partial();

export type UpdateWebhookEndpointRequest = z.infer<typeof UpdateWebhookEndpointSchema>;

/** Create API key request */
export const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  scopes: z.array(z.nativeEnum(ApiScopes)).min(1),
  expiresAt: z.string().datetime().optional(),
  rateLimitPerMinute: z.number().int().min(1).max(1000).default(60),
  rateLimitPerDay: z.number().int().min(1).max(100000).default(10000),
  allowedIps: z.array(z.string()).optional(),
});

export type CreateApiKeyRequest = z.infer<typeof CreateApiKeySchema>;

/** External learning event request */
export const ExternalLearningEventSchema = z.object({
  learnerId: z.string().uuid(),
  source: z.string().min(1).max(100),
  activityType: z.string().min(1).max(50),
  subject: z.string().optional(),
  topic: z.string().optional(),
  durationMinutes: z.number().int().min(0).optional(),
  score: z.number().min(0).max(100).optional(),
  completed: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
});

export type ExternalLearningEventRequest = z.infer<typeof ExternalLearningEventSchema>;

/** Learner progress response */
export const LearnerProgressResponseSchema = z.object({
  learnerId: z.string().uuid(),
  subjects: z.array(z.object({
    subject: z.string(),
    overallMastery: z.number(),
    skillsCount: z.number(),
    masteredSkills: z.number(),
    lastActivityAt: z.string().datetime().nullable(),
  })),
  engagement: z.object({
    totalSessions: z.number(),
    totalTimeMinutes: z.number(),
    currentStreak: z.number(),
    longestStreak: z.number(),
    averageSessionLength: z.number(),
  }),
  lastUpdated: z.string().datetime(),
});

export type LearnerProgressResponse = z.infer<typeof LearnerProgressResponseSchema>;

/** Session list response */
export const SessionListResponseSchema = z.object({
  sessions: z.array(z.object({
    sessionId: z.string().uuid(),
    sessionType: z.string(),
    subject: z.string(),
    startedAt: z.string().datetime(),
    endedAt: z.string().datetime().nullable(),
    durationMinutes: z.number(),
    activitiesCompleted: z.number(),
    status: z.string(),
  })),
  pagination: z.object({
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    hasMore: z.boolean(),
  }),
});

export type SessionListResponse = z.infer<typeof SessionListResponseSchema>;

// ══════════════════════════════════════════════════════════════════════════════
// WEBHOOK HEADERS
// ══════════════════════════════════════════════════════════════════════════════

export const WEBHOOK_HEADERS = {
  SIGNATURE: 'X-Aivo-Signature',
  EVENT_TYPE: 'X-Aivo-Event',
  TENANT_ID: 'X-Aivo-Tenant',
  DELIVERY_ID: 'X-Aivo-Delivery-Id',
  TIMESTAMP: 'X-Aivo-Timestamp',
} as const;

// ══════════════════════════════════════════════════════════════════════════════
// API KEY HEADER
// ══════════════════════════════════════════════════════════════════════════════

export const API_KEY_HEADER = 'X-Aivo-Api-Key';
export const API_KEY_PREFIX = 'aivo_pk_';
