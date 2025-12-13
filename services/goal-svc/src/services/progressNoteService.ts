/**
 * Progress Note Service
 *
 * Business logic for managing progress notes.
 */

import { prisma } from '../prisma.js';
import type {
  CreateProgressNoteInput,
  UpdateProgressNoteInput,
  ProgressNoteFilters,
  PaginationParams,
} from '../types.js';

// ══════════════════════════════════════════════════════════════════════════════
// PROGRESS NOTE OPERATIONS
// ══════════════════════════════════════════════════════════════════════════════

export async function createProgressNote(input: CreateProgressNoteInput) {
  const progressNote = await prisma.progressNote.create({
    data: {
      tenantId: input.tenantId,
      learnerId: input.learnerId,
      createdByUserId: input.createdByUserId,
      sessionId: input.sessionId,
      sessionPlanId: input.sessionPlanId,
      goalId: input.goalId,
      goalObjectiveId: input.goalObjectiveId,
      noteText: input.noteText,
      rating: input.rating,
      evidenceUri: input.evidenceUri,
    },
    include: {
      goal: {
        select: { id: true, title: true, domain: true },
      },
      goalObjective: {
        select: { id: true, description: true },
      },
      sessionPlan: {
        select: { id: true, sessionTemplateName: true },
      },
    },
  });

  return progressNote;
}

export async function getProgressNoteById(id: string, tenantId: string) {
  const progressNote = await prisma.progressNote.findFirst({
    where: { id, tenantId },
    include: {
      goal: {
        select: { id: true, title: true, domain: true },
      },
      goalObjective: {
        select: { id: true, description: true },
      },
      sessionPlan: {
        select: { id: true, sessionTemplateName: true },
      },
    },
  });

  return progressNote;
}

export async function listProgressNotes(
  filters: ProgressNoteFilters,
  pagination: PaginationParams = {}
) {
  const { page = 1, pageSize = 20 } = pagination;
  const skip = (page - 1) * pageSize;

  const where: Parameters<typeof prisma.progressNote.findMany>[0]['where'] = {
    tenantId: filters.tenantId,
  };

  if (filters.learnerId) {
    where.learnerId = filters.learnerId;
  }

  if (filters.createdByUserId) {
    where.createdByUserId = filters.createdByUserId;
  }

  if (filters.sessionId) {
    where.sessionId = filters.sessionId;
  }

  if (filters.sessionPlanId) {
    where.sessionPlanId = filters.sessionPlanId;
  }

  if (filters.goalId) {
    where.goalId = filters.goalId;
  }

  if (filters.goalObjectiveId) {
    where.goalObjectiveId = filters.goalObjectiveId;
  }

  if (filters.createdFrom || filters.createdTo) {
    where.createdAt = {};
    if (filters.createdFrom) {
      where.createdAt.gte = filters.createdFrom;
    }
    if (filters.createdTo) {
      where.createdAt.lte = filters.createdTo;
    }
  }

  const [notes, total] = await Promise.all([
    prisma.progressNote.findMany({
      where,
      include: {
        goal: {
          select: { id: true, title: true, domain: true },
        },
        goalObjective: {
          select: { id: true, description: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.progressNote.count({ where }),
  ]);

  return {
    data: notes,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function updateProgressNote(id: string, tenantId: string, input: UpdateProgressNoteInput) {
  const existing = await prisma.progressNote.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return null;
  }

  const progressNote = await prisma.progressNote.update({
    where: { id },
    data: {
      ...(input.sessionId !== undefined && { sessionId: input.sessionId }),
      ...(input.sessionPlanId !== undefined && { sessionPlanId: input.sessionPlanId }),
      ...(input.goalId !== undefined && { goalId: input.goalId }),
      ...(input.goalObjectiveId !== undefined && { goalObjectiveId: input.goalObjectiveId }),
      ...(input.noteText !== undefined && { noteText: input.noteText }),
      ...(input.rating !== undefined && { rating: input.rating }),
      ...(input.evidenceUri !== undefined && { evidenceUri: input.evidenceUri }),
    },
    include: {
      goal: {
        select: { id: true, title: true, domain: true },
      },
      goalObjective: {
        select: { id: true, description: true },
      },
      sessionPlan: {
        select: { id: true, sessionTemplateName: true },
      },
    },
  });

  return progressNote;
}

export async function deleteProgressNote(id: string, tenantId: string) {
  const existing = await prisma.progressNote.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return false;
  }

  await prisma.progressNote.delete({ where: { id } });
  return true;
}

// ══════════════════════════════════════════════════════════════════════════════
// GOAL PROGRESS TIMELINE
// ══════════════════════════════════════════════════════════════════════════════

export async function getGoalProgressTimeline(
  tenantId: string,
  goalId: string,
  pagination: PaginationParams = {}
) {
  const { page = 1, pageSize = 50 } = pagination;
  const skip = (page - 1) * pageSize;

  // Verify goal belongs to tenant
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, tenantId },
  });

  if (!goal) {
    return null;
  }

  const [notes, total] = await Promise.all([
    prisma.progressNote.findMany({
      where: { goalId },
      include: {
        goalObjective: {
          select: { id: true, description: true },
        },
      },
      orderBy: { createdAt: 'asc' },
      skip,
      take: pageSize,
    }),
    prisma.progressNote.count({ where: { goalId } }),
  ]);

  return {
    goal: {
      id: goal.id,
      title: goal.title,
      domain: goal.domain,
      status: goal.status,
      progressRating: goal.progressRating,
    },
    timeline: {
      data: notes,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// LEARNER RECENT NOTES
// ══════════════════════════════════════════════════════════════════════════════

export async function getLearnerRecentNotes(
  tenantId: string,
  learnerId: string,
  limit: number = 10
) {
  const notes = await prisma.progressNote.findMany({
    where: { tenantId, learnerId },
    include: {
      goal: {
        select: { id: true, title: true, domain: true },
      },
      goalObjective: {
        select: { id: true, description: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return notes;
}
