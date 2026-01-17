/**
 * Event Publisher for Collaboration Service
 * Epic 15: Caregiver Collaboration
 *
 * Publishes events to NATS for cross-service communication.
 */

import { randomUUID } from 'node:crypto';
import {
  COLLABORATION_SUBJECTS,
  type CareTeamMemberAddedEvent,
  type CareTeamMemberUpdatedEvent,
  type CareTeamMemberRemovedEvent,
  type ActionPlanCreatedEvent,
  type ActionPlanUpdatedEvent,
  type ActionPlanStatusChangedEvent,
  type ActionPlanArchivedEvent,
  type TaskCreatedEvent,
  type TaskUpdatedEvent,
  type TaskCompletionRecordedEvent,
  type CareNoteCreatedEvent,
  type CareNoteUpdatedEvent,
  type CareNoteAcknowledgedEvent,
  type CareNoteDeletedEvent,
  type MeetingScheduledEvent,
  type MeetingUpdatedEvent,
  type MeetingStartedEvent,
  type MeetingEndedEvent,
  type MeetingCancelledEvent,
  type CollaborationEvent,
} from './index.js';

// Placeholder for NATS connection - would be imported from @aivo/events
interface NatsConnection {
  publish(subject: string, data: Uint8Array): void;
}

let natsConnection: NatsConnection | null = null;

/**
 * Initialize NATS connection for event publishing
 */
export async function initializeEventPublisher(connection: NatsConnection): Promise<void> {
  natsConnection = connection;
}

/**
 * Publish an event to NATS
 */
async function publishEvent(subject: string, event: CollaborationEvent): Promise<void> {
  if (!natsConnection) {
    console.warn('NATS connection not initialized, event not published:', subject);
    return;
  }

  const data = new TextEncoder().encode(JSON.stringify(event));
  natsConnection.publish(subject, data);
}

/**
 * Create base event properties
 */
function createBaseEvent(
  tenantId: string,
  learnerId: string,
  triggeredByUserId: string
) {
  return {
    eventId: randomUUID(),
    timestamp: new Date(),
    tenantId,
    learnerId,
    triggeredByUserId,
  };
}

// =============================================================================
// CARE TEAM EVENT PUBLISHERS
// =============================================================================

export async function publishCareTeamMemberAdded(
  tenantId: string,
  learnerId: string,
  triggeredByUserId: string,
  payload: CareTeamMemberAddedEvent['payload']
): Promise<void> {
  const event: CareTeamMemberAddedEvent = {
    ...createBaseEvent(tenantId, learnerId, triggeredByUserId),
    type: 'CARE_TEAM_MEMBER_ADDED',
    payload,
  };
  await publishEvent(COLLABORATION_SUBJECTS.CARE_TEAM_MEMBER_ADDED, event);
}

export async function publishCareTeamMemberRemoved(
  tenantId: string,
  learnerId: string,
  triggeredByUserId: string,
  payload: CareTeamMemberRemovedEvent['payload']
): Promise<void> {
  const event: CareTeamMemberRemovedEvent = {
    ...createBaseEvent(tenantId, learnerId, triggeredByUserId),
    type: 'CARE_TEAM_MEMBER_REMOVED',
    payload,
  };
  await publishEvent(COLLABORATION_SUBJECTS.CARE_TEAM_MEMBER_REMOVED, event);
}

// =============================================================================
// ACTION PLAN EVENT PUBLISHERS
// =============================================================================

export async function publishActionPlanCreated(
  tenantId: string,
  learnerId: string,
  triggeredByUserId: string,
  payload: ActionPlanCreatedEvent['payload']
): Promise<void> {
  const event: ActionPlanCreatedEvent = {
    ...createBaseEvent(tenantId, learnerId, triggeredByUserId),
    type: 'ACTION_PLAN_CREATED',
    payload,
  };
  await publishEvent(COLLABORATION_SUBJECTS.ACTION_PLAN_CREATED, event);
}

export async function publishActionPlanStatusChanged(
  tenantId: string,
  learnerId: string,
  triggeredByUserId: string,
  payload: ActionPlanStatusChangedEvent['payload']
): Promise<void> {
  const event: ActionPlanStatusChangedEvent = {
    ...createBaseEvent(tenantId, learnerId, triggeredByUserId),
    type: 'ACTION_PLAN_STATUS_CHANGED',
    payload,
  };
  await publishEvent(COLLABORATION_SUBJECTS.ACTION_PLAN_STATUS_CHANGED, event);
}

// =============================================================================
// TASK EVENT PUBLISHERS
// =============================================================================

export async function publishTaskCreated(
  tenantId: string,
  learnerId: string,
  triggeredByUserId: string,
  payload: TaskCreatedEvent['payload']
): Promise<void> {
  const event: TaskCreatedEvent = {
    ...createBaseEvent(tenantId, learnerId, triggeredByUserId),
    type: 'TASK_CREATED',
    payload,
  };
  await publishEvent(COLLABORATION_SUBJECTS.TASK_CREATED, event);
}

export async function publishTaskCompletionRecorded(
  tenantId: string,
  learnerId: string,
  triggeredByUserId: string,
  payload: TaskCompletionRecordedEvent['payload']
): Promise<void> {
  const event: TaskCompletionRecordedEvent = {
    ...createBaseEvent(tenantId, learnerId, triggeredByUserId),
    type: 'TASK_COMPLETION_RECORDED',
    payload,
  };
  await publishEvent(COLLABORATION_SUBJECTS.TASK_COMPLETION_RECORDED, event);
}

// =============================================================================
// CARE NOTE EVENT PUBLISHERS
// =============================================================================

export async function publishCareNoteCreated(
  tenantId: string,
  learnerId: string,
  triggeredByUserId: string,
  payload: CareNoteCreatedEvent['payload']
): Promise<void> {
  const event: CareNoteCreatedEvent = {
    ...createBaseEvent(tenantId, learnerId, triggeredByUserId),
    type: 'CARE_NOTE_CREATED',
    payload,
  };
  await publishEvent(COLLABORATION_SUBJECTS.CARE_NOTE_CREATED, event);
}

export async function publishCareNoteAcknowledged(
  tenantId: string,
  learnerId: string,
  triggeredByUserId: string,
  payload: CareNoteAcknowledgedEvent['payload']
): Promise<void> {
  const event: CareNoteAcknowledgedEvent = {
    ...createBaseEvent(tenantId, learnerId, triggeredByUserId),
    type: 'CARE_NOTE_ACKNOWLEDGED',
    payload,
  };
  await publishEvent(COLLABORATION_SUBJECTS.CARE_NOTE_ACKNOWLEDGED, event);
}

// =============================================================================
// MEETING EVENT PUBLISHERS
// =============================================================================

export async function publishMeetingScheduled(
  tenantId: string,
  learnerId: string,
  triggeredByUserId: string,
  payload: MeetingScheduledEvent['payload']
): Promise<void> {
  const event: MeetingScheduledEvent = {
    ...createBaseEvent(tenantId, learnerId, triggeredByUserId),
    type: 'MEETING_SCHEDULED',
    payload,
  };
  await publishEvent(COLLABORATION_SUBJECTS.MEETING_SCHEDULED, event);
}

export async function publishMeetingStarted(
  tenantId: string,
  learnerId: string,
  triggeredByUserId: string,
  payload: MeetingStartedEvent['payload']
): Promise<void> {
  const event: MeetingStartedEvent = {
    ...createBaseEvent(tenantId, learnerId, triggeredByUserId),
    type: 'MEETING_STARTED',
    payload,
  };
  await publishEvent(COLLABORATION_SUBJECTS.MEETING_STARTED, event);
}

export async function publishMeetingEnded(
  tenantId: string,
  learnerId: string,
  triggeredByUserId: string,
  payload: MeetingEndedEvent['payload']
): Promise<void> {
  const event: MeetingEndedEvent = {
    ...createBaseEvent(tenantId, learnerId, triggeredByUserId),
    type: 'MEETING_ENDED',
    payload,
  };
  await publishEvent(COLLABORATION_SUBJECTS.MEETING_ENDED, event);
}

export async function publishMeetingCancelled(
  tenantId: string,
  learnerId: string,
  triggeredByUserId: string,
  payload: MeetingCancelledEvent['payload']
): Promise<void> {
  const event: MeetingCancelledEvent = {
    ...createBaseEvent(tenantId, learnerId, triggeredByUserId),
    type: 'MEETING_CANCELLED',
    payload,
  };
  await publishEvent(COLLABORATION_SUBJECTS.MEETING_CANCELLED, event);
}

// =============================================================================
// ADDITIONAL EVENT PUBLISHERS
// =============================================================================

export async function publishCareTeamMemberUpdated(
  tenantId: string,
  learnerId: string,
  triggeredByUserId: string,
  payload: CareTeamMemberUpdatedEvent['payload']
): Promise<void> {
  const event: CareTeamMemberUpdatedEvent = {
    ...createBaseEvent(tenantId, learnerId, triggeredByUserId),
    type: 'CARE_TEAM_MEMBER_UPDATED',
    payload,
  };
  await publishEvent(COLLABORATION_SUBJECTS.CARE_TEAM_MEMBER_UPDATED, event);
}

export async function publishActionPlanUpdated(
  tenantId: string,
  learnerId: string,
  triggeredByUserId: string,
  payload: ActionPlanUpdatedEvent['payload']
): Promise<void> {
  const event: ActionPlanUpdatedEvent = {
    ...createBaseEvent(tenantId, learnerId, triggeredByUserId),
    type: 'ACTION_PLAN_UPDATED',
    payload,
  };
  await publishEvent(COLLABORATION_SUBJECTS.ACTION_PLAN_UPDATED, event);
}

export async function publishActionPlanArchived(
  tenantId: string,
  learnerId: string,
  triggeredByUserId: string,
  payload: ActionPlanArchivedEvent['payload']
): Promise<void> {
  const event: ActionPlanArchivedEvent = {
    ...createBaseEvent(tenantId, learnerId, triggeredByUserId),
    type: 'ACTION_PLAN_ARCHIVED',
    payload,
  };
  await publishEvent(COLLABORATION_SUBJECTS.ACTION_PLAN_ARCHIVED, event);
}

export async function publishTaskUpdated(
  tenantId: string,
  learnerId: string,
  triggeredByUserId: string,
  payload: TaskUpdatedEvent['payload']
): Promise<void> {
  const event: TaskUpdatedEvent = {
    ...createBaseEvent(tenantId, learnerId, triggeredByUserId),
    type: 'TASK_UPDATED',
    payload,
  };
  await publishEvent(COLLABORATION_SUBJECTS.TASK_UPDATED, event);
}

export async function publishCareNoteUpdated(
  tenantId: string,
  learnerId: string,
  triggeredByUserId: string,
  payload: CareNoteUpdatedEvent['payload']
): Promise<void> {
  const event: CareNoteUpdatedEvent = {
    ...createBaseEvent(tenantId, learnerId, triggeredByUserId),
    type: 'CARE_NOTE_UPDATED',
    payload,
  };
  await publishEvent(COLLABORATION_SUBJECTS.CARE_NOTE_UPDATED, event);
}

export async function publishCareNoteDeleted(
  tenantId: string,
  learnerId: string,
  triggeredByUserId: string,
  payload: CareNoteDeletedEvent['payload']
): Promise<void> {
  const event: CareNoteDeletedEvent = {
    ...createBaseEvent(tenantId, learnerId, triggeredByUserId),
    type: 'CARE_NOTE_DELETED',
    payload,
  };
  await publishEvent(COLLABORATION_SUBJECTS.CARE_NOTE_DELETED, event);
}

export async function publishMeetingUpdated(
  tenantId: string,
  learnerId: string,
  triggeredByUserId: string,
  payload: MeetingUpdatedEvent['payload']
): Promise<void> {
  const event: MeetingUpdatedEvent = {
    ...createBaseEvent(tenantId, learnerId, triggeredByUserId),
    type: 'MEETING_UPDATED',
    payload,
  };
  await publishEvent(COLLABORATION_SUBJECTS.MEETING_UPDATED, event);
}
