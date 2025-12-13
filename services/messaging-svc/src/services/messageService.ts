/**
 * Message Service
 *
 * Core business logic for sending and managing messages.
 */

import { prisma, MessageType, MessageStatus } from '../prisma.js';
import { config } from '../config.js';
import type { SendMessageInput, EditMessageInput, MessageFilters } from '../types.js';
import * as participantService from './participantService.js';
import * as conversationService from './conversationService.js';

// ══════════════════════════════════════════════════════════════════════════════
// MESSAGE CRUD
// ══════════════════════════════════════════════════════════════════════════════

export async function sendMessage(input: SendMessageInput) {
  // Validate content length
  if (input.content.length > config.limits.maxMessageLength) {
    throw new Error(`Message exceeds maximum length of ${config.limits.maxMessageLength}`);
  }

  // Check permission
  const canSend = await participantService.canSendMessage(input.conversationId, input.senderId);
  if (!canSend) {
    throw new Error('User is not a participant in this conversation');
  }

  // Create the message
  const message = await prisma.message.create({
    data: {
      tenantId: input.tenantId,
      conversationId: input.conversationId,
      senderId: input.senderId,
      type: input.type ?? MessageType.TEXT,
      content: input.content,
      metadata: input.metadata,
      replyToId: input.replyToId,
      status: MessageStatus.SENT,
    },
    include: {
      replyTo: input.replyToId
        ? {
            select: {
              id: true,
              content: true,
              senderId: true,
            },
          }
        : false,
    },
  });

  // Update conversation stats
  await conversationService.updateConversationStats(input.conversationId, {
    content: input.content,
    createdAt: message.createdAt,
  });

  // Increment unread count for other participants
  await participantService.incrementUnreadCount(input.conversationId, input.senderId);

  return message;
}

export async function getMessageById(id: string, tenantId: string) {
  return prisma.message.findFirst({
    where: { id, tenantId, isDeleted: false },
    include: {
      replyTo: {
        select: {
          id: true,
          content: true,
          senderId: true,
        },
      },
    },
  });
}

export async function listMessages(filters: MessageFilters, pageSize: number = 50) {
  const where: Parameters<typeof prisma.message.findMany>[0]['where'] = {
    conversationId: filters.conversationId,
    tenantId: filters.tenantId,
    isDeleted: false,
  };

  if (filters.senderId) {
    where.senderId = filters.senderId;
  }

  if (filters.type) {
    where.type = filters.type;
  }

  // Cursor-based pagination
  let cursor: { id: string } | undefined;
  if (filters.beforeId) {
    cursor = { id: filters.beforeId };
  }

  const messages = await prisma.message.findMany({
    where,
    include: {
      replyTo: {
        select: {
          id: true,
          content: true,
          senderId: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: pageSize + 1, // Fetch one extra to check hasMore
    ...(cursor && { cursor, skip: 1 }),
  });

  const hasMore = messages.length > pageSize;
  const data = hasMore ? messages.slice(0, -1) : messages;

  return {
    data,
    hasMore,
    nextCursor: hasMore ? data[data.length - 1]?.id : undefined,
  };
}

export async function editMessage(
  messageId: string,
  tenantId: string,
  input: EditMessageInput
) {
  const message = await prisma.message.findFirst({
    where: { id: messageId, tenantId },
  });

  if (!message) {
    throw new Error('Message not found');
  }

  // Only sender can edit
  if (message.senderId !== input.editedBy) {
    throw new Error('Only the sender can edit this message');
  }

  // Validate content length
  if (input.content.length > config.limits.maxMessageLength) {
    throw new Error(`Message exceeds maximum length of ${config.limits.maxMessageLength}`);
  }

  return prisma.message.update({
    where: { id: messageId },
    data: {
      content: input.content,
      isEdited: true,
      editedAt: new Date(),
      originalContent: message.originalContent ?? message.content,
    },
  });
}

export async function deleteMessage(
  messageId: string,
  tenantId: string,
  deletedBy: string
) {
  const message = await prisma.message.findFirst({
    where: { id: messageId, tenantId },
  });

  if (!message) {
    throw new Error('Message not found');
  }

  // Check if user can delete (sender or admin)
  const canDelete =
    message.senderId === deletedBy ||
    (await participantService.canModifyConversation(message.conversationId, deletedBy));

  if (!canDelete) {
    throw new Error('Not authorized to delete this message');
  }

  return prisma.message.update({
    where: { id: messageId },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy,
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// READ RECEIPTS
// ══════════════════════════════════════════════════════════════════════════════

export async function markMessageDelivered(messageId: string, userId: string, tenantId: string) {
  return prisma.readReceipt.upsert({
    where: {
      messageId_userId: { messageId, userId },
    },
    update: {
      deliveredAt: new Date(),
    },
    create: {
      tenantId,
      messageId,
      userId,
      deliveredAt: new Date(),
    },
  });
}

export async function markMessageRead(messageId: string, userId: string, tenantId: string) {
  return prisma.readReceipt.upsert({
    where: {
      messageId_userId: { messageId, userId },
    },
    update: {
      readAt: new Date(),
    },
    create: {
      tenantId,
      messageId,
      userId,
      readAt: new Date(),
    },
  });
}

export async function getReadReceipts(messageId: string) {
  return prisma.readReceipt.findMany({
    where: { messageId },
    orderBy: { readAt: 'desc' },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SEARCH
// ══════════════════════════════════════════════════════════════════════════════

export async function searchMessages(
  tenantId: string,
  userId: string,
  query: string,
  pageSize: number = 20
) {
  // Get conversations user is part of
  const participants = await prisma.participant.findMany({
    where: { tenantId, userId, isActive: true },
    select: { conversationId: true },
  });

  const conversationIds = participants.map((p) => p.conversationId);

  return prisma.message.findMany({
    where: {
      tenantId,
      conversationId: { in: conversationIds },
      isDeleted: false,
      content: { contains: query, mode: 'insensitive' },
    },
    include: {
      conversation: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: pageSize,
  });
}
