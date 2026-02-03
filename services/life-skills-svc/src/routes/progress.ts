/**
 * Progress Routes
 *
 * Track learner progress on life skills.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { prisma, ProgressStatus, PromptLevel, SkillCategory } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const ProgressStatusEnum = z.nativeEnum(ProgressStatus);
const PromptLevelEnum = z.nativeEnum(PromptLevel);
const SkillCategoryEnum = z.nativeEnum(SkillCategory);

const GetProgressQuerySchema = z.object({
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid(),
  status: ProgressStatusEnum.optional(),
  category: SkillCategoryEnum.optional(),
});

const InitProgressSchema = z.object({
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid(),
  skillId: z.string().uuid(),
});

const UpdateStepProgressSchema = z.object({
  isAcquired: z.boolean().optional(),
  lastPromptLevel: PromptLevelEnum.optional(),
  totalAttempts: z.number().int().min(0).optional(),
  successfulAttempts: z.number().int().min(0).optional(),
  teacherNotes: z.string().optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function registerProgressRoutes(app: FastifyInstance): Promise<void> {
  const prefix = '/api/v1/progress';

  // ────────────────────────────────────────────────────────────────────────────
  // GET /progress - Get learner's progress on all skills
  // ────────────────────────────────────────────────────────────────────────────
  app.get(prefix, async (request, reply) => {
    const query = GetProgressQuerySchema.parse(request.query);

    const progress = await prisma.learnerSkillProgress.findMany({
      where: {
        tenantId: query.tenantId,
        learnerId: query.learnerId,
        ...(query.status && { status: query.status }),
        ...(query.category && { skill: { category: query.category } }),
      },
      include: {
        skill: {
          select: {
            id: true,
            name: true,
            category: true,
            iconUrl: true,
            themeColor: true,
            difficultyLevel: true,
          },
        },
      },
      orderBy: [{ status: 'asc' }, { lastSessionAt: 'desc' }],
    });

    // Calculate overall stats
    const stats = {
      totalSkills: progress.length,
      notIntroduced: progress.filter((p) => p.status === 'NOT_INTRODUCED').length,
      inProgress: progress.filter((p) => ['INTRODUCED', 'PROMPTED', 'PARTIAL'].includes(p.status))
        .length,
      independent: progress.filter((p) => p.status === 'INDEPENDENT').length,
      generalized: progress.filter((p) => p.status === 'GENERALIZED').length,
      averageMastery:
        progress.length > 0
          ? progress.reduce((sum, p) => sum + p.masteryPercent, 0) / progress.length
          : 0,
      totalMinutes: progress.reduce((sum, p) => sum + p.totalMinutes, 0),
      currentStreak: Math.max(...progress.map((p) => p.currentStreak), 0),
    };

    return reply.send({ progress, stats });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // GET /progress/:learnerId/:skillId - Get detailed progress for a skill
  // ────────────────────────────────────────────────────────────────────────────
  app.get<{ Params: { learnerId: string; skillId: string } }>(
    `${prefix}/:learnerId/:skillId`,
    async (request, reply) => {
      const { learnerId, skillId } = request.params;

      const progress = await prisma.learnerSkillProgress.findUnique({
        where: { learnerId_skillId: { learnerId, skillId } },
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
          stepProgress: {
            include: {
              step: true,
            },
            orderBy: {
              step: { stepNumber: 'asc' },
            },
          },
          sessions: {
            orderBy: { startedAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!progress) {
        return reply.status(404).send({ error: 'Progress not found' });
      }

      return reply.send({ progress });
    }
  );

  // ────────────────────────────────────────────────────────────────────────────
  // POST /progress - Initialize progress for a learner on a skill
  // ────────────────────────────────────────────────────────────────────────────
  app.post(prefix, async (request, reply) => {
    const data = InitProgressSchema.parse(request.body);

    // Get skill and task analysis
    const skill = await prisma.lifeSkill.findUnique({
      where: { id: data.skillId },
      include: {
        taskAnalysis: {
          include: {
            steps: true,
          },
        },
      },
    });

    if (!skill) {
      return reply.status(404).send({ error: 'Skill not found' });
    }

    const totalSteps = skill.taskAnalysis?.steps.length ?? 0;

    // Create or update progress
    const progress = await prisma.learnerSkillProgress.upsert({
      where: {
        learnerId_skillId: {
          learnerId: data.learnerId,
          skillId: data.skillId,
        },
      },
      create: {
        tenantId: data.tenantId,
        learnerId: data.learnerId,
        skillId: data.skillId,
        totalSteps,
        status: 'NOT_INTRODUCED',
        // Initialize step progress
        stepProgress: skill.taskAnalysis
          ? {
              create: skill.taskAnalysis.steps.map((step) => ({
                stepId: step.id,
              })),
            }
          : undefined,
      },
      update: {
        // Just return existing if already initialized
      },
      include: {
        skill: true,
        stepProgress: true,
      },
    });

    return reply.status(201).send({ progress });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // PATCH /progress/:learnerId/:skillId/steps/:stepId - Update step progress
  // ────────────────────────────────────────────────────────────────────────────
  app.patch<{ Params: { learnerId: string; skillId: string; stepId: string } }>(
    `${prefix}/:learnerId/:skillId/steps/:stepId`,
    async (request, reply) => {
      const { learnerId, skillId, stepId } = request.params;
      const updates = UpdateStepProgressSchema.parse(request.body);

      // Get learner progress
      const learnerProgress = await prisma.learnerSkillProgress.findUnique({
        where: { learnerId_skillId: { learnerId, skillId } },
      });

      if (!learnerProgress) {
        return reply.status(404).send({ error: 'Learner progress not found' });
      }

      // Update step progress
      const stepProgress = await prisma.stepProgress.upsert({
        where: {
          learnerProgressId_stepId: {
            learnerProgressId: learnerProgress.id,
            stepId,
          },
        },
        create: {
          learnerProgressId: learnerProgress.id,
          stepId,
          ...updates,
          ...(updates.isAcquired && { acquisitionDate: new Date() }),
        },
        update: {
          ...updates,
          ...(updates.isAcquired && { acquisitionDate: new Date() }),
        },
      });

      // Recalculate overall progress
      const allStepProgress = await prisma.stepProgress.findMany({
        where: { learnerProgressId: learnerProgress.id },
      });

      const acquiredCount = allStepProgress.filter((sp) => sp.isAcquired).length;
      const masteryPercent = (acquiredCount / learnerProgress.totalSteps) * 100;

      // Determine overall status based on mastery
      let status: ProgressStatus;
      if (masteryPercent === 0) {
        status = 'INTRODUCED';
      } else if (masteryPercent < 50) {
        status = 'PROMPTED';
      } else if (masteryPercent < 80) {
        status = 'PARTIAL';
      } else if (masteryPercent < 100) {
        status = 'INDEPENDENT';
      } else {
        status = 'INDEPENDENT'; // Full 100% - could be GENERALIZED if in multiple contexts
      }

      // Update learner progress
      await prisma.learnerSkillProgress.update({
        where: { id: learnerProgress.id },
        data: {
          stepsCompleted: acquiredCount,
          masteryPercent,
          status,
          ...(status === 'INDEPENDENT' &&
            !learnerProgress.achievedAt && { achievedAt: new Date() }),
        },
      });

      return reply.send({ stepProgress, masteryPercent, status });
    }
  );

  // ────────────────────────────────────────────────────────────────────────────
  // GET /progress/:learnerId/dashboard - Get progress dashboard
  // ────────────────────────────────────────────────────────────────────────────
  app.get<{ Params: { learnerId: string }; Querystring: { tenantId: string } }>(
    `${prefix}/:learnerId/dashboard`,
    async (request, reply) => {
      const { learnerId } = request.params;
      const { tenantId } = request.query;

      if (!tenantId) {
        return reply.status(400).send({ error: 'tenantId is required' });
      }

      // Get all progress
      const allProgress = await prisma.learnerSkillProgress.findMany({
        where: { tenantId, learnerId },
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
        },
      });

      // Group by category
      const byCategory: Record<
        string,
        {
          category: string;
          skills: typeof allProgress;
          averageMastery: number;
        }
      > = {};

      for (const progress of allProgress) {
        const cat = progress.skill.category;
        byCategory[cat] ??= { category: cat, skills: [], averageMastery: 0 };
        byCategory[cat].skills.push(progress);
      }

      // Calculate averages
      for (const cat of Object.values(byCategory)) {
        cat.averageMastery =
          cat.skills.length > 0
            ? cat.skills.reduce((sum, s) => sum + s.masteryPercent, 0) / cat.skills.length
            : 0;
      }

      // Get recent sessions
      const recentSessions = await prisma.skillSession.findMany({
        where: {
          learnerProgress: { learnerId, tenantId },
        },
        include: {
          learnerProgress: {
            include: {
              skill: {
                select: { id: true, name: true, iconUrl: true },
              },
            },
          },
        },
        orderBy: { startedAt: 'desc' },
        take: 5,
      });

      // Get active goals
      const activeGoals = await prisma.lifeSkillGoal.findMany({
        where: { tenantId, learnerId, isActive: true, isAchieved: false },
        include: {
          skill: {
            select: { id: true, name: true, iconUrl: true },
          },
          milestones: {
            orderBy: { orderIndex: 'asc' },
          },
        },
        take: 5,
      });

      // Calculate streaks
      const totalStreak = Math.max(...allProgress.map((p) => p.currentStreak), 0);
      const longestStreak = Math.max(...allProgress.map((p) => p.longestStreak), 0);

      return reply.send({
        dashboard: {
          summary: {
            totalSkillsTracked: allProgress.length,
            skillsInProgress: allProgress.filter((p) =>
              ['INTRODUCED', 'PROMPTED', 'PARTIAL'].includes(p.status)
            ).length,
            skillsAchieved: allProgress.filter((p) =>
              ['INDEPENDENT', 'GENERALIZED'].includes(p.status)
            ).length,
            averageMastery:
              allProgress.length > 0
                ? allProgress.reduce((sum, p) => sum + p.masteryPercent, 0) / allProgress.length
                : 0,
            totalMinutes: allProgress.reduce((sum, p) => sum + p.totalMinutes, 0),
            currentStreak: totalStreak,
            longestStreak,
          },
          byCategory: Object.values(byCategory),
          recentSessions,
          activeGoals,
        },
      });
    }
  );
}
