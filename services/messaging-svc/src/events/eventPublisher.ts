/**
 * NATS Event Publisher for Messaging
 *
 * Publishes events when messages are sent, read, etc.
 */

import { EventPublisher } from '@aivo/events';
import { config } from '../config.js';

let publisher: EventPublisher | null = null;

export async function initEventPublisher(): Promise<void> {
  if (!config.nats.enabled) {
    console.log('NATS disabled, skipping event publisher');
    return;
  }

  publisher = new EventPublisher({
    natsUrl: config.nats.url,
    clientId: 'messaging-svc',
    stream: 'MESSAGING',
  });

  await publisher.connect();
  console.log('📤 Event publisher initialized');
}

export async function stopEventPublisher(): Promise<void> {
  if (publisher) {
    await publisher.disconnect();
    publisher = null;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EVENT TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface MessageSentEvent {
  tenantId: string;
  conversationId: string;
  messageId: string;
  senderId: string;
  senderName?: string;
  recipientIds: string[];
  content: string;
  createdAt: Date;
}

export interface MessageReadEvent {
  tenantId: string;
  conversationId: string;
  messageId: string;
  readerId: string;
  readAt: Date;
}

export interface ConversationCreatedEvent {
  tenantId: string;
  conversationId: string;
  type: string;
  createdBy: string;
  participantIds: string[];
}

export interface ParticipantAddedEvent {
  tenantId: string;
  conversationId: string;
  userId: string;
  addedBy: string;
}

export interface ParticipantRemovedEvent {
  tenantId: string;
  conversationId: string;
  userId: string;
  removedBy: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// PUBLISH FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

export async function publishMessageSent(event: MessageSentEvent): Promise<void> {
  if (!publisher) return;

  await publisher.publish('message.sent', event);
}

export async function publishMessageRead(event: MessageReadEvent): Promise<void> {
  if (!publisher) return;

  await publisher.publish('message.read', event);
}

export async function publishConversationCreated(event: ConversationCreatedEvent): Promise<void> {
  if (!publisher) return;

  await publisher.publish('conversation.created', event);
}

export async function publishParticipantAdded(event: ParticipantAddedEvent): Promise<void> {
  if (!publisher) return;

  await publisher.publish('participant.added', event);
}

export async function publishParticipantRemoved(event: ParticipantRemovedEvent): Promise<void> {
  if (!publisher) return;

  await publisher.publish('participant.removed', event);
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPER: Trigger notification for message
// ══════════════════════════════════════════════════════════════════════════════

export async function notifyMessageReceived(
  event: MessageSentEvent,
  senderName: string
): Promise<void> {
  if (!publisher) return;

  // For each recipient, publish a message.received event for notify-svc
  for (const recipientId of event.recipientIds) {
    if (recipientId === event.senderId) continue; // Don't notify sender

    await publisher.publish('message.received', {
      tenantId: event.tenantId,
      recipientId,
      senderId: event.senderId,
      senderName,
      conversationId: event.conversationId,
      messagePreview: event.content.substring(0, 100),
    });
  }
}
