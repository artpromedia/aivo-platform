/**
 * Zod Validation Schemas for Collaboration Service
 * Epic 15: Caregiver Collaboration, Shared Action Plans & Messaging 2.0
 *
 * Note: All schemas use non-diagnostic, strengths-based language
 * to support neurodiversity-affirming practices.
 */

import { z } from 'zod';

// =============================================================================
// ENUM SCHEMAS
// =============================================================================

export const CareTeamRoleSchema = z.enum([
  'PARENT',
  'GUARDIAN',
  'TEACHER',
  'SPECIALIST',
  'THERAPIST',
  'COUNSELOR',
  'DISTRICT_ADMIN',
  'CASE_MANAGER',
  'AIDE',
  'OTHER',
]);

export const ActionPlanStatusSchema = z.enum([
  'DRAFT',
  'ACTIVE',
  'ON_HOLD',
  'COMPLETED',
  'ARCHIVED',
]);

export const TaskContextSchema = z.enum([
  'HOME',
  'SCHOOL',
  'THERAPY',
  'COMMUNITY',
  'SHARED',
]);

export const TaskFrequencySchema = z.enum([
  'DAILY',
  'WEEKLY',
  'TWICE_WEEKLY',
  'MONTHLY',
  'AS_NEEDED',
]);

export const TaskCompletionStatusSchema = z.enum([
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETED',
  'SKIPPED',
  'MISSED',
]);

export const CareNoteTypeSchema = z.enum([
  'OBSERVATION',
  'PROGRESS_UPDATE',
  'QUESTION',
  'HOME_UPDATE',
  'SCHOOL_UPDATE',
  'THERAPY_UPDATE',
  'MEETING_NOTES',
  'STRATEGY_FEEDBACK',
  'CELEBRATION',
]);

export const NoteVisibilitySchema = z.enum([
  'TEAM',
  'PARENTS_ONLY',
  'EDUCATORS_ONLY',
  'PRIVATE',
]);

export const MeetingStatusSchema = z.enum([
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'RESCHEDULED',
]);

export const MeetingTypeSchema = z.enum([
  'CHECK_IN',
  'IEP_MEETING',
  'PROGRESS_REVIEW',
  'STRATEGY_SESSION',
  'PARENT_TEACHER',
  'TEAM_MEETING',
  'OTHER',
]);

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type CareTeamRole = z.infer<typeof CareTeamRoleSchema>;
export type ActionPlanStatus = z.infer<typeof ActionPlanStatusSchema>;
export type TaskContext = z.infer<typeof TaskContextSchema>;
export type TaskFrequency = z.infer<typeof TaskFrequencySchema>;
export type TaskCompletionStatus = z.infer<typeof TaskCompletionStatusSchema>;
export type CareNoteType = z.infer<typeof CareNoteTypeSchema>;
export type NoteVisibility = z.infer<typeof NoteVisibilitySchema>;
export type MeetingStatus = z.infer<typeof MeetingStatusSchema>;
export type MeetingType = z.infer<typeof MeetingTypeSchema>;

// =============================================================================
// CARE TEAM MEMBER SCHEMAS
// =============================================================================

export const CreateCareTeamMemberSchema = z.object({
  userId: z.string().uuid(),
  displayName: z.string().min(1).max(255),
  role: CareTeamRoleSchema,
  title: z.string().max(255).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(50).optional(),
  notes: z.string().max(2000).optional(),
});

export const UpdateCareTeamMemberSchema = z.object({
  displayName: z.string().min(1).max(255).optional(),
  role: CareTeamRoleSchema.optional(),
  title: z.string().max(255).nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().max(50).nullable().optional(),
  isActive: z.boolean().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const CareTeamMemberResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid(),
  userId: z.string().uuid(),
  displayName: z.string(),
  role: CareTeamRoleSchema,
  title: z.string().nullable(),
  contactEmail: z.string().nullable(),
  contactPhone: z.string().nullable(),
  isActive: z.boolean(),
  joinedAt: z.coerce.date(),
  leftAt: z.coerce.date().nullable(),
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// =============================================================================
// ACTION PLAN SCHEMAS
// =============================================================================

export const CreateActionPlanSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  status: ActionPlanStatusSchema.default('DRAFT'),
  startDate: z.coerce.date().optional(),
  targetEndDate: z.coerce.date().optional(),
  linkedGoalId: z.string().uuid().optional(),
  linkedProfileId: z.string().uuid().optional(),
  focusAreas: z.array(z.string()).default([]),
});

export const UpdateActionPlanSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).nullable().optional(),
  status: ActionPlanStatusSchema.optional(),
  startDate: z.coerce.date().nullable().optional(),
  targetEndDate: z.coerce.date().nullable().optional(),
  actualEndDate: z.coerce.date().nullable().optional(),
  linkedGoalId: z.string().uuid().nullable().optional(),
  linkedProfileId: z.string().uuid().nullable().optional(),
  focusAreas: z.array(z.string()).optional(),
});

export const ActionPlanResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  status: ActionPlanStatusSchema,
  startDate: z.coerce.date().nullable(),
  targetEndDate: z.coerce.date().nullable(),
  actualEndDate: z.coerce.date().nullable(),
  linkedGoalId: z.string().uuid().nullable(),
  linkedProfileId: z.string().uuid().nullable(),
  focusAreas: z.array(z.string()),
  createdById: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// =============================================================================
// ACTION PLAN TASK SCHEMAS
// =============================================================================

export const TaskSupportsSchema = z.object({
  visualSupport: z.boolean().optional(),
  timerNeeded: z.boolean().optional(),
  checklistSteps: z.array(z.string()).optional(),
  sensoryBreaks: z.boolean().optional(),
  movementBreaks: z.boolean().optional(),
  quietSpace: z.boolean().optional(),
  fidgetTool: z.boolean().optional(),
  socialStory: z.boolean().optional(),
  firstThenBoard: z.boolean().optional(),
  additionalNotes: z.string().optional(),
});

export const CreateActionPlanTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  context: TaskContextSchema,
  frequency: TaskFrequencySchema,
  timeOfDay: z.string().max(100).optional(),
  sortOrder: z.number().int().min(0).default(0),
  assigneeId: z.string().uuid().optional(),
  supports: TaskSupportsSchema.default({}),
  successCriteria: z.string().max(2000).optional(),
  implementationNotes: z.string().max(5000).optional(),
});

export const UpdateActionPlanTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).nullable().optional(),
  context: TaskContextSchema.optional(),
  frequency: TaskFrequencySchema.optional(),
  timeOfDay: z.string().max(100).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  supports: TaskSupportsSchema.optional(),
  successCriteria: z.string().max(2000).nullable().optional(),
  implementationNotes: z.string().max(5000).nullable().optional(),
});

export const ActionPlanTaskResponseSchema = z.object({
  id: z.string().uuid(),
  actionPlanId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  context: TaskContextSchema,
  frequency: TaskFrequencySchema,
  timeOfDay: z.string().nullable(),
  sortOrder: z.number(),
  isActive: z.boolean(),
  assigneeId: z.string().uuid().nullable(),
  supports: TaskSupportsSchema,
  successCriteria: z.string().nullable(),
  implementationNotes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// =============================================================================
// TASK COMPLETION SCHEMAS
// =============================================================================

export const CreateTaskCompletionSchema = z.object({
  dueDate: z.coerce.date(),
  completedAt: z.coerce.date().optional(),
  status: TaskCompletionStatusSchema.default('NOT_STARTED'),
  notes: z.string().max(2000).optional(),
  completedInContext: TaskContextSchema.optional(),
  effectivenessRating: z.number().int().min(1).max(5).optional(),
});

export const UpdateTaskCompletionSchema = z.object({
  completedAt: z.coerce.date().nullable().optional(),
  status: TaskCompletionStatusSchema.optional(),
  notes: z.string().max(2000).nullable().optional(),
  completedInContext: TaskContextSchema.nullable().optional(),
  effectivenessRating: z.number().int().min(1).max(5).nullable().optional(),
});

export const TaskCompletionResponseSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  dueDate: z.coerce.date(),
  completedAt: z.coerce.date().nullable(),
  status: TaskCompletionStatusSchema,
  recordedByUserId: z.string().uuid(),
  notes: z.string().nullable(),
  completedInContext: TaskContextSchema.nullable(),
  effectivenessRating: z.number().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// =============================================================================
// CARE NOTE SCHEMAS
// =============================================================================

export const CreateCareNoteSchema = z.object({
  noteType: CareNoteTypeSchema,
  title: z.string().max(255).optional(),
  content: z.string().min(1).max(10000),
  visibility: NoteVisibilitySchema.default('TEAM'),
  actionPlanId: z.string().uuid().optional(),
  meetingId: z.string().uuid().optional(),
  tags: z.array(z.string()).default([]),
  attachments: z.array(z.object({
    fileId: z.string().uuid(),
    fileName: z.string(),
    fileType: z.string(),
    fileSize: z.number(),
  })).default([]),
  requiresFollowUp: z.boolean().default(false),
});

export const UpdateCareNoteSchema = z.object({
  noteType: CareNoteTypeSchema.optional(),
  title: z.string().max(255).nullable().optional(),
  content: z.string().min(1).max(10000).optional(),
  visibility: NoteVisibilitySchema.optional(),
  actionPlanId: z.string().uuid().nullable().optional(),
  meetingId: z.string().uuid().nullable().optional(),
  tags: z.array(z.string()).optional(),
  attachments: z.array(z.object({
    fileId: z.string().uuid(),
    fileName: z.string(),
    fileType: z.string(),
    fileSize: z.number(),
  })).optional(),
  requiresFollowUp: z.boolean().optional(),
  followUpNotes: z.string().max(5000).nullable().optional(),
});

export const AcknowledgeCareNoteSchema = z.object({
  acknowledge: z.boolean(),
});

export const CareNoteResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid(),
  noteType: CareNoteTypeSchema,
  title: z.string().nullable(),
  content: z.string(),
  visibility: NoteVisibilitySchema,
  authorId: z.string().uuid(),
  actionPlanId: z.string().uuid().nullable(),
  meetingId: z.string().uuid().nullable(),
  tags: z.array(z.string()),
  attachments: z.array(z.object({
    fileId: z.string().uuid(),
    fileName: z.string(),
    fileType: z.string(),
    fileSize: z.number(),
  })),
  isAcknowledged: z.boolean(),
  acknowledgedBy: z.array(z.string().uuid()),
  requiresFollowUp: z.boolean(),
  followUpNotes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// =============================================================================
// MEETING SCHEMAS
// =============================================================================

export const AgendaItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  duration: z.number().int().min(1).optional(), // minutes
  presenter: z.string().uuid().optional(),
  notes: z.string().optional(),
  completed: z.boolean().default(false),
});

export const ActionItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  assigneeId: z.string().uuid(),
  dueDate: z.coerce.date().optional(),
  completed: z.boolean().default(false),
  notes: z.string().optional(),
});

export const CreateCareMeetingSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  meetingType: MeetingTypeSchema,
  scheduledStart: z.coerce.date(),
  scheduledEnd: z.coerce.date(),
  location: z.string().max(500).optional(),
  videoLink: z.string().url().optional(),
  actionPlanId: z.string().uuid().optional(),
  agendaItems: z.array(AgendaItemSchema).default([]),
  participantIds: z.array(z.string().uuid()).min(1),
});

export const UpdateCareMeetingSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).nullable().optional(),
  meetingType: MeetingTypeSchema.optional(),
  status: MeetingStatusSchema.optional(),
  scheduledStart: z.coerce.date().optional(),
  scheduledEnd: z.coerce.date().optional(),
  actualStart: z.coerce.date().nullable().optional(),
  actualEnd: z.coerce.date().nullable().optional(),
  location: z.string().max(500).nullable().optional(),
  videoLink: z.string().url().nullable().optional(),
  actionPlanId: z.string().uuid().nullable().optional(),
  agendaItems: z.array(AgendaItemSchema).optional(),
  summary: z.string().max(10000).nullable().optional(),
  actionItems: z.array(ActionItemSchema).optional(),
});

export const CareMeetingResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  meetingType: MeetingTypeSchema,
  status: MeetingStatusSchema,
  scheduledStart: z.coerce.date(),
  scheduledEnd: z.coerce.date(),
  actualStart: z.coerce.date().nullable(),
  actualEnd: z.coerce.date().nullable(),
  location: z.string().nullable(),
  videoLink: z.string().nullable(),
  actionPlanId: z.string().uuid().nullable(),
  agendaItems: z.array(AgendaItemSchema),
  summary: z.string().nullable(),
  actionItems: z.array(ActionItemSchema),
  organizedByUserId: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// =============================================================================
// MEETING PARTICIPANT SCHEMAS
// =============================================================================

export const UpdateMeetingParticipantSchema = z.object({
  rsvpStatus: z.enum(['ACCEPTED', 'DECLINED', 'TENTATIVE', 'PENDING']).optional(),
  attended: z.boolean().optional(),
  participantNotes: z.string().max(5000).nullable().optional(),
});

export const MeetingParticipantResponseSchema = z.object({
  id: z.string().uuid(),
  meetingId: z.string().uuid(),
  careTeamMemberId: z.string().uuid(),
  rsvpStatus: z.string().nullable(),
  attended: z.boolean().nullable(),
  participantNotes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// =============================================================================
// QUERY PARAMETER SCHEMAS
// =============================================================================

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const CareTeamQuerySchema = PaginationQuerySchema.extend({
  role: CareTeamRoleSchema.optional(),
  isActive: z.coerce.boolean().optional(),
});

export const ActionPlanQuerySchema = PaginationQuerySchema.extend({
  status: ActionPlanStatusSchema.optional(),
  linkedGoalId: z.string().uuid().optional(),
  linkedProfileId: z.string().uuid().optional(),
});

export const ActionPlanTaskQuerySchema = PaginationQuerySchema.extend({
  context: TaskContextSchema.optional(),
  frequency: TaskFrequencySchema.optional(),
  isActive: z.coerce.boolean().optional(),
  assigneeId: z.string().uuid().optional(),
});

export const CareNoteQuerySchema = PaginationQuerySchema.extend({
  noteType: CareNoteTypeSchema.optional(),
  visibility: NoteVisibilitySchema.optional(),
  authorId: z.string().uuid().optional(),
  actionPlanId: z.string().uuid().optional(),
  meetingId: z.string().uuid().optional(),
  requiresFollowUp: z.coerce.boolean().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const CareMeetingQuerySchema = PaginationQuerySchema.extend({
  meetingType: MeetingTypeSchema.optional(),
  status: MeetingStatusSchema.optional(),
  actionPlanId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const TaskCompletionQuerySchema = PaginationQuerySchema.extend({
  status: TaskCompletionStatusSchema.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

// =============================================================================
// PATH PARAMETER SCHEMAS
// =============================================================================

export const LearnerParamsSchema = z.object({
  learnerId: z.string().uuid(),
});

export const CareTeamMemberParamsSchema = z.object({
  learnerId: z.string().uuid(),
  memberId: z.string().uuid(),
});

export const ActionPlanParamsSchema = z.object({
  learnerId: z.string().uuid(),
  planId: z.string().uuid(),
});

export const ActionPlanTaskParamsSchema = z.object({
  learnerId: z.string().uuid(),
  planId: z.string().uuid(),
  taskId: z.string().uuid(),
});

export const TaskCompletionParamsSchema = z.object({
  learnerId: z.string().uuid(),
  planId: z.string().uuid(),
  taskId: z.string().uuid(),
  completionId: z.string().uuid(),
});

export const CareNoteParamsSchema = z.object({
  learnerId: z.string().uuid(),
  noteId: z.string().uuid(),
});

export const CareMeetingParamsSchema = z.object({
  learnerId: z.string().uuid(),
  meetingId: z.string().uuid(),
});

export const MeetingParticipantParamsSchema = z.object({
  learnerId: z.string().uuid(),
  meetingId: z.string().uuid(),
  participantId: z.string().uuid(),
});
