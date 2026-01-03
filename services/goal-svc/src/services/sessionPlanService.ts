/**
 * Session Plan Service
 *
 * Business logic for managing session plans and items.
 */

import { prisma, toJsonValue } from '../prisma.js';
import type {
  CreateSessionPlanInput,
  UpdateSessionPlanInput,
  SessionPlanFilters,
  CreateSessionPlanItemInput,
  PaginationParams,
} from '../types.js';

// ══════════════════════════════════════════════════════════════════════════════
// SESSION PLAN OPERATIONS
// ══════════════════════════════════════════════════════════════════════════════

export async function createSessionPlan(input: CreateSessionPlanInput) {
  const sessionPlan = await prisma.sessionPlan.create({
    data: {
      tenantId: input.tenantId,
      learnerId: input.learnerId,
      createdByUserId: input.createdByUserId,
      sessionTemplateName: input.sessionTemplateName,
      scheduledFor: input.scheduledFor,
      estimatedDurationMinutes: input.estimatedDurationMinutes,
      sessionType: input.sessionType ?? 'LEARNING',
      status: input.status ?? 'DRAFT',
      metadataJson: toJsonValue(input.metadataJson ?? {}),
      items: input.items
        ? {
            create: input.items.map((item, index) => ({
              orderIndex: item.orderIndex ?? index,
              goalId: item.goalId,
              goalObjectiveId: item.goalObjectiveId,
              skillId: item.skillId,
              activityType: item.activityType,
              activityDescription: item.activityDescription,
              estimatedDurationMinutes: item.estimatedDurationMinutes,
              aiMetadataJson: toJsonValue(item.aiMetadataJson ?? {}),
            })),
          }
        : undefined,
    },
    include: {
      items: {
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  return sessionPlan;
}

export async function getSessionPlanById(id: string, tenantId: string) {
  const sessionPlan = await prisma.sessionPlan.findFirst({
    where: { id, tenantId },
    include: {
      items: {
        orderBy: { orderIndex: 'asc' },
        include: {
          goal: {
            select: { id: true, title: true, domain: true },
          },
          goalObjective: {
            select: { id: true, description: true },
          },
        },
      },
    },
  });

  return sessionPlan;
}

export async function listSessionPlans(
  filters: SessionPlanFilters,
  pagination: PaginationParams = {}
) {
  const { page = 1, pageSize = 20 } = pagination;
  const skip = (page - 1) * pageSize;

  const where: Parameters<typeof prisma.sessionPlan.findMany>[0]['where'] = {
    tenantId: filters.tenantId,
  };

  if (filters.learnerId) {
    where.learnerId = filters.learnerId;
  }

  if (filters.createdByUserId) {
    where.createdByUserId = filters.createdByUserId;
  }

  if (filters.status) {
    where.status = Array.isArray(filters.status)
      ? { in: filters.status }
      : filters.status;
  }

  if (filters.sessionType) {
    where.sessionType = Array.isArray(filters.sessionType)
      ? { in: filters.sessionType }
      : filters.sessionType;
  }

  if (filters.scheduledFrom || filters.scheduledTo) {
    where.scheduledFor = {};
    if (filters.scheduledFrom) {
      where.scheduledFor.gte = filters.scheduledFrom;
    }
    if (filters.scheduledTo) {
      where.scheduledFor.lte = filters.scheduledTo;
    }
  }

  const [sessionPlans, total] = await Promise.all([
    prisma.sessionPlan.findMany({
      where,
      include: {
        items: {
          orderBy: { orderIndex: 'asc' },
        },
      },
      orderBy: { scheduledFor: 'asc' },
      skip,
      take: pageSize,
    }),
    prisma.sessionPlan.count({ where }),
  ]);

  return {
    data: sessionPlans,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function updateSessionPlan(id: string, tenantId: string, input: UpdateSessionPlanInput) {
  const existing = await prisma.sessionPlan.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return null;
  }

  const sessionPlan = await prisma.sessionPlan.update({
    where: { id },
    data: {
      ...(input.sessionTemplateName !== undefined && { sessionTemplateName: input.sessionTemplateName }),
      ...(input.scheduledFor !== undefined && { scheduledFor: input.scheduledFor }),
      ...(input.estimatedDurationMinutes !== undefined && { estimatedDurationMinutes: input.estimatedDurationMinutes }),
      ...(input.sessionType !== undefined && { sessionType: input.sessionType }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.sessionId !== undefined && { sessionId: input.sessionId }),
      ...(input.metadataJson !== undefined && { metadataJson: toJsonValue(input.metadataJson ?? {}) }),
    },
    include: {
      items: {
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  return sessionPlan;
}

export async function deleteSessionPlan(id: string, tenantId: string) {
  const existing = await prisma.sessionPlan.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return false;
  }

  await prisma.sessionPlan.delete({ where: { id } });
  return true;
}

// ══════════════════════════════════════════════════════════════════════════════
// SESSION PLAN ITEM OPERATIONS
// ══════════════════════════════════════════════════════════════════════════════

export async function addSessionPlanItem(
  sessionPlanId: string,
  tenantId: string,
  input: CreateSessionPlanItemInput
) {
  // Verify session plan exists and belongs to tenant
  const sessionPlan = await prisma.sessionPlan.findFirst({
    where: { id: sessionPlanId, tenantId },
  });

  if (!sessionPlan) {
    return null;
  }

  // Get max order index
  const maxOrder = await prisma.sessionPlanItem.aggregate({
    where: { sessionPlanId },
    _max: { orderIndex: true },
  });

  const item = await prisma.sessionPlanItem.create({
    data: {
      sessionPlanId,
      orderIndex: input.orderIndex ?? (maxOrder._max.orderIndex ?? 0) + 1,
      goalId: input.goalId,
      goalObjectiveId: input.goalObjectiveId,
      skillId: input.skillId,
      activityType: input.activityType,
      activityDescription: input.activityDescription,
      estimatedDurationMinutes: input.estimatedDurationMinutes,
      aiMetadataJson: toJsonValue(input.aiMetadataJson ?? {}),
    },
  });

  return item;
}

export async function replaceSessionPlanItems(
  sessionPlanId: string,
  tenantId: string,
  items: CreateSessionPlanItemInput[]
) {
  // Verify session plan exists and belongs to tenant
  const sessionPlan = await prisma.sessionPlan.findFirst({
    where: { id: sessionPlanId, tenantId },
  });

  if (!sessionPlan) {
    return null;
  }

  // Delete existing items and create new ones in a transaction
  await prisma.$transaction([
    prisma.sessionPlanItem.deleteMany({ where: { sessionPlanId } }),
    ...items.map((item, index) =>
      prisma.sessionPlanItem.create({
        data: {
          sessionPlanId,
          orderIndex: item.orderIndex ?? index,
          goalId: item.goalId,
          goalObjectiveId: item.goalObjectiveId,
          skillId: item.skillId,
          activityType: item.activityType,
          activityDescription: item.activityDescription,
          estimatedDurationMinutes: item.estimatedDurationMinutes,
          aiMetadataJson: toJsonValue(item.aiMetadataJson ?? {}),
        },
      })
    ),
  ]);

  // Return updated session plan with items
  return getSessionPlanById(sessionPlanId, tenantId);
}

export async function deleteSessionPlanItem(itemId: string, tenantId: string) {
  // Verify item belongs to tenant via session plan
  const item = await prisma.sessionPlanItem.findFirst({
    where: { id: itemId },
    include: {
      sessionPlan: {
        select: { tenantId: true },
      },
    },
  });

  if (!item || item.sessionPlan.tenantId !== tenantId) {
    return false;
  }

  await prisma.sessionPlanItem.delete({ where: { id: itemId } });
  return true;
}

// ══════════════════════════════════════════════════════════════════════════════
// SESSION PLAN LIFECYCLE
// ══════════════════════════════════════════════════════════════════════════════

export async function startSessionPlan(id: string, tenantId: string, sessionId?: string) {
  const existing = await prisma.sessionPlan.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return null;
  }

  const sessionPlan = await prisma.sessionPlan.update({
    where: { id },
    data: {
      status: 'IN_PROGRESS',
      sessionId,
    },
    include: {
      items: {
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  return sessionPlan;
}

export async function completeSessionPlan(id: string, tenantId: string) {
  const existing = await prisma.sessionPlan.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return null;
  }

  const sessionPlan = await prisma.sessionPlan.update({
    where: { id },
    data: {
      status: 'COMPLETED',
    },
    include: {
      items: {
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  return sessionPlan;
}

export async function cancelSessionPlan(id: string, tenantId: string) {
  const existing = await prisma.sessionPlan.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return null;
  }

  const sessionPlan = await prisma.sessionPlan.update({
    where: { id },
    data: {
      status: 'CANCELLED',
    },
    include: {
      items: {
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  return sessionPlan;
}

// ══════════════════════════════════════════════════════════════════════════════
// UPCOMING SESSIONS
// ══════════════════════════════════════════════════════════════════════════════

export async function getUpcomingSessions(
  tenantId: string,
  options: {
    learnerId?: string;
    createdByUserId?: string;
    days?: number;
    limit?: number;
  } = {}
) {
  const { learnerId, createdByUserId, days = 7, limit = 10 } = options;

  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  const where: Parameters<typeof prisma.sessionPlan.findMany>[0]['where'] = {
    tenantId,
    status: { in: ['DRAFT', 'PLANNED'] },
    scheduledFor: {
      gte: now,
      lte: futureDate,
    },
  };

  if (learnerId) {
    where.learnerId = learnerId;
  }

  if (createdByUserId) {
    where.createdByUserId = createdByUserId;
  }

  const sessions = await prisma.sessionPlan.findMany({
    where,
    include: {
      items: {
        orderBy: { orderIndex: 'asc' },
        take: 5, // Just first few items for preview
      },
    },
    orderBy: { scheduledFor: 'asc' },
    take: limit,
  });

  return sessions;
}
