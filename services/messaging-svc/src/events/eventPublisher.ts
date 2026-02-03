/**
 * NATS Event Publisher for Messaging
 *
 * Publishes events when messages are sent, read, etc.
 */

import { NatsTransport } from '@aivo/events';
import { config } from '../config.js';

let publisher: NatsTransport | null = null;

async function publishEvent(
  eventType: string,
  tenantId: string,
  payload: Record<string, unknown>
): Promise<void> {
  if (!publisher) return;

  await publisher.publish({
    tenantId,
    eventType,
    eventVersion: '1.0.0',
    payload,
  });
}

export async function initEventPublisher(): Promise<void> {
  if (!config.nats.enabled) {
    console.log('NATS disabled, skipping event publisher');
    return;
  }

  publisher = new NatsTransport({
    servers: config.nats.url,
    serviceName: 'messaging-svc',
    serviceVersion: process.env.SERVICE_VERSION ?? '0.1.0',
    name: 'messaging-svc',
  });

  await publisher.connect();
  console.log('📤 Event publisher initialized');
}

export async function stopEventPublisher(): Promise<void> {
  if (publisher) {
    await publisher.close();
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

  const { tenantId, ...payload } = event;
  await publishEvent('message.sent', tenantId, payload);
}

export async function publishMessageRead(event: MessageReadEvent): Promise<void> {
  if (!publisher) return;

  const { tenantId, ...payload } = event;
  await publishEvent('message.read', tenantId, payload);
}

export async function publishConversationCreated(event: ConversationCreatedEvent): Promise<void> {
  if (!publisher) return;

  const { tenantId, ...payload } = event;
  await publishEvent('conversation.created', tenantId, payload);
}

export async function publishParticipantAdded(event: ParticipantAddedEvent): Promise<void> {
  if (!publisher) return;

  const { tenantId, ...payload } = event;
  await publishEvent('participant.added', tenantId, payload);
}

export async function publishParticipantRemoved(event: ParticipantRemovedEvent): Promise<void> {
  if (!publisher) return;

  const { tenantId, ...payload } = event;
  await publishEvent('participant.removed', tenantId, payload);
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

    await publishEvent('message.received', event.tenantId, {
      recipientId,
      senderId: event.senderId,
      senderName,
      conversationId: event.conversationId,
      messagePreview: event.content.substring(0, 100),
    });
  }
}
