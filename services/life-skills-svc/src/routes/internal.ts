/**
 * Internal Routes
 *
 * Service-to-service endpoints for internal communication.
 */

import type { FastifyInstance } from 'fastify';

import { config } from '../config.js';
import { prisma } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ══════════════════════════════════════════════════════════════════════════════

async function validateInternalKey(request: {
  headers: Record<string, string | undefined>;
}): Promise<boolean> {
  const apiKey = request.headers['x-internal-api-key'];
  return apiKey === config.internalApiKey;
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function registerInternalRoutes(app: FastifyInstance): Promise<void> {
  const prefix = '/internal';

  // Add auth hook for internal routes
  app.addHook('preHandler', async (request, reply) => {
    if (request.url.startsWith(prefix)) {
      const isValid = await validateInternalKey(request);
      if (!isValid) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // GET /internal/skills/:id - Get skill for internal services
  // ────────────────────────────────────────────────────────────────────────────
  app.get<{ Params: { id: string } }>(`${prefix}/skills/:id`, async (request, reply) => {
    const { id } = request.params;

    const skill = await prisma.lifeSkill.findUnique({
      where: { id },
      include: {
        taskAnalysis: {
          include: {
            steps: {
              orderBy: { stepNumber: 'asc' },
            },
          },
        },
      },
    });

    if (!skill) {
      return reply.status(404).send({ error: 'Skill not found' });
    }

    return reply.send({ skill });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // GET /internal/progress/bulk - Get progress for multiple learners
  // ────────────────────────────────────────────────────────────────────────────
  app.post<{ Body: { tenantId: string; learnerIds: string[]; skillIds?: string[] } }>(
    `${prefix}/progress/bulk`,
    async (request, reply) => {
      const { tenantId, learnerIds, skillIds } = request.body;

      const progress = await prisma.learnerSkillProgress.findMany({
        where: {
          tenantId,
          learnerId: { in: learnerIds },
          ...(skillIds && { skillId: { in: skillIds } }),
        },
        include: {
          skill: {
            select: {
              id: true,
              name: true,
              category: true,
            },
          },
        },
      });

      return reply.send({ progress });
    }
  );

  // ────────────────────────────────────────────────────────────────────────────
  // GET /internal/stats/tenant/:tenantId - Get tenant-wide stats
  // ────────────────────────────────────────────────────────────────────────────
  app.get<{ Params: { tenantId: string } }>(
    `${prefix}/stats/tenant/:tenantId`,
    async (request, reply) => {
      const { tenantId } = request.params;

      const [
        totalProgress,
        skillsInProgress,
        skillsCompleted,
        totalSessions,
        safetyAttempts,
        activeGoals,
      ] = await Promise.all([
        prisma.learnerSkillProgress.count({ where: { tenantId } }),
        prisma.learnerSkillProgress.count({
          where: { tenantId, status: { in: ['INTRODUCED', 'PROMPTED', 'PARTIAL'] } },
        }),
        prisma.learnerSkillProgress.count({
          where: { tenantId, status: { in: ['INDEPENDENT', 'GENERALIZED'] } },
        }),
        prisma.skillSession.count({
          where: { learnerProgress: { tenantId } },
        }),
        prisma.safetyAttempt.count({ where: { tenantId } }),
        prisma.lifeSkillGoal.count({ where: { tenantId, isActive: true } }),
      ]);

      // Safety success rate
      const safeAttempts = await prisma.safetyAttempt.count({
        where: { tenantId, outcome: 'SAFE' },
      });

      return reply.send({
        stats: {
          totalProgress,
          skillsInProgress,
          skillsCompleted,
          completionRate: totalProgress > 0 ? (skillsCompleted / totalProgress) * 100 : 0,
          totalSessions,
          safetyAttempts,
          safetySuccessRate: safetyAttempts > 0 ? (safeAttempts / safetyAttempts) * 100 : 0,
          activeGoals,
        },
      });
    }
  );

  // ────────────────────────────────────────────────────────────────────────────
  // POST /internal/sync/learner-profile - Sync learner profile from profile-svc
  // ────────────────────────────────────────────────────────────────────────────
  app.post<{
    Body: {
      tenantId: string;
      learnerId: string;
      dailyLivingSkills?: {
        selfCare?: string;
        communication?: string;
        socialSkills?: string;
        homeSkills?: string;
        communitySkills?: string;
        healthSafety?: string;
      };
      recommendedSkillIds?: string[];
    };
  }>(`${prefix}/sync/learner-profile`, async (request, reply) => {
    const { tenantId, learnerId, recommendedSkillIds } = request.body;

    // Initialize progress for recommended skills
    if (recommendedSkillIds && recommendedSkillIds.length > 0) {
      for (const skillId of recommendedSkillIds) {
        const skill = await prisma.lifeSkill.findUnique({
          where: { id: skillId },
          include: {
            taskAnalysis: {
              include: { steps: true },
            },
          },
        });

        if (skill) {
          await prisma.learnerSkillProgress.upsert({
            where: { learnerId_skillId: { learnerId, skillId } },
            create: {
              tenantId,
              learnerId,
              skillId,
              totalSteps: skill.taskAnalysis?.steps.length ?? 0,
              status: 'NOT_INTRODUCED',
              stepProgress: skill.taskAnalysis
                ? {
                    create: skill.taskAnalysis.steps.map((step) => ({
                      stepId: step.id,
                    })),
                  }
                : undefined,
            },
            update: {},
          });
        }
      }
    }

    return reply.send({
      success: true,
      initializedSkills: recommendedSkillIds?.length ?? 0,
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // DELETE /internal/learner/:learnerId - GDPR delete learner data
  // ────────────────────────────────────────────────────────────────────────────
  app.delete<{ Params: { learnerId: string }; Querystring: { tenantId: string } }>(
    `${prefix}/learner/:learnerId`,
    async (request, reply) => {
      const { learnerId } = request.params;
      const { tenantId } = request.query;

      if (!tenantId) {
        return reply.status(400).send({ error: 'tenantId is required' });
      }

      // Delete all learner data
      const [deletedProgress, deletedGoals, deletedSafetyAttempts, deletedLogs] = await Promise.all(
        [
          prisma.learnerSkillProgress.deleteMany({ where: { tenantId, learnerId } }),
          prisma.lifeSkillGoal.deleteMany({ where: { tenantId, learnerId } }),
          prisma.safetyAttempt.deleteMany({ where: { tenantId, learnerId } }),
          prisma.aICoachingLog.deleteMany({ where: { tenantId, learnerId } }),
        ]
      );

      return reply.send({
        success: true,
        deleted: {
          progress: deletedProgress.count,
          goals: deletedGoals.count,
          safetyAttempts: deletedSafetyAttempts.count,
          logs: deletedLogs.count,
        },
      });
    }
  );
}
