/**
 * Goal Service
 *
 * Business logic for managing goals and objectives.
 */

import { prisma, toJsonValue } from '../prisma.js';
import type {
  CreateGoalInput,
  UpdateGoalInput,
  GoalFilters,
  CreateObjectiveInput,
  UpdateObjectiveInput,
  PaginationParams,
} from '../types.js';

// ══════════════════════════════════════════════════════════════════════════════
// GOAL OPERATIONS
// ══════════════════════════════════════════════════════════════════════════════

export async function createGoal(input: CreateGoalInput) {
  const goal = await prisma.goal.create({
    data: {
      tenantId: input.tenantId,
      learnerId: input.learnerId,
      createdByUserId: input.createdByUserId,
      title: input.title,
      description: input.description,
      domain: input.domain,
      skillId: input.skillId,
      startDate: input.startDate ?? new Date(),
      targetDate: input.targetDate,
      status: input.status ?? 'DRAFT',
      metadataJson: toJsonValue(input.metadataJson ?? {}),
    },
    include: {
      objectives: true,
    },
  });

  return goal;
}

export async function getGoalById(id: string, tenantId: string) {
  const goal = await prisma.goal.findFirst({
    where: { id, tenantId },
    include: {
      objectives: {
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  return goal;
}

export async function listGoals(
  filters: GoalFilters,
  pagination: PaginationParams = {}
) {
  const { page = 1, pageSize = 20 } = pagination;
  const skip = (page - 1) * pageSize;

  const where: Parameters<typeof prisma.goal.findMany>[0]['where'] = {
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

  if (filters.domain) {
    where.domain = Array.isArray(filters.domain)
      ? { in: filters.domain }
      : filters.domain;
  }

  if (filters.skillId) {
    where.skillId = filters.skillId;
  }

  const [goals, total] = await Promise.all([
    prisma.goal.findMany({
      where,
      include: {
        objectives: {
          orderBy: { orderIndex: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.goal.count({ where }),
  ]);

  return {
    data: goals,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function updateGoal(id: string, tenantId: string, input: UpdateGoalInput) {
  // First verify the goal exists and belongs to tenant
  const existing = await prisma.goal.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return null;
  }

  const goal = await prisma.goal.update({
    where: { id },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.domain !== undefined && { domain: input.domain }),
      ...(input.skillId !== undefined && { skillId: input.skillId }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.targetDate !== undefined && { targetDate: input.targetDate }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.progressRating !== undefined && { progressRating: input.progressRating }),
      ...(input.metadataJson !== undefined && { metadataJson: toJsonValue(input.metadataJson ?? {}) }),
    },
    include: {
      objectives: {
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  return goal;
}

export async function deleteGoal(id: string, tenantId: string) {
  const existing = await prisma.goal.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return false;
  }

  await prisma.goal.delete({ where: { id } });
  return true;
}

export async function completeGoal(id: string, tenantId: string) {
  const existing = await prisma.goal.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return null;
  }

  const goal = await prisma.goal.update({
    where: { id },
    data: {
      status: 'COMPLETED',
      progressRating: 4, // Full completion
    },
    include: {
      objectives: true,
    },
  });

  return goal;
}

// ══════════════════════════════════════════════════════════════════════════════
// OBJECTIVE OPERATIONS
// ══════════════════════════════════════════════════════════════════════════════

export async function createObjective(input: CreateObjectiveInput, tenantId: string) {
  // Verify goal exists and belongs to tenant
  const goal = await prisma.goal.findFirst({
    where: { id: input.goalId, tenantId },
  });

  if (!goal) {
    return null;
  }

  // Get max order index
  const maxOrder = await prisma.goalObjective.aggregate({
    where: { goalId: input.goalId },
    _max: { orderIndex: true },
  });

  const objective = await prisma.goalObjective.create({
    data: {
      goalId: input.goalId,
      description: input.description,
      successCriteria: input.successCriteria,
      status: input.status ?? 'NOT_STARTED',
      orderIndex: input.orderIndex ?? (maxOrder._max.orderIndex ?? 0) + 1,
    },
  });

  return objective;
}

export async function getObjectiveById(id: string, tenantId: string) {
  const objective = await prisma.goalObjective.findFirst({
    where: { id },
    include: {
      goal: {
        select: { tenantId: true },
      },
    },
  });

  if (!objective || objective.goal.tenantId !== tenantId) {
    return null;
  }

  return objective;
}

export async function updateObjective(id: string, tenantId: string, input: UpdateObjectiveInput) {
  // Verify objective belongs to tenant via goal
  const existing = await prisma.goalObjective.findFirst({
    where: { id },
    include: {
      goal: {
        select: { tenantId: true },
      },
    },
  });

  if (!existing || existing.goal.tenantId !== tenantId) {
    return null;
  }

  const objective = await prisma.goalObjective.update({
    where: { id },
    data: {
      ...(input.description !== undefined && { description: input.description }),
      ...(input.successCriteria !== undefined && { successCriteria: input.successCriteria }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.progressRating !== undefined && { progressRating: input.progressRating }),
      ...(input.orderIndex !== undefined && { orderIndex: input.orderIndex }),
    },
  });

  return objective;
}

export async function deleteObjective(id: string, tenantId: string) {
  const existing = await prisma.goalObjective.findFirst({
    where: { id },
    include: {
      goal: {
        select: { tenantId: true },
      },
    },
  });

  if (!existing || existing.goal.tenantId !== tenantId) {
    return false;
  }

  await prisma.goalObjective.delete({ where: { id } });
  return true;
}

export async function markObjectiveMet(id: string, tenantId: string) {
  const existing = await prisma.goalObjective.findFirst({
    where: { id },
    include: {
      goal: {
        select: { tenantId: true },
      },
    },
  });

  if (!existing || existing.goal.tenantId !== tenantId) {
    return null;
  }

  const objective = await prisma.goalObjective.update({
    where: { id },
    data: {
      status: 'MET',
      progressRating: 4,
    },
  });

  return objective;
}

// ══════════════════════════════════════════════════════════════════════════════
// LEARNER GOAL SUMMARY
// ══════════════════════════════════════════════════════════════════════════════

export async function getLearnerGoalSummary(tenantId: string, learnerId: string) {
  const [goals, objectives] = await Promise.all([
    prisma.goal.groupBy({
      by: ['status'],
      where: { tenantId, learnerId },
      _count: { id: true },
    }),
    prisma.goalObjective.groupBy({
      by: ['status'],
      where: {
        goal: { tenantId, learnerId },
      },
      _count: { id: true },
    }),
  ]);

  const goalsByStatus = goals.reduce<Record<string, number>>(
    (acc, g) => {
      acc[g.status] = g._count.id;
      return acc;
    },
    {}
  );

  const objectivesByStatus = objectives.reduce<Record<string, number>>(
    (acc, o) => {
      acc[o.status] = o._count.id;
      return acc;
    },
    {}
  );

  return {
    goals: {
      total: Object.values(goalsByStatus).reduce((a: number, b: number) => a + b, 0),
      byStatus: goalsByStatus,
    },
    objectives: {
      total: Object.values(objectivesByStatus).reduce((a: number, b: number) => a + b, 0),
      byStatus: objectivesByStatus,
    },
  };
}
