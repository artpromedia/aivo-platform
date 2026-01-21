/**
 * Goals Routes
 *
 * Life skill goal setting and tracking.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { prisma, ProgressStatus, PromptLevel } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const ProgressStatusEnum = z.nativeEnum(ProgressStatus);
const PromptLevelEnum = z.nativeEnum(PromptLevel);

const CreateGoalSchema = z.object({
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid(),
  skillId: z.string().uuid(),
  createdByUserId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  targetStatus: ProgressStatusEnum.optional(),
  targetPromptLevel: PromptLevelEnum.optional(),
  targetContexts: z.array(z.string()).optional(),
  startDate: z.string().datetime().optional(),
  targetDate: z.string().datetime().optional(),
  motivationNotes: z.string().optional(),
  milestones: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        targetDate: z.string().datetime().optional(),
      })
    )
    .optional(),
});

const UpdateGoalSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  targetDate: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
  motivationNotes: z.string().optional(),
});

const UpdateMilestoneSchema = z.object({
  isComplete: z.boolean(),
});

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function registerGoalRoutes(app: FastifyInstance): Promise<void> {
  const prefix = '/api/v1/goals';

  // ────────────────────────────────────────────────────────────────────────────
  // GET /goals - Get all goals for a learner
  // ────────────────────────────────────────────────────────────────────────────
  app.get<{ Querystring: { tenantId: string; learnerId: string; isActive?: string } }>(
    prefix,
    async (request, reply) => {
      const { tenantId, learnerId, isActive } = request.query;

      if (!tenantId || !learnerId) {
        return reply.status(400).send({ error: 'tenantId and learnerId are required' });
      }

      const goals = await prisma.lifeSkillGoal.findMany({
        where: {
          tenantId,
          learnerId,
          ...(isActive !== undefined && { isActive: isActive === 'true' }),
        },
        include: {
          skill: {
            select: {
              id: true,
              name: true,
              category: true,
              iconUrl: true,
              themeColor: true,
            },
          },
          milestones: {
            orderBy: { orderIndex: 'asc' },
          },
        },
        orderBy: [{ isActive: 'desc' }, { isAchieved: 'asc' }, { createdAt: 'desc' }],
      });

      // Calculate progress for each goal
      const goalsWithProgress = await Promise.all(
        goals.map(async (goal) => {
          const learnerProgress = await prisma.learnerSkillProgress.findUnique({
            where: { learnerId_skillId: { learnerId, skillId: goal.skillId } },
          });

          const milestonesCompleted = goal.milestones.filter((m) => m.isComplete).length;
          const milestonesTotal = goal.milestones.length;

          return {
            ...goal,
            currentProgress: learnerProgress
              ? {
                  status: learnerProgress.status,
                  masteryPercent: learnerProgress.masteryPercent,
                  currentPromptLevel: learnerProgress.currentPromptLevel,
                }
              : null,
            milestoneProgress: {
              completed: milestonesCompleted,
              total: milestonesTotal,
              percent: milestonesTotal > 0 ? (milestonesCompleted / milestonesTotal) * 100 : 0,
            },
          };
        })
      );

      return reply.send({ goals: goalsWithProgress });
    }
  );

  // ────────────────────────────────────────────────────────────────────────────
  // GET /goals/:id - Get a specific goal
  // ────────────────────────────────────────────────────────────────────────────
  app.get<{ Params: { id: string } }>(`${prefix}/:id`, async (request, reply) => {
    const { id } = request.params;

    const goal = await prisma.lifeSkillGoal.findUnique({
      where: { id },
      include: {
        skill: {
          include: {
            taskAnalysis: {
              include: {
                steps: {
                  orderBy: { stepNumber: 'asc' },
                },
              },
            },
          },
        },
        milestones: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!goal) {
      return reply.status(404).send({ error: 'Goal not found' });
    }

    // Get current progress
    const learnerProgress = await prisma.learnerSkillProgress.findUnique({
      where: { learnerId_skillId: { learnerId: goal.learnerId, skillId: goal.skillId } },
      include: {
        stepProgress: {
          include: { step: true },
          orderBy: { step: { stepNumber: 'asc' } },
        },
        sessions: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
      },
    });

    return reply.send({
      goal,
      currentProgress: learnerProgress,
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // POST /goals - Create a new goal
  // ────────────────────────────────────────────────────────────────────────────
  app.post(prefix, async (request, reply) => {
    const data = CreateGoalSchema.parse(request.body);

    // Verify skill exists
    const skill = await prisma.lifeSkill.findUnique({ where: { id: data.skillId } });
    if (!skill) {
      return reply.status(404).send({ error: 'Skill not found' });
    }

    const goal = await prisma.lifeSkillGoal.create({
      data: {
        tenantId: data.tenantId,
        learnerId: data.learnerId,
        skillId: data.skillId,
        createdByUserId: data.createdByUserId,
        title: data.title,
        description: data.description,
        targetStatus: data.targetStatus ?? 'INDEPENDENT',
        targetPromptLevel: data.targetPromptLevel,
        targetContexts: data.targetContexts ?? [],
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
        motivationNotes: data.motivationNotes,
        milestones: data.milestones
          ? {
              create: data.milestones.map((m, index) => ({
                title: m.title,
                description: m.description,
                targetDate: m.targetDate ? new Date(m.targetDate) : undefined,
                orderIndex: index,
              })),
            }
          : undefined,
      },
      include: {
        skill: {
          select: { id: true, name: true, iconUrl: true },
        },
        milestones: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    // Initialize progress if not exists
    const existingProgress = await prisma.learnerSkillProgress.findUnique({
      where: { learnerId_skillId: { learnerId: data.learnerId, skillId: data.skillId } },
    });

    if (!existingProgress) {
      const taskAnalysis = await prisma.taskAnalysis.findUnique({
        where: { skillId: data.skillId },
        include: { steps: true },
      });

      await prisma.learnerSkillProgress.create({
        data: {
          tenantId: data.tenantId,
          learnerId: data.learnerId,
          skillId: data.skillId,
          totalSteps: taskAnalysis?.steps.length ?? 0,
          status: 'NOT_INTRODUCED',
          stepProgress: taskAnalysis
            ? {
                create: taskAnalysis.steps.map((step) => ({
                  stepId: step.id,
                })),
              }
            : undefined,
        },
      });
    }

    return reply.status(201).send({ goal });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // PATCH /goals/:id - Update a goal
  // ────────────────────────────────────────────────────────────────────────────
  app.patch<{ Params: { id: string } }>(`${prefix}/:id`, async (request, reply) => {
    const { id } = request.params;
    const updates = UpdateGoalSchema.parse(request.body);

    const goal = await prisma.lifeSkillGoal.update({
      where: { id },
      data: {
        ...updates,
        ...(updates.targetDate && { targetDate: new Date(updates.targetDate) }),
      },
      include: {
        skill: {
          select: { id: true, name: true, iconUrl: true },
        },
        milestones: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    return reply.send({ goal });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // PATCH /goals/:id/milestones/:milestoneId - Update milestone
  // ────────────────────────────────────────────────────────────────────────────
  app.patch<{ Params: { id: string; milestoneId: string } }>(
    `${prefix}/:id/milestones/:milestoneId`,
    async (request, reply) => {
      const { id, milestoneId } = request.params;
      const updates = UpdateMilestoneSchema.parse(request.body);

      const milestone = await prisma.goalMilestone.update({
        where: { id: milestoneId },
        data: {
          isComplete: updates.isComplete,
          completedAt: updates.isComplete ? new Date() : null,
        },
      });

      // Check if all milestones are complete
      const goal = await prisma.lifeSkillGoal.findUnique({
        where: { id },
        include: { milestones: true },
      });

      if (goal) {
        const allComplete = goal.milestones.every((m) =>
          m.id === milestoneId ? updates.isComplete : m.isComplete
        );

        if (allComplete && goal.milestones.length > 0) {
          // Mark goal as achieved
          await prisma.lifeSkillGoal.update({
            where: { id },
            data: {
              isAchieved: true,
              achievedAt: new Date(),
            },
          });
        }
      }

      return reply.send({ milestone });
    }
  );

  // ────────────────────────────────────────────────────────────────────────────
  // POST /goals/:id/celebrate - Mark celebration as shown
  // ────────────────────────────────────────────────────────────────────────────
  app.post<{ Params: { id: string } }>(`${prefix}/:id/celebrate`, async (request, reply) => {
    const { id } = request.params;

    const goal = await prisma.lifeSkillGoal.update({
      where: { id },
      data: { celebrationShown: true },
    });

    return reply.send({ goal, message: 'Celebration recorded! 🎉' });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // DELETE /goals/:id - Delete a goal
  // ────────────────────────────────────────────────────────────────────────────
  app.delete<{ Params: { id: string } }>(`${prefix}/:id`, async (request, reply) => {
    const { id } = request.params;

    await prisma.lifeSkillGoal.delete({ where: { id } });

    return reply.send({ success: true });
  });
}
