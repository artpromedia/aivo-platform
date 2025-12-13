/**
 * Participant Service
 *
 * Manages conversation participants and their preferences.
 */

import { prisma, ParticipantRole } from '../prisma.js';
import type { AddParticipantsInput, UpdateParticipantInput } from '../types.js';

// ══════════════════════════════════════════════════════════════════════════════
// PARTICIPANT MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

export async function addParticipants(input: AddParticipantsInput) {
  const { conversationId, tenantId, userIds, role = ParticipantRole.MEMBER } = input;

  // Get existing participants to avoid duplicates
  const existing = await prisma.participant.findMany({
    where: { conversationId, userId: { in: userIds } },
  });

  const existingUserIds = new Set(existing.map((p) => p.userId));

  // Reactivate inactive participants
  const inactiveParticipants = existing.filter((p) => !p.isActive);
  if (inactiveParticipants.length > 0) {
    await prisma.participant.updateMany({
      where: {
        id: { in: inactiveParticipants.map((p) => p.id) },
      },
      data: { isActive: true, leftAt: null },
    });
  }

  // Create new participants
  const newUserIds = userIds.filter((id) => !existingUserIds.has(id));
  if (newUserIds.length > 0) {
    await prisma.participant.createMany({
      data: newUserIds.map((userId) => ({
        tenantId,
        conversationId,
        userId,
        role,
      })),
    });
  }

  // Return updated participant list
  return prisma.participant.findMany({
    where: { conversationId, isActive: true },
  });
}

export async function removeParticipant(
  conversationId: string,
  userId: string,
  removedBy: string
) {
  return prisma.participant.updateMany({
    where: { conversationId, userId },
    data: { isActive: false, leftAt: new Date() },
  });
}

export async function leaveConversation(conversationId: string, userId: string) {
  return prisma.participant.updateMany({
    where: { conversationId, userId },
    data: { isActive: false, leftAt: new Date() },
  });
}

export async function getParticipant(conversationId: string, userId: string) {
  return prisma.participant.findFirst({
    where: { conversationId, userId },
  });
}

export async function updateParticipant(
  conversationId: string,
  userId: string,
  input: UpdateParticipantInput
) {
  return prisma.participant.updateMany({
    where: { conversationId, userId },
    data: {
      ...(input.role !== undefined && { role: input.role }),
      ...(input.isMuted !== undefined && { isMuted: input.isMuted }),
      ...(input.isPinned !== undefined && { isPinned: input.isPinned }),
      ...(input.notificationsEnabled !== undefined && {
        notificationsEnabled: input.notificationsEnabled,
      }),
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// READ TRACKING
// ══════════════════════════════════════════════════════════════════════════════

export async function markAsRead(
  conversationId: string,
  userId: string,
  lastMessageId: string
) {
  return prisma.participant.updateMany({
    where: { conversationId, userId },
    data: {
      lastReadAt: new Date(),
      lastReadMessageId: lastMessageId,
      unreadCount: 0,
    },
  });
}

export async function incrementUnreadCount(conversationId: string, excludeUserId: string) {
  return prisma.participant.updateMany({
    where: {
      conversationId,
      userId: { not: excludeUserId },
      isActive: true,
    },
    data: {
      unreadCount: { increment: 1 },
    },
  });
}

export async function getUnreadCounts(tenantId: string, userId: string) {
  const participants = await prisma.participant.findMany({
    where: {
      tenantId,
      userId,
      isActive: true,
      unreadCount: { gt: 0 },
    },
    select: {
      conversationId: true,
      unreadCount: true,
    },
  });

  const totalUnread = participants.reduce((sum, p) => sum + p.unreadCount, 0);

  return {
    total: totalUnread,
    byConversation: participants.reduce(
      (acc, p) => {
        acc[p.conversationId] = p.unreadCount;
        return acc;
      },
      {} as Record<string, number>
    ),
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// PERMISSION CHECKS
// ══════════════════════════════════════════════════════════════════════════════

export async function canSendMessage(conversationId: string, userId: string): Promise<boolean> {
  const participant = await prisma.participant.findFirst({
    where: {
      conversationId,
      userId,
      isActive: true,
    },
  });

  return !!participant;
}

export async function canModifyConversation(
  conversationId: string,
  userId: string
): Promise<boolean> {
  const participant = await prisma.participant.findFirst({
    where: {
      conversationId,
      userId,
      isActive: true,
      role: { in: [ParticipantRole.OWNER, ParticipantRole.ADMIN] },
    },
  });

  return !!participant;
}

export async function canRemoveParticipant(
  conversationId: string,
  actorId: string,
  targetId: string
): Promise<boolean> {
  // Users can always remove themselves
  if (actorId === targetId) return true;

  // Otherwise, need admin/owner role
  return canModifyConversation(conversationId, actorId);
}
