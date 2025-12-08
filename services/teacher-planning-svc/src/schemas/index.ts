import { z } from 'zod';

// ══════════════════════════════════════════════════════════════════════════════
// COMMON SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

export const uuidSchema = z.string().uuid();

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

// ══════════════════════════════════════════════════════════════════════════════
// GOAL SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

export const goalDomainSchema = z.enum(['ELA', 'MATH', 'SCIENCE', 'SPEECH', 'SEL', 'OTHER']);
export const goalStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']);
export const progressRatingSchema = z.number().int().min(0).max(4);

export const createGoalSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  domain: goalDomainSchema,
  skillId: uuidSchema.optional(),
  startDate: z.string().datetime().optional(),
  targetDate: z.string().datetime().optional(),
  metadataJson: z.record(z.unknown()).optional(),
});

export const updateGoalSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).nullish(),
  status: goalStatusSchema.optional(),
  targetDate: z.string().datetime().nullish(),
  progressRating: progressRatingSchema.nullish(),
  metadataJson: z.record(z.unknown()).nullish(),
});

export const goalQuerySchema = paginationSchema.extend({
  status: goalStatusSchema.optional(),
  domain: goalDomainSchema.optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// OBJECTIVE SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

export const objectiveStatusSchema = z.enum(['NOT_STARTED', 'IN_PROGRESS', 'MET', 'NOT_MET']);

export const createObjectiveSchema = z.object({
  description: z.string().min(1).max(2000),
  successCriteria: z.string().max(2000).optional(),
  orderIndex: z.number().int().min(0).optional(),
});

export const updateObjectiveSchema = z.object({
  description: z.string().min(1).max(2000).optional(),
  successCriteria: z.string().max(2000).nullish(),
  status: objectiveStatusSchema.optional(),
  progressRating: progressRatingSchema.nullish(),
});

// ══════════════════════════════════════════════════════════════════════════════
// SESSION PLAN SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

export const sessionPlanTypeSchema = z.enum(['LEARNING', 'THERAPY', 'GROUP', 'ASSESSMENT', 'PRACTICE', 'OTHER']);
export const sessionPlanStatusSchema = z.enum(['DRAFT', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);

export const createSessionPlanSchema = z.object({
  sessionType: sessionPlanTypeSchema,
  scheduledFor: z.string().datetime().optional(),
  templateName: z.string().max(200).optional(),
  goalIds: z.array(uuidSchema).optional(),
  estimatedDurationMinutes: z.number().int().positive().max(480).optional(),
  metadataJson: z.record(z.unknown()).optional(),
});

export const updateSessionPlanSchema = z.object({
  status: sessionPlanStatusSchema.optional(),
  scheduledFor: z.string().datetime().nullish(),
  templateName: z.string().max(200).nullish(),
  sessionId: uuidSchema.nullish(),
  estimatedDurationMinutes: z.number().int().positive().max(480).nullish(),
  metadataJson: z.record(z.unknown()).nullish(),
});

export const sessionPlanQuerySchema = paginationSchema.extend({
  status: sessionPlanStatusSchema.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// SESSION PLAN ITEM SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

export const createSessionPlanItemSchema = z.object({
  orderIndex: z.number().int().min(0),
  goalId: uuidSchema.optional(),
  goalObjectiveId: uuidSchema.optional(),
  skillId: uuidSchema.optional(),
  activityType: z.string().min(1).max(100),
  activityDescription: z.string().max(2000).optional(),
  estimatedDurationMinutes: z.number().int().positive().max(480).optional(),
  aiMetadataJson: z.record(z.unknown()).optional(),
});

export const createSessionPlanItemsSchema = z.array(createSessionPlanItemSchema).min(1).max(50);

// ══════════════════════════════════════════════════════════════════════════════
// PROGRESS NOTE SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

export const createProgressNoteSchema = z.object({
  learnerId: uuidSchema,
  sessionId: uuidSchema.optional(),
  sessionPlanId: uuidSchema.optional(),
  goalId: uuidSchema.optional(),
  goalObjectiveId: uuidSchema.optional(),
  noteText: z.string().min(1).max(10000),
  rating: progressRatingSchema.optional(),
  evidenceUri: z.string().url().max(2000).optional(),
});

export const progressNoteQuerySchema = paginationSchema.extend({
  goalId: uuidSchema.optional(),
  sessionId: uuidSchema.optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// PARAM SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

export const learnerIdParamSchema = z.object({
  learnerId: uuidSchema,
});

export const goalIdParamSchema = z.object({
  goalId: uuidSchema,
});

export const objectiveIdParamSchema = z.object({
  objectiveId: uuidSchema,
});

export const planIdParamSchema = z.object({
  planId: uuidSchema,
});
