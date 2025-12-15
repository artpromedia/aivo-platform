/**
 * NATS Event Definitions for Collaboration Service
 * Epic 15: Caregiver Collaboration
 *
 * Events published by the collaboration service for cross-service communication.
 */

import { z } from 'zod';
import {
  CareTeamRoleSchema,
  ActionPlanStatusSchema,
  TaskContextSchema,
  TaskFrequencySchema,
  CareNoteTypeSchema,
  NoteVisibilitySchema,
  MeetingTypeSchema,
} from '../schemas/index.js';

// =============================================================================
// EVENT SUBJECTS (NATS Topics)
// =============================================================================

export const COLLABORATION_SUBJECTS = {
  // Care Team Events
  CARE_TEAM_MEMBER_ADDED: 'collaboration.careteam.member.added',
  CARE_TEAM_MEMBER_UPDATED: 'collaboration.careteam.member.updated',
  CARE_TEAM_MEMBER_REMOVED: 'collaboration.careteam.member.removed',

  // Action Plan Events
  ACTION_PLAN_CREATED: 'collaboration.actionplan.created',
  ACTION_PLAN_UPDATED: 'collaboration.actionplan.updated',
  ACTION_PLAN_STATUS_CHANGED: 'collaboration.actionplan.status.changed',
  ACTION_PLAN_ARCHIVED: 'collaboration.actionplan.archived',

  // Task Events
  TASK_CREATED: 'collaboration.task.created',
  TASK_UPDATED: 'collaboration.task.updated',
  TASK_COMPLETED: 'collaboration.task.completed',
  TASK_COMPLETION_RECORDED: 'collaboration.task.completion.recorded',

  // Care Note Events
  CARE_NOTE_CREATED: 'collaboration.note.created',
  CARE_NOTE_UPDATED: 'collaboration.note.updated',
  CARE_NOTE_ACKNOWLEDGED: 'collaboration.note.acknowledged',
  CARE_NOTE_DELETED: 'collaboration.note.deleted',

  // Meeting Events
  MEETING_SCHEDULED: 'collaboration.meeting.scheduled',
  MEETING_UPDATED: 'collaboration.meeting.updated',
  MEETING_STARTED: 'collaboration.meeting.started',
  MEETING_ENDED: 'collaboration.meeting.ended',
  MEETING_CANCELLED: 'collaboration.meeting.cancelled',
  MEETING_RSVP_UPDATED: 'collaboration.meeting.rsvp.updated',
} as const;

// =============================================================================
// BASE EVENT SCHEMA
// =============================================================================

const BaseEventSchema = z.object({
  eventId: z.string().uuid(),
  timestamp: z.coerce.date(),
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid(),
  triggeredByUserId: z.string().uuid(),
});

// =============================================================================
// CARE TEAM EVENTS
// =============================================================================

export const CareTeamMemberAddedEventSchema = BaseEventSchema.extend({
  type: z.literal('CARE_TEAM_MEMBER_ADDED'),
  payload: z.object({
    memberId: z.string().uuid(),
    userId: z.string().uuid(),
    displayName: z.string(),
    role: CareTeamRoleSchema,
    title: z.string().nullable(),
    addedByUserId: z.string().uuid(),
  }),
});

export const CareTeamMemberUpdatedEventSchema = BaseEventSchema.extend({
  type: z.literal('CARE_TEAM_MEMBER_UPDATED'),
  payload: z.object({
    memberId: z.string().uuid(),
    changes: z.record(z.unknown()),
    previousValues: z.record(z.unknown()),
  }),
});

export const CareTeamMemberRemovedEventSchema = BaseEventSchema.extend({
  type: z.literal('CARE_TEAM_MEMBER_REMOVED'),
  payload: z.object({
    memberId: z.string().uuid(),
    userId: z.string().uuid(),
    displayName: z.string(),
    role: CareTeamRoleSchema,
  }),
});

// =============================================================================
// ACTION PLAN EVENTS
// =============================================================================

export const ActionPlanCreatedEventSchema = BaseEventSchema.extend({
  type: z.literal('ACTION_PLAN_CREATED'),
  payload: z.object({
    planId: z.string().uuid(),
    title: z.string(),
    status: ActionPlanStatusSchema,
    linkedGoalId: z.string().uuid().nullable(),
    linkedProfileId: z.string().uuid().nullable(),
    focusAreas: z.array(z.string()),
    createdById: z.string().uuid(),
  }),
});

export const ActionPlanUpdatedEventSchema = BaseEventSchema.extend({
  type: z.literal('ACTION_PLAN_UPDATED'),
  payload: z.object({
    planId: z.string().uuid(),
    changes: z.record(z.unknown()),
    previousValues: z.record(z.unknown()),
  }),
});

export const ActionPlanStatusChangedEventSchema = BaseEventSchema.extend({
  type: z.literal('ACTION_PLAN_STATUS_CHANGED'),
  payload: z.object({
    planId: z.string().uuid(),
    title: z.string(),
    previousStatus: ActionPlanStatusSchema,
    newStatus: ActionPlanStatusSchema,
  }),
});

export const ActionPlanArchivedEventSchema = BaseEventSchema.extend({
  type: z.literal('ACTION_PLAN_ARCHIVED'),
  payload: z.object({
    planId: z.string().uuid(),
    title: z.string(),
    previousStatus: ActionPlanStatusSchema,
  }),
});

// =============================================================================
// TASK EVENTS
// =============================================================================

export const TaskCreatedEventSchema = BaseEventSchema.extend({
  type: z.literal('TASK_CREATED'),
  payload: z.object({
    taskId: z.string().uuid(),
    actionPlanId: z.string().uuid(),
    title: z.string(),
    context: TaskContextSchema,
    frequency: TaskFrequencySchema,
    assigneeId: z.string().uuid().nullable(),
  }),
});

export const TaskUpdatedEventSchema = BaseEventSchema.extend({
  type: z.literal('TASK_UPDATED'),
  payload: z.object({
    taskId: z.string().uuid(),
    actionPlanId: z.string().uuid(),
    changes: z.record(z.unknown()),
  }),
});

export const TaskCompletionRecordedEventSchema = BaseEventSchema.extend({
  type: z.literal('TASK_COMPLETION_RECORDED'),
  payload: z.object({
    completionId: z.string().uuid(),
    taskId: z.string().uuid(),
    actionPlanId: z.string().uuid(),
    status: z.string(),
    completedAt: z.coerce.date().nullable(),
    effectivenessRating: z.number().nullable(),
    context: TaskContextSchema.nullable(),
  }),
});

// =============================================================================
// CARE NOTE EVENTS
// =============================================================================

export const CareNoteCreatedEventSchema = BaseEventSchema.extend({
  type: z.literal('CARE_NOTE_CREATED'),
  payload: z.object({
    noteId: z.string().uuid(),
    noteType: CareNoteTypeSchema,
    title: z.string().nullable(),
    visibility: NoteVisibilitySchema,
    authorId: z.string().uuid(),
    authorName: z.string(),
    actionPlanId: z.string().uuid().nullable(),
    meetingId: z.string().uuid().nullable(),
    requiresFollowUp: z.boolean(),
    tags: z.array(z.string()),
  }),
});

export const CareNoteUpdatedEventSchema = BaseEventSchema.extend({
  type: z.literal('CARE_NOTE_UPDATED'),
  payload: z.object({
    noteId: z.string().uuid(),
    changes: z.record(z.unknown()),
  }),
});

export const CareNoteAcknowledgedEventSchema = BaseEventSchema.extend({
  type: z.literal('CARE_NOTE_ACKNOWLEDGED'),
  payload: z.object({
    noteId: z.string().uuid(),
    acknowledgedByUserId: z.string().uuid(),
    totalAcknowledgements: z.number(),
  }),
});

export const CareNoteDeletedEventSchema = BaseEventSchema.extend({
  type: z.literal('CARE_NOTE_DELETED'),
  payload: z.object({
    noteId: z.string().uuid(),
    noteType: CareNoteTypeSchema,
    authorId: z.string().uuid(),
  }),
});

// =============================================================================
// MEETING EVENTS
// =============================================================================

export const MeetingScheduledEventSchema = BaseEventSchema.extend({
  type: z.literal('MEETING_SCHEDULED'),
  payload: z.object({
    meetingId: z.string().uuid(),
    title: z.string(),
    meetingType: MeetingTypeSchema,
    scheduledStart: z.coerce.date(),
    scheduledEnd: z.coerce.date(),
    location: z.string().nullable(),
    videoLink: z.string().nullable(),
    actionPlanId: z.string().uuid().nullable(),
    participantIds: z.array(z.string().uuid()),
    organizerUserId: z.string().uuid(),
  }),
});

export const MeetingUpdatedEventSchema = BaseEventSchema.extend({
  type: z.literal('MEETING_UPDATED'),
  payload: z.object({
    meetingId: z.string().uuid(),
    changes: z.record(z.unknown()),
    previousScheduledStart: z.coerce.date().optional(),
    newScheduledStart: z.coerce.date().optional(),
  }),
});

export const MeetingStartedEventSchema = BaseEventSchema.extend({
  type: z.literal('MEETING_STARTED'),
  payload: z.object({
    meetingId: z.string().uuid(),
    title: z.string(),
    actualStart: z.coerce.date(),
    participantCount: z.number(),
  }),
});

export const MeetingEndedEventSchema = BaseEventSchema.extend({
  type: z.literal('MEETING_ENDED'),
  payload: z.object({
    meetingId: z.string().uuid(),
    title: z.string(),
    actualEnd: z.coerce.date(),
    durationMinutes: z.number(),
    attendeeCount: z.number(),
  }),
});

export const MeetingCancelledEventSchema = BaseEventSchema.extend({
  type: z.literal('MEETING_CANCELLED'),
  payload: z.object({
    meetingId: z.string().uuid(),
    title: z.string(),
    scheduledStart: z.coerce.date(),
    participantIds: z.array(z.string().uuid()),
  }),
});

export const MeetingRsvpUpdatedEventSchema = BaseEventSchema.extend({
  type: z.literal('MEETING_RSVP_UPDATED'),
  payload: z.object({
    meetingId: z.string().uuid(),
    participantId: z.string().uuid(),
    careTeamMemberId: z.string().uuid(),
    rsvpStatus: z.enum(['ACCEPTED', 'DECLINED', 'TENTATIVE', 'PENDING']),
  }),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type CareTeamMemberAddedEvent = z.infer<typeof CareTeamMemberAddedEventSchema>;
export type CareTeamMemberUpdatedEvent = z.infer<typeof CareTeamMemberUpdatedEventSchema>;
export type CareTeamMemberRemovedEvent = z.infer<typeof CareTeamMemberRemovedEventSchema>;

export type ActionPlanCreatedEvent = z.infer<typeof ActionPlanCreatedEventSchema>;
export type ActionPlanUpdatedEvent = z.infer<typeof ActionPlanUpdatedEventSchema>;
export type ActionPlanStatusChangedEvent = z.infer<typeof ActionPlanStatusChangedEventSchema>;
export type ActionPlanArchivedEvent = z.infer<typeof ActionPlanArchivedEventSchema>;

export type TaskCreatedEvent = z.infer<typeof TaskCreatedEventSchema>;
export type TaskUpdatedEvent = z.infer<typeof TaskUpdatedEventSchema>;
export type TaskCompletionRecordedEvent = z.infer<typeof TaskCompletionRecordedEventSchema>;

export type CareNoteCreatedEvent = z.infer<typeof CareNoteCreatedEventSchema>;
export type CareNoteUpdatedEvent = z.infer<typeof CareNoteUpdatedEventSchema>;
export type CareNoteAcknowledgedEvent = z.infer<typeof CareNoteAcknowledgedEventSchema>;
export type CareNoteDeletedEvent = z.infer<typeof CareNoteDeletedEventSchema>;

export type MeetingScheduledEvent = z.infer<typeof MeetingScheduledEventSchema>;
export type MeetingUpdatedEvent = z.infer<typeof MeetingUpdatedEventSchema>;
export type MeetingStartedEvent = z.infer<typeof MeetingStartedEventSchema>;
export type MeetingEndedEvent = z.infer<typeof MeetingEndedEventSchema>;
export type MeetingCancelledEvent = z.infer<typeof MeetingCancelledEventSchema>;
export type MeetingRsvpUpdatedEvent = z.infer<typeof MeetingRsvpUpdatedEventSchema>;

// Union type of all collaboration events
export type CollaborationEvent =
  | CareTeamMemberAddedEvent
  | CareTeamMemberUpdatedEvent
  | CareTeamMemberRemovedEvent
  | ActionPlanCreatedEvent
  | ActionPlanUpdatedEvent
  | ActionPlanStatusChangedEvent
  | ActionPlanArchivedEvent
  | TaskCreatedEvent
  | TaskUpdatedEvent
  | TaskCompletionRecordedEvent
  | CareNoteCreatedEvent
  | CareNoteUpdatedEvent
  | CareNoteAcknowledgedEvent
  | CareNoteDeletedEvent
  | MeetingScheduledEvent
  | MeetingUpdatedEvent
  | MeetingStartedEvent
  | MeetingEndedEvent
  | MeetingCancelledEvent
  | MeetingRsvpUpdatedEvent;
