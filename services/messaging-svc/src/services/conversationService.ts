/**
 * Conversation Service
 *
 * Core business logic for managing conversations.
 */

import { prisma, ConversationType, ParticipantRole, ContextType } from '../prisma.js';
import type {
  CreateConversationInput,
  UpdateConversationInput,
  ConversationFilters,
  PaginationOptions,
} from '../types.js';

// ══════════════════════════════════════════════════════════════════════════════
// CONVERSATION CRUD
// ══════════════════════════════════════════════════════════════════════════════

export async function createConversation(input: CreateConversationInput) {
  const { participantIds, ...conversationData } = input;

  // Ensure creator is included in participants
  const allParticipantIds = [...new Set([input.createdBy, ...participantIds])];

  const conversation = await prisma.conversation.create({
    data: {
      tenantId: conversationData.tenantId,
      type: conversationData.type ?? ConversationType.DIRECT,
      name: conversationData.name,
      description: conversationData.description,
      avatarUrl: conversationData.avatarUrl,
      contextType: conversationData.contextType,
      contextId: conversationData.contextId,
      contextLearnerId: conversationData.contextLearnerId,
      contextActionPlanId: conversationData.contextActionPlanId,
      contextMeetingId: conversationData.contextMeetingId,
      createdBy: conversationData.createdBy,
      participants: {
        create: allParticipantIds.map((userId, index) => ({
          tenantId: conversationData.tenantId,
          userId,
          role: userId === input.createdBy ? ParticipantRole.OWNER : ParticipantRole.MEMBER,
        })),
      },
    },
    include: {
      participants: true,
    },
  });

  return conversation;
}

export async function getConversationById(id: string, tenantId: string) {
  return prisma.conversation.findFirst({
    where: { id, tenantId },
    include: {
      participants: {
        where: { isActive: true },
      },
    },
  });
}

export async function listConversations(
  filters: ConversationFilters,
  pagination: PaginationOptions = {}
) {
  const { page = 1, pageSize = 20 } = pagination;
  const skip = (page - 1) * pageSize;

  // First get conversation IDs where user is a participant
  const participantConversations = await prisma.participant.findMany({
    where: {
      tenantId: filters.tenantId,
      userId: filters.userId,
      isActive: true,
    },
    select: { conversationId: true },
  });

  const conversationIds = participantConversations.map((p) => p.conversationId);

  const where: Parameters<typeof prisma.conversation.findMany>[0]['where'] = {
    id: { in: conversationIds },
    tenantId: filters.tenantId,
  };

  if (filters.type) {
    where.type = filters.type;
  }

  if (filters.isArchived !== undefined) {
    where.isArchived = filters.isArchived;
  }

  if (filters.contextType) {
    where.contextType = filters.contextType;
    if (filters.contextId) {
      where.contextId = filters.contextId;
    }
    if (filters.contextLearnerId) {
      where.contextLearnerId = filters.contextLearnerId;
    }
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      include: {
        participants: {
          where: { isActive: true },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.conversation.count({ where }),
  ]);

  return {
    data: conversations,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    hasMore: skip + conversations.length < total,
  };
}

export async function updateConversation(
  id: string,
  tenantId: string,
  input: UpdateConversationInput
) {
  return prisma.conversation.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
      ...(input.isArchived !== undefined && { isArchived: input.isArchived }),
      ...(input.isMuted !== undefined && { isMuted: input.isMuted }),
    },
    include: {
      participants: true,
    },
  });
}

export async function deleteConversation(id: string, tenantId: string) {
  // Soft delete by archiving
  return prisma.conversation.update({
    where: { id },
    data: { isArchived: true },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// DIRECT CONVERSATION HELPERS
// ══════════════════════════════════════════════════════════════════════════════

export async function findOrCreateDirectConversation(
  tenantId: string,
  userId1: string,
  userId2: string
) {
  // Find existing direct conversation between these two users
  const existingParticipant = await prisma.participant.findFirst({
    where: {
      tenantId,
      userId: userId1,
      isActive: true,
      conversation: {
        type: ConversationType.DIRECT,
        participants: {
          some: {
            userId: userId2,
            isActive: true,
          },
        },
      },
    },
    include: {
      conversation: {
        include: {
          participants: true,
        },
      },
    },
  });

  if (existingParticipant) {
    return existingParticipant.conversation;
  }

  // Create new direct conversation
  return createConversation({
    tenantId,
    createdBy: userId1,
    type: ConversationType.DIRECT,
    participantIds: [userId2],
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// STATS
// ══════════════════════════════════════════════════════════════════════════════

export async function updateConversationStats(
  conversationId: string,
  lastMessage: { content: string; createdAt: Date }
) {
  return prisma.conversation.update({
    where: { id: conversationId },
    data: {
      messageCount: { increment: 1 },
      lastMessageAt: lastMessage.createdAt,
      lastMessagePreview: lastMessage.content.substring(0, 100),
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTEXTUAL THREADS (Messaging 2.0)
// ══════════════════════════════════════════════════════════════════════════════

export interface ContextThreadInput {
  tenantId: string;
  createdBy: string;
  contextType: ContextType;
  contextId?: string;
  contextLearnerId?: string;
  contextActionPlanId?: string;
  contextMeetingId?: string;
  name: string;
  description?: string;
  participantIds: string[];
}

/**
 * Find or create a thread for a specific context (learner, action plan, meeting, etc.)
 */
export async function findOrCreateContextThread(input: ContextThreadInput) {
  // Build where clause based on context type
  const contextWhere: Record<string, unknown> = {
    tenantId: input.tenantId,
    contextType: input.contextType,
  };

  // Add specific context fields based on type
  if (input.contextLearnerId) {
    contextWhere.contextLearnerId = input.contextLearnerId;
  }
  if (input.contextActionPlanId) {
    contextWhere.contextActionPlanId = input.contextActionPlanId;
  }
  if (input.contextMeetingId) {
    contextWhere.contextMeetingId = input.contextMeetingId;
  }
  if (input.contextId) {
    contextWhere.contextId = input.contextId;
  }

  // Look for existing thread with this context
  const existingThread = await prisma.conversation.findFirst({
    where: contextWhere,
    include: {
      participants: {
        where: { isActive: true },
      },
    },
  });

  if (existingThread) {
    return { conversation: existingThread, created: false };
  }

  // Create new contextual thread
  const conversation = await createConversation({
    tenantId: input.tenantId,
    createdBy: input.createdBy,
    type: ConversationType.GROUP,
    name: input.name,
    description: input.description,
    participantIds: input.participantIds,
    contextType: input.contextType,
    contextId: input.contextId,
    contextLearnerId: input.contextLearnerId,
    contextActionPlanId: input.contextActionPlanId,
    contextMeetingId: input.contextMeetingId,
  });

  return { conversation, created: true };
}

/**
 * Get all threads for a specific learner (across all context types)
 */
export async function getThreadsForLearner(
  tenantId: string,
  userId: string,
  learnerId: string,
  pagination: { page?: number; pageSize?: number } = {}
) {
  const { page = 1, pageSize = 20 } = pagination;
  const skip = (page - 1) * pageSize;

  // Get conversations where user is participant and learner is context
  const participantConversations = await prisma.participant.findMany({
    where: {
      tenantId,
      userId,
      isActive: true,
    },
    select: { conversationId: true },
  });

  const conversationIds = participantConversations.map((p) => p.conversationId);

  const where = {
    id: { in: conversationIds },
    tenantId,
    contextLearnerId: learnerId,
  };

  const [threads, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      include: {
        participants: {
          where: { isActive: true },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.conversation.count({ where }),
  ]);

  return {
    data: threads,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    hasMore: skip + threads.length < total,
  };
}

/**
 * Get a thread by context type and context ID
 */
export async function getThreadByContext(
  tenantId: string,
  contextType: ContextType,
  contextId: string
) {
  return prisma.conversation.findFirst({
    where: {
      tenantId,
      contextType,
      OR: [
        { contextId },
        { contextLearnerId: contextId },
        { contextActionPlanId: contextId },
        { contextMeetingId: contextId },
      ],
    },
    include: {
      participants: {
        where: { isActive: true },
      },
    },
  });
}
