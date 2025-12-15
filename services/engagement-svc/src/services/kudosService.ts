/**
 * Kudos Service - Business logic for peer recognition / encouragement messages
 */

import { prisma, KudosContext, KudosSource, type Kudos } from '../prisma.js';

export interface SendKudosInput {
  tenantId: string;
  learnerId: string;
  fromUserId: string;
  fromRole: KudosSource;
  message: string;
  context: KudosContext;
  linkedSessionId?: string;
  linkedActionPlanId?: string;
  visibleToLearner?: boolean;
}

/**
 * Send kudos to a learner
 */
export async function sendKudos(input: SendKudosInput): Promise<Kudos> {
  // Check if kudos is enabled for tenant
  const settings = await prisma.tenantGamificationSettings.findUnique({
    where: { tenantId: input.tenantId },
    select: { kudosEnabled: true },
  });
  
  // Default to enabled if no settings exist
  const kudosEnabled = settings?.kudosEnabled ?? true;
  
  if (!kudosEnabled) {
    throw new Error('Kudos is disabled for this tenant');
  }
  
  return prisma.kudos.create({
    data: {
      tenantId: input.tenantId,
      learnerId: input.learnerId,
      fromUserId: input.fromUserId,
      fromRole: input.fromRole,
      message: input.message,
      context: input.context,
      linkedSessionId: input.linkedSessionId,
      linkedActionPlanId: input.linkedActionPlanId,
      visibleToLearner: input.visibleToLearner ?? true,
    },
  });
}

/**
 * Get kudos for a learner (visible ones only)
 */
export async function getLearnerKudos(
  tenantId: string,
  learnerId: string,
  limit = 20
): Promise<Kudos[]> {
  return prisma.kudos.findMany({
    where: {
      tenantId,
      learnerId,
      visibleToLearner: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Get all kudos for a learner (including hidden - for care team)
 */
export async function getAllKudosForLearner(
  tenantId: string,
  learnerId: string,
  limit = 50
): Promise<Kudos[]> {
  return prisma.kudos.findMany({
    where: { tenantId, learnerId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Get kudos sent by a user
 */
export async function getKudosSentBy(
  tenantId: string,
  fromUserId: string,
  limit = 50
): Promise<Kudos[]> {
  return prisma.kudos.findMany({
    where: { tenantId, fromUserId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Get kudos count for a learner
 */
export async function getKudosCount(
  tenantId: string,
  learnerId: string
): Promise<number> {
  return prisma.kudos.count({
    where: { tenantId, learnerId, visibleToLearner: true },
  });
}

/**
 * Get recent kudos for context (e.g., linked to a specific session)
 */
export async function getKudosForSession(
  tenantId: string,
  sessionId: string
): Promise<Kudos[]> {
  return prisma.kudos.findMany({
    where: { tenantId, linkedSessionId: sessionId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get kudos for action plan
 */
export async function getKudosForActionPlan(
  tenantId: string,
  actionPlanId: string
): Promise<Kudos[]> {
  return prisma.kudos.findMany({
    where: { tenantId, linkedActionPlanId: actionPlanId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Delete kudos (only by sender or admin)
 */
export async function deleteKudos(
  kudosId: string,
  requestingUserId: string,
  isAdmin = false
): Promise<boolean> {
  const kudos = await prisma.kudos.findUnique({
    where: { id: kudosId },
  });
  
  if (!kudos) return false;
  
  // Only sender or admin can delete
  if (!isAdmin && kudos.fromUserId !== requestingUserId) {
    return false;
  }
  
  await prisma.kudos.delete({
    where: { id: kudosId },
  });
  
  return true;
}

/**
 * Generate system kudos for achievements
 */
export async function generateSystemKudos(
  tenantId: string,
  learnerId: string,
  achievementType: 'streak' | 'level' | 'badge',
  value: number | string
): Promise<Kudos> {
  const messages: Record<string, string[]> = {
    streak: [
      `Amazing! You're on a ${value}-day streak! 🔥`,
      `${value} days in a row - you're unstoppable! ⭐`,
      `Keep it up! ${value} days strong! 💪`,
    ],
    level: [
      `Congratulations on reaching Level ${value}! 🎉`,
      `Level ${value} unlocked! You're growing! 🌟`,
      `You made it to Level ${value}! Keep shining! ✨`,
    ],
    badge: [
      `You earned the "${value}" badge! 🏆`,
      `New badge unlocked: ${value}! Amazing work! 🎖️`,
      `"${value}" badge is yours! Well done! 🌈`,
    ],
  };
  
  const typeMessages = messages[achievementType] || messages.level;
  const message = typeMessages[Math.floor(Math.random() * typeMessages.length)];
  
  return sendKudos({
    tenantId,
    learnerId,
    fromUserId: 'system',
    fromRole: KudosSource.SYSTEM,
    message,
    context: KudosContext.ACHIEVEMENT,
    visibleToLearner: true,
  });
}
