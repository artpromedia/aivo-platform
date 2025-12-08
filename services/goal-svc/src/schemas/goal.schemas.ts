import { z } from 'zod';

// ══════════════════════════════════════════════════════════════════════════════
// ENUM SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

export const GoalDomainSchema = z.enum(['ELA', 'MATH', 'SCIENCE', 'SPEECH', 'SEL', 'OTHER']);

export const GoalStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']);

export const ObjectiveStatusSchema = z.enum(['NOT_STARTED', 'IN_PROGRESS', 'MET', 'NOT_MET']);

export const SessionPlanTypeSchema = z.enum([
  'LEARNING',
  'THERAPY',
  'GROUP',
  'ASSESSMENT',
  'PRACTICE',
  'OTHER',
]);

export const SessionPlanStatusSchema = z.enum([
  'DRAFT',
  'PLANNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);

export const ProgressRatingSchema = z.number().int().min(0).max(4);

// ══════════════════════════════════════════════════════════════════════════════
// GOAL SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

export const CreateGoalSchema = z.object({
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid(),
  createdByUserId: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  domain: GoalDomainSchema,
  skillId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  targetDate: z.coerce.date().optional(),
  status: GoalStatusSchema.optional(),
  metadataJson: z.record(z.unknown()).optional(),
});

export const UpdateGoalSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).nullable().optional(),
  domain: GoalDomainSchema.optional(),
  skillId: z.string().uuid().nullable().optional(),
  startDate: z.coerce.date().optional(),
  targetDate: z.coerce.date().nullable().optional(),
  status: GoalStatusSchema.optional(),
  progressRating: ProgressRatingSchema.nullable().optional(),
  metadataJson: z.record(z.unknown()).nullable().optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// OBJECTIVE SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

export const CreateObjectiveSchema = z.object({
  goalId: z.string().uuid(),
  description: z.string().min(1).max(2000),
  successCriteria: z.string().max(2000).optional(),
  status: ObjectiveStatusSchema.optional(),
  orderIndex: z.number().int().min(0).optional(),
});

export const UpdateObjectiveSchema = z.object({
  description: z.string().min(1).max(2000).optional(),
  successCriteria: z.string().max(2000).nullable().optional(),
  status: ObjectiveStatusSchema.optional(),
  progressRating: ProgressRatingSchema.nullable().optional(),
  orderIndex: z.number().int().min(0).optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// SESSION PLAN SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

export const CreateSessionPlanItemSchema = z.object({
  orderIndex: z.number().int().min(0).optional(),
  goalId: z.string().uuid().optional(),
  goalObjectiveId: z.string().uuid().optional(),
  skillId: z.string().uuid().optional(),
  activityType: z.string().min(1).max(100),
  activityDescription: z.string().max(2000).optional(),
  estimatedDurationMinutes: z.number().int().min(1).max(480).optional(),
  aiMetadataJson: z.record(z.unknown()).optional(),
});

export const CreateSessionPlanSchema = z.object({
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid(),
  createdByUserId: z.string().uuid(),
  sessionTemplateName: z.string().max(200).optional(),
  scheduledFor: z.coerce.date().optional(),
  estimatedDurationMinutes: z.number().int().min(1).max(480).optional(),
  sessionType: SessionPlanTypeSchema.optional(),
  status: SessionPlanStatusSchema.optional(),
  metadataJson: z.record(z.unknown()).optional(),
  items: z.array(CreateSessionPlanItemSchema).optional(),
});

export const UpdateSessionPlanSchema = z.object({
  sessionTemplateName: z.string().max(200).nullable().optional(),
  scheduledFor: z.coerce.date().nullable().optional(),
  estimatedDurationMinutes: z.number().int().min(1).max(480).nullable().optional(),
  sessionType: SessionPlanTypeSchema.optional(),
  status: SessionPlanStatusSchema.optional(),
  sessionId: z.string().uuid().nullable().optional(),
  metadataJson: z.record(z.unknown()).nullable().optional(),
});

export const UpdateSessionPlanItemSchema = z.object({
  orderIndex: z.number().int().min(0).optional(),
  goalId: z.string().uuid().nullable().optional(),
  goalObjectiveId: z.string().uuid().nullable().optional(),
  skillId: z.string().uuid().nullable().optional(),
  activityType: z.string().min(1).max(100).optional(),
  activityDescription: z.string().max(2000).nullable().optional(),
  estimatedDurationMinutes: z.number().int().min(1).max(480).nullable().optional(),
  aiMetadataJson: z.record(z.unknown()).nullable().optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// PROGRESS NOTE SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

export const CreateProgressNoteSchema = z.object({
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid(),
  createdByUserId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  sessionPlanId: z.string().uuid().optional(),
  goalId: z.string().uuid().optional(),
  goalObjectiveId: z.string().uuid().optional(),
  noteText: z.string().min(1).max(10000),
  rating: ProgressRatingSchema.optional(),
  evidenceUri: z.string().url().max(2000).optional(),
});

export const UpdateProgressNoteSchema = z.object({
  sessionId: z.string().uuid().nullable().optional(),
  sessionPlanId: z.string().uuid().nullable().optional(),
  goalId: z.string().uuid().nullable().optional(),
  goalObjectiveId: z.string().uuid().nullable().optional(),
  noteText: z.string().min(1).max(10000).optional(),
  rating: ProgressRatingSchema.nullable().optional(),
  evidenceUri: z.string().url().max(2000).nullable().optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// QUERY SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

export const GoalFiltersSchema = z.object({
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid().optional(),
  createdByUserId: z.string().uuid().optional(),
  status: z.union([GoalStatusSchema, z.array(GoalStatusSchema)]).optional(),
  domain: z.union([GoalDomainSchema, z.array(GoalDomainSchema)]).optional(),
  skillId: z.string().uuid().optional(),
});

export const SessionPlanFiltersSchema = z.object({
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid().optional(),
  createdByUserId: z.string().uuid().optional(),
  status: z.union([SessionPlanStatusSchema, z.array(SessionPlanStatusSchema)]).optional(),
  sessionType: z.union([SessionPlanTypeSchema, z.array(SessionPlanTypeSchema)]).optional(),
  scheduledFrom: z.coerce.date().optional(),
  scheduledTo: z.coerce.date().optional(),
});

export const ProgressNoteFiltersSchema = z.object({
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid().optional(),
  createdByUserId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  sessionPlanId: z.string().uuid().optional(),
  goalId: z.string().uuid().optional(),
  goalObjectiveId: z.string().uuid().optional(),
  createdFrom: z.coerce.date().optional(),
  createdTo: z.coerce.date().optional(),
});
