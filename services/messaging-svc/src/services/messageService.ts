/**
 * Message Service
 *
 * Core business logic for sending and managing messages.
 */

import { prisma, MessageType, MessageStatus, Prisma } from '../prisma.js';
import { config } from '../config.js';
import type { SendMessageInput, EditMessageInput, MessageFilters } from '../types.js';
import * as participantService from './participantService.js';
import * as conversationService from './conversationService.js';
import { scanForPii } from './piiDetectionService.js';
import { moderateContent } from './contentModerationService.js';

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

  // Scan for PII (FERPA/COPPA compliance)
  const piiResult = scanForPii(input.content);
  let metadata = (input.metadata ?? {}) as Record<string, unknown>;

  if (piiResult.hasPii) {
    // Attach PII flags to message metadata for compliance review
    metadata = {
      ...metadata,
      piiDetected: true,
      piiRiskLevel: piiResult.riskLevel,
      piiTypes: piiResult.matches.map((m) => m.type),
      piiMatchCount: piiResult.matches.length,
    };

    // Log PII detection for audit trail
    console.warn(
      `[PII] Detected ${piiResult.matches.length} PII item(s) in message ` +
      `(risk: ${piiResult.riskLevel}, types: ${[...new Set(piiResult.matches.map((m) => m.type))].join(', ')}) ` +
      `tenant=${input.tenantId} sender=${input.senderId} conversation=${input.conversationId}`
    );
  }

  // Content moderation (COPPA/CIPA compliance)
  const moderationResult = moderateContent(input.content);

  if (moderationResult.blocked) {
    throw new Error(moderationResult.reason || 'Message blocked by content moderation');
  }

  if (moderationResult.flagged) {
    metadata = {
      ...metadata,
      contentFlagged: true,
      moderationAction: moderationResult.action,
      moderationCategories: moderationResult.matches.map((m) => m.category),
      moderationReason: moderationResult.reason,
    };
  }

  // Create the message
  const message = await prisma.message.create({
    data: {
      tenantId: input.tenantId,
      conversationId: input.conversationId,
      senderId: input.senderId,
      type: input.type ?? MessageType.TEXT,
      content: input.content,
      metadata: metadata as Prisma.InputJsonValue,
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

/**
 * Full-text message search using PostgreSQL ts_vector / ts_query.
 *
 * Falls back to ILIKE (contains) when the query is very short or
 * if the tsvector column doesn't exist yet (pre-migration).
 *
 * Search is scoped to conversations the user participates in.
 */
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
  if (conversationIds.length === 0) return [];

  // For short queries (< 3 chars) or simple terms, use basic ILIKE
  const trimmed = query.trim();
  if (trimmed.length < 3) {
    return prisma.message.findMany({
      where: {
        tenantId,
        conversationId: { in: conversationIds },
        isDeleted: false,
        content: { contains: trimmed, mode: 'insensitive' },
      },
      include: {
        conversation: {
          select: { id: true, name: true, type: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: pageSize,
    });
  }

  // Attempt PostgreSQL full-text search using to_tsvector / plainto_tsquery
  try {
    const results = await prisma.$queryRawUnsafe<Array<{
      id: string;
      tenantId: string;
      conversationId: string;
      senderId: string;
      type: string;
      content: string;
      status: string;
      createdAt: Date;
      editedAt: Date | null;
      isDeleted: boolean;
      rank: number;
      conversation_id: string;
      conversation_name: string | null;
      conversation_type: string;
    }>>(
      `SELECT m.id, m."tenantId", m."conversationId", m."senderId",
              m.type, m.content, m.status, m."createdAt", m."editedAt", m."isDeleted",
              ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', $1)) AS rank,
              c.id AS conversation_id, c.name AS conversation_name, c.type AS conversation_type
       FROM "Message" m
       JOIN "Conversation" c ON c.id = m."conversationId"
       WHERE m."tenantId" = $2
         AND m."conversationId" = ANY($3::text[])
         AND m."isDeleted" = false
         AND to_tsvector('english', m.content) @@ plainto_tsquery('english', $1)
       ORDER BY rank DESC, m."createdAt" DESC
       LIMIT $4`,
      trimmed,
      tenantId,
      conversationIds,
      pageSize,
    );

    // Transform to match Prisma include format
    return results.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      conversationId: r.conversationId,
      senderId: r.senderId,
      type: r.type,
      content: r.content,
      status: r.status,
      createdAt: r.createdAt,
      editedAt: r.editedAt,
      isDeleted: r.isDeleted,
      conversation: {
        id: r.conversation_id,
        name: r.conversation_name,
        type: r.conversation_type,
      },
    }));
  } catch {
    // Fallback to basic search if full-text search fails
    // (e.g., if to_tsvector isn't available or query syntax issue)
    return prisma.message.findMany({
      where: {
        tenantId,
        conversationId: { in: conversationIds },
        isDeleted: false,
        content: { contains: trimmed, mode: 'insensitive' },
      },
      include: {
        conversation: {
          select: { id: true, name: true, type: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: pageSize,
    });
  }
}
