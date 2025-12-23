/* eslint-disable @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-non-null-assertion */
/**
 * Learner Model API Routes
 *
 * Fastify routes for the learner modeling system.
 * Provides endpoints for:
 * - Getting learner model state
 * - Recording practice outcomes
 * - Getting skill recommendations
 * - Updating neurodiverse profiles
 */

import type { Prisma } from '@prisma/client';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';

// ── Type Definitions ─────────────────────────────────────────────────────────

interface JwtUser {
  sub: string;
  tenantId?: string | undefined;
  tenant_id?: string | undefined;
  role: string;
}

// Extend FastifyRequest to include user
declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtUser | undefined;
  }
}

// ── Zod Schemas ──────────────────────────────────────────────────────────────

const UuidParamSchema = z.object({
  learnerId: z.string().uuid(),
});

const SkillParamSchema = z.object({
  learnerId: z.string().uuid(),
  skillId: z.string().uuid(),
});

const RecordOutcomeSchema = z.object({
  skillId: z.string().uuid(),
  learningObjectId: z.string().uuid().nullish(),
  isCorrect: z.boolean(),
  responseTimeMs: z.number().int().positive().nullish(),
  hintsUsed: z.number().int().min(0).default(0),
  attemptNumber: z.number().int().min(1).default(1),
  difficultyLevel: z.number().int().min(1).max(5).nullish(),
});

const GetRecommendationsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  domain: z.enum(['ELA', 'MATH', 'SCIENCE', 'SPEECH', 'SEL']).optional(),
});

const UpdateNeurodiverseProfileSchema = z.object({
  hasAdhd: z.boolean().optional(),
  hasDyslexia: z.boolean().optional(),
  hasDyscalculia: z.boolean().optional(),
  hasAsd: z.boolean().optional(),
  hasProcessingDelay: z.boolean().optional(),
  masteryThreshold: z.number().min(0.5).max(1).optional(),
  maxSessionMinutes: z.number().int().min(5).max(120).optional(),
  breakFrequencyMinutes: z.number().int().min(5).max(60).optional(),
});

// ── Helper Functions ─────────────────────────────────────────────────────────

function getTenantFilter(tenantId: string | undefined): Prisma.VirtualBrainWhereInput {
  if (tenantId) {
    return { tenantId };
  }
  return {};
}

function getMasteryReason(mastery: number): 'new_skill' | 'in_progress' | 'near_mastery' {
  if (mastery < 0.3) {
    return 'new_skill';
  }
  if (mastery < 0.7) {
    return 'in_progress';
  }
  return 'near_mastery';
}

function getStreakTrend(correctStreak: number): 'improving' | 'struggling' | 'stable' {
  if (correctStreak > 3) {
    return 'improving';
  }
  if (correctStreak === 0) {
    return 'struggling';
  }
  return 'stable';
}

// ── Route Registration ───────────────────────────────────────────────────────

export async function learnerModelRoutes(fastify: FastifyInstance) {
  /**
   * GET /learner-model/:learnerId
   * Get the full learner model state including all skill states.
   */
  fastify.get(
    '/learner-model/:learnerId',
    async (request: FastifyRequest<{ Params: { learnerId: string } }>, reply: FastifyReply) => {
      const { learnerId } = UuidParamSchema.parse(request.params);
      const user = request.user;
      const tenantId = user?.tenantId ?? user?.tenant_id;

      // Get virtual brain with skill states
      const virtualBrain = await prisma.virtualBrain.findFirst({
        where: {
          learnerId,
          ...getTenantFilter(tenantId),
        },
      });

      if (!virtualBrain) {
        return reply.status(404).send({
          error: 'Virtual brain not found',
          message: `No learner model found for learner ${learnerId}`,
        });
      }

      // Fetch related data separately to avoid type inference issues
      const [skillStates, bktStates, neurodiverseProfile] = await Promise.all([
        prisma.learnerSkillState.findMany({
          where: { virtualBrainId: virtualBrain.id },
          include: { skill: true },
        }),
        prisma.bKTSkillState.findMany({
          where: { virtualBrainId: virtualBrain.id },
        }),
        prisma.neurodiverseProfile.findUnique({
          where: { virtualBrainId: virtualBrain.id },
        }),
      ]);

      // Build response
      const skillMasteries = skillStates.map((state) => ({
        skillId: state.skillId,
        skillCode: state.skill.skillCode,
        displayName: state.skill.displayName,
        domain: state.skill.domain,
        masteryLevel: Number(state.masteryLevel),
        confidence: Number(state.confidence),
        practiceCount: state.practiceCount,
        correctStreak: state.correctStreak,
        lastAssessedAt: state.lastAssessedAt.toISOString(),
      }));

      const bktStatesResponse = bktStates.map((state) => ({
        skillId: state.skillId,
        parameters: {
          pLearn: Number(state.pLearn),
          pTransit: Number(state.pTransit),
          pGuess: Number(state.pGuess),
          pSlip: Number(state.pSlip),
        },
        pKnow: Number(state.pKnow),
        pfaSuccesses: state.pfaSuccesses,
        pfaFailures: state.pfaFailures,
        learningVelocity: Number(state.learningVelocity),
        lastPracticeAt: state.lastPracticeAt?.toISOString() ?? null,
      }));

      // Calculate aggregate stats
      const masteryLevels = skillMasteries.map((s) => s.masteryLevel);
      const overallMastery =
        masteryLevels.length > 0
          ? masteryLevels.reduce((a, b) => a + b, 0) / masteryLevels.length
          : 0;
      const masteredSkills = masteryLevels.filter((m) => m >= 0.95).length;
      const inProgressSkills = masteryLevels.filter((m) => m >= 0.3 && m < 0.95).length;
      const notStartedSkills = masteryLevels.filter((m) => m < 0.3).length;

      return {
        learnerId,
        virtualBrainId: virtualBrain.id,
        gradeBand: virtualBrain.gradeBand,
        summary: {
          overallMastery,
          totalSkills: skillMasteries.length,
          masteredSkills,
          inProgressSkills,
          notStartedSkills,
        },
        skillMasteries,
        bktStates: bktStatesResponse,
        neurodiverseProfile: neurodiverseProfile
          ? {
              hasAdhd: neurodiverseProfile.hasAdhd,
              hasDyslexia: neurodiverseProfile.hasDyslexia,
              hasDyscalculia: neurodiverseProfile.hasDyscalculia,
              hasAsd: neurodiverseProfile.hasAsd,
              hasProcessingDelay: neurodiverseProfile.hasProcessingDelay,
              masteryThreshold: Number(neurodiverseProfile.masteryThreshold),
              maxSessionMinutes: neurodiverseProfile.maxSessionMinutes,
              breakFrequencyMinutes: neurodiverseProfile.breakFrequencyMinutes,
            }
          : null,
        updatedAt: virtualBrain.updatedAt.toISOString(),
      };
    }
  );

  /**
   * GET /learner-model/:learnerId/skills/:skillId
   * Get detailed state for a specific skill including BKT parameters.
   */
  fastify.get(
    '/learner-model/:learnerId/skills/:skillId',
    async (
      request: FastifyRequest<{
        Params: { learnerId: string; skillId: string };
      }>,
      reply: FastifyReply
    ) => {
      const { learnerId, skillId } = SkillParamSchema.parse(request.params);
      const user = request.user;
      const tenantId = user?.tenantId ?? user?.tenant_id;

      const virtualBrain = await prisma.virtualBrain.findFirst({
        where: {
          learnerId,
          ...getTenantFilter(tenantId),
        },
      });

      if (!virtualBrain) {
        return reply.status(404).send({ error: 'Virtual brain not found' });
      }

      const [skillState, bktState] = await Promise.all([
        prisma.learnerSkillState.findUnique({
          where: {
            virtualBrainId_skillId: {
              virtualBrainId: virtualBrain.id,
              skillId,
            },
          },
          include: { skill: true },
        }),
        prisma.bKTSkillState.findUnique({
          where: {
            virtualBrainId_skillId: {
              virtualBrainId: virtualBrain.id,
              skillId,
            },
          },
        }),
      ]);

      if (!skillState) {
        return reply.status(404).send({ error: 'Skill state not found' });
      }

      // Get recent practice outcomes separately
      const practiceOutcomes = bktState
        ? await prisma.practiceOutcome.findMany({
            where: { bktSkillStateId: bktState.id },
            orderBy: { createdAt: 'desc' },
            take: 20,
          })
        : [];

      return {
        skillId,
        skill: {
          code: skillState.skill.skillCode,
          displayName: skillState.skill.displayName,
          domain: skillState.skill.domain,
          gradeBand: skillState.skill.gradeBand,
        },
        mastery: {
          level: Number(skillState.masteryLevel),
          confidence: Number(skillState.confidence),
          practiceCount: skillState.practiceCount,
          correctStreak: skillState.correctStreak,
          lastAssessedAt: skillState.lastAssessedAt.toISOString(),
        },
        bkt: bktState
          ? {
              parameters: {
                pLearn: Number(bktState.pLearn),
                pTransit: Number(bktState.pTransit),
                pGuess: Number(bktState.pGuess),
                pSlip: Number(bktState.pSlip),
              },
              pKnow: Number(bktState.pKnow),
              pfa: {
                successes: bktState.pfaSuccesses,
                failures: bktState.pfaFailures,
              },
              learningVelocity: Number(bktState.learningVelocity),
              lastPracticeAt: bktState.lastPracticeAt?.toISOString() ?? null,
            }
          : null,
        recentPractice: practiceOutcomes.map((outcome) => ({
          isCorrect: outcome.isCorrect,
          responseTimeMs: outcome.responseTimeMs,
          hintsUsed: outcome.hintsUsed,
          attemptNumber: outcome.attemptNumber,
          timestamp: outcome.createdAt.toISOString(),
        })),
      };
    }
  );

  /**
   * POST /learner-model/:learnerId/outcomes
   * Record a practice outcome and update learner model.
   */
  fastify.post(
    '/learner-model/:learnerId/outcomes',
    async (
      request: FastifyRequest<{
        Params: { learnerId: string };
        Body: z.infer<typeof RecordOutcomeSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const { learnerId } = UuidParamSchema.parse(request.params);
      const outcome = RecordOutcomeSchema.parse(request.body);
      const user = request.user;
      const tenantId = user?.tenantId ?? user?.tenant_id;

      const virtualBrain = await prisma.virtualBrain.findFirst({
        where: {
          learnerId,
          ...getTenantFilter(tenantId),
        },
      });

      if (!virtualBrain) {
        return reply.status(404).send({ error: 'Virtual brain not found' });
      }

      const neurodiverseProfile = await prisma.neurodiverseProfile.findUnique({
        where: { virtualBrainId: virtualBrain.id },
      });

      // Get or create BKT state
      let bktState = await prisma.bKTSkillState.findUnique({
        where: {
          virtualBrainId_skillId: {
            virtualBrainId: virtualBrain.id,
            skillId: outcome.skillId,
          },
        },
      });

      if (!bktState) {
        // Initialize with default parameters
        bktState = await prisma.bKTSkillState.create({
          data: {
            virtualBrainId: virtualBrain.id,
            skillId: outcome.skillId,
            pLearn: 0.1,
            pTransit: 0.1,
            pGuess: 0.2,
            pSlip: 0.1,
            pKnow: 0.1,
          },
        });
      }

      // Simple BKT update (Bayesian knowledge update)
      const pL = Number(bktState.pKnow);
      const pT = Number(bktState.pTransit);
      const pG = Number(bktState.pGuess);
      const pS = Number(bktState.pSlip);

      let pLGivenObs: number;
      if (outcome.isCorrect) {
        const pCorrect = pL * (1 - pS) + (1 - pL) * pG;
        pLGivenObs = (pL * (1 - pS)) / pCorrect;
      } else {
        const pIncorrect = pL * pS + (1 - pL) * (1 - pG);
        pLGivenObs = (pL * pS) / pIncorrect;
      }

      // Apply learning transition
      const newPKnow = Math.max(0.001, Math.min(0.999, pLGivenObs + (1 - pLGivenObs) * pT));

      // Update PFA counts
      const newSuccesses = outcome.isCorrect ? bktState.pfaSuccesses + 1 : bktState.pfaSuccesses;
      const newFailures = outcome.isCorrect ? bktState.pfaFailures : bktState.pfaFailures + 1;

      // Persist updates in a transaction
      const [, practiceRecord] = await prisma.$transaction([
        prisma.bKTSkillState.update({
          where: { id: bktState.id },
          data: {
            pKnow: newPKnow,
            pfaSuccesses: newSuccesses,
            pfaFailures: newFailures,
            lastPracticeAt: new Date(),
          },
        }),
        prisma.practiceOutcome.create({
          data: {
            bktSkillStateId: bktState.id,
            learningObjectId: outcome.learningObjectId ?? null,
            isCorrect: outcome.isCorrect,
            responseTimeMs: outcome.responseTimeMs ?? null,
            hintsUsed: outcome.hintsUsed,
            attemptNumber: outcome.attemptNumber,
            difficultyLevel: outcome.difficultyLevel ?? null,
            priorPKnow: bktState.pKnow,
            posteriorPKnow: newPKnow,
          },
        }),
        // Update skill state mastery level
        prisma.learnerSkillState.upsert({
          where: {
            virtualBrainId_skillId: {
              virtualBrainId: virtualBrain.id,
              skillId: outcome.skillId,
            },
          },
          create: {
            virtualBrainId: virtualBrain.id,
            skillId: outcome.skillId,
            masteryLevel: newPKnow,
            confidence: 0.5,
            lastAssessedAt: new Date(),
            practiceCount: 1,
            correctStreak: outcome.isCorrect ? 1 : 0,
          },
          update: {
            masteryLevel: newPKnow,
            lastAssessedAt: new Date(),
            practiceCount: { increment: 1 },
            correctStreak: outcome.isCorrect ? { increment: 1 } : { set: 0 },
          },
        }),
      ]);

      // Determine mastery status
      const masteryThreshold = neurodiverseProfile
        ? Number(neurodiverseProfile.masteryThreshold)
        : 0.95;
      const isMastered = newPKnow >= masteryThreshold;

      return {
        skillId: outcome.skillId,
        outcome: {
          isCorrect: outcome.isCorrect,
          priorPKnow: Number(bktState.pKnow),
          posteriorPKnow: newPKnow,
          improvement: newPKnow - Number(bktState.pKnow),
        },
        state: {
          pKnow: newPKnow,
          practiceCount: newSuccesses + newFailures,
          isMastered,
        },
        pfa: {
          successes: newSuccesses,
          failures: newFailures,
        },
        practiceId: practiceRecord.id,
        timestamp: practiceRecord.createdAt.toISOString(),
      };
    }
  );

  /**
   * GET /learner-model/:learnerId/recommendations
   * Get personalized activity recommendations.
   */
  fastify.get(
    '/learner-model/:learnerId/recommendations',
    async (
      request: FastifyRequest<{
        Params: { learnerId: string };
        Querystring: z.infer<typeof GetRecommendationsSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const { learnerId } = UuidParamSchema.parse(request.params);
      const options = GetRecommendationsSchema.parse(request.query);
      const user = request.user;
      const tenantId = user?.tenantId ?? user?.tenant_id;

      const virtualBrain = await prisma.virtualBrain.findFirst({
        where: {
          learnerId,
          ...getTenantFilter(tenantId),
        },
      });

      if (!virtualBrain) {
        return reply.status(404).send({ error: 'Virtual brain not found' });
      }

      const [skillStates, bktStates] = await Promise.all([
        prisma.learnerSkillState.findMany({
          where: { virtualBrainId: virtualBrain.id },
          include: { skill: true },
        }),
        prisma.bKTSkillState.findMany({
          where: { virtualBrainId: virtualBrain.id },
        }),
      ]);

      // Find skills in ZPD (Zone of Proximal Development)
      const recommendations = skillStates
        .filter((state) => {
          const mastery = Number(state.masteryLevel);
          if (options.domain && state.skill.domain !== options.domain) return false;
          // ZPD: skills between 0.1 and 0.9 mastery are in learning zone
          return mastery >= 0.1 && mastery <= 0.9;
        })
        .map((state) => {
          const mastery = Number(state.masteryLevel);
          const bktState = bktStates.find((b) => b.skillId === state.skillId);

          // Calculate days since last practice
          const daysSinceLastPractice = state.lastAssessedAt
            ? (Date.now() - state.lastAssessedAt.getTime()) / (1000 * 60 * 60 * 24)
            : 999;
          const spacingBonus = Math.min(daysSinceLastPractice / 3, 1);

          // Priority score
          const masteryProgress = mastery / 0.95;
          const priorityScore =
            masteryProgress * 0.4 +
            spacingBonus * 0.3 +
            (bktState ? Number(bktState.learningVelocity) * 0.1 : 0);

          return {
            skillId: state.skillId,
            skillCode: state.skill.skillCode,
            displayName: state.skill.displayName,
            domain: state.skill.domain,
            currentMastery: mastery,
            priorityScore,
            reason: getMasteryReason(mastery),
            estimatedPracticesNeeded: Math.ceil((0.95 - mastery) / 0.05),
            lastPracticedAt: state.lastAssessedAt.toISOString(),
          };
        })
        .sort((a, b) => b.priorityScore - a.priorityScore)
        .slice(0, options.limit);

      return { recommendations };
    }
  );

  /**
   * GET /learner-model/:learnerId/analytics
   * Get learning analytics summary.
   */
  fastify.get(
    '/learner-model/:learnerId/analytics',
    async (request: FastifyRequest<{ Params: { learnerId: string } }>, reply: FastifyReply) => {
      const { learnerId } = UuidParamSchema.parse(request.params);
      const user = request.user;
      const tenantId = user?.tenantId ?? user?.tenant_id;

      const virtualBrain = await prisma.virtualBrain.findFirst({
        where: {
          learnerId,
          ...getTenantFilter(tenantId),
        },
      });

      if (!virtualBrain) {
        return reply.status(404).send({ error: 'Virtual brain not found' });
      }

      const [skillStates, bktStates, engagements, sessions] = await Promise.all([
        prisma.learnerSkillState.findMany({
          where: { virtualBrainId: virtualBrain.id },
        }),
        prisma.bKTSkillState.findMany({
          where: { virtualBrainId: virtualBrain.id },
        }),
        prisma.learnerEngagement.findMany({
          where: { virtualBrainId: virtualBrain.id },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        prisma.learningSession.findMany({
          where: { virtualBrainId: virtualBrain.id },
          orderBy: { startedAt: 'desc' },
          take: 10,
        }),
      ]);

      // Get practice outcomes for each BKT state
      const allOutcomes = await prisma.practiceOutcome.findMany({
        where: {
          bktSkillStateId: { in: bktStates.map((s) => s.id) },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      // Calculate learning trends
      const skillProgression = skillStates.map((state) => ({
        skillId: state.skillId,
        masteryLevel: Number(state.masteryLevel),
        practiceCount: state.practiceCount,
        trend: getStreakTrend(state.correctStreak),
      }));

      // Session statistics
      const completedSessions = sessions.filter((s) => s.endedAt);
      const sessionStats = {
        totalSessions: sessions.length,
        avgSessionDuration:
          completedSessions.length > 0
            ? completedSessions.reduce((acc, s) => {
                return acc + (s.endedAt!.getTime() - s.startedAt.getTime()) / 60000;
              }, 0) / completedSessions.length
            : 0,
        avgActivitiesPerSession:
          sessions.length > 0
            ? sessions.reduce((acc, s) => acc + s.activitiesCompleted, 0) / sessions.length
            : 0,
        totalActivitiesCompleted: sessions.reduce((acc, s) => acc + s.activitiesCompleted, 0),
      };

      // Overall progress
      const masteryLevels = skillStates.map((s) => Number(s.masteryLevel));
      const overallProgress = {
        averageMastery:
          masteryLevels.length > 0
            ? masteryLevels.reduce((a, b) => a + b, 0) / masteryLevels.length
            : 0,
        skillsMastered: masteryLevels.filter((m) => m >= 0.95).length,
        skillsInProgress: masteryLevels.filter((m) => m >= 0.3 && m < 0.95).length,
        skillsNotStarted: masteryLevels.filter((m) => m < 0.3).length,
        totalPracticeOutcomes: allOutcomes.length,
        overallAccuracy:
          allOutcomes.length > 0
            ? allOutcomes.filter((o) => o.isCorrect).length / allOutcomes.length
            : 0,
      };

      return {
        learnerId,
        virtualBrainId: virtualBrain.id,
        engagementHistory: engagements.slice(0, 10).map((e) => ({
          state: e.state,
          frustrationScore: Number(e.frustrationScore),
          boredomScore: Number(e.boredomScore),
          engagementScore: Number(e.engagementScore),
          flowScore: Number(e.flowScore),
          timestamp: e.createdAt.toISOString(),
        })),
        skillProgression,
        sessionStats,
        overallProgress,
        recentActivity: allOutcomes.slice(0, 20).map((o) => ({
          isCorrect: o.isCorrect,
          responseTimeMs: o.responseTimeMs,
          timestamp: o.createdAt.toISOString(),
        })),
      };
    }
  );

  /**
   * PUT /learner-model/:learnerId/neurodiverse-profile
   * Update or create neurodiverse profile for personalized learning.
   */
  fastify.put(
    '/learner-model/:learnerId/neurodiverse-profile',
    async (
      request: FastifyRequest<{
        Params: { learnerId: string };
        Body: z.infer<typeof UpdateNeurodiverseProfileSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const { learnerId } = UuidParamSchema.parse(request.params);
      const profile = UpdateNeurodiverseProfileSchema.parse(request.body);
      const user = request.user;
      const tenantId = user?.tenantId ?? user?.tenant_id;

      const virtualBrain = await prisma.virtualBrain.findFirst({
        where: {
          learnerId,
          ...getTenantFilter(tenantId),
        },
      });

      if (!virtualBrain) {
        return reply.status(404).send({ error: 'Virtual brain not found' });
      }

      const updatedProfile = await prisma.neurodiverseProfile.upsert({
        where: { virtualBrainId: virtualBrain.id },
        create: {
          virtualBrainId: virtualBrain.id,
          hasAdhd: profile.hasAdhd ?? false,
          hasDyslexia: profile.hasDyslexia ?? false,
          hasDyscalculia: profile.hasDyscalculia ?? false,
          hasAsd: profile.hasAsd ?? false,
          hasProcessingDelay: profile.hasProcessingDelay ?? false,
          masteryThreshold: profile.masteryThreshold ?? 0.95,
          maxSessionMinutes: profile.maxSessionMinutes ?? 45,
          breakFrequencyMinutes: profile.breakFrequencyMinutes ?? 15,
        },
        update: {
          ...(profile.hasAdhd !== undefined && { hasAdhd: profile.hasAdhd }),
          ...(profile.hasDyslexia !== undefined && {
            hasDyslexia: profile.hasDyslexia,
          }),
          ...(profile.hasDyscalculia !== undefined && {
            hasDyscalculia: profile.hasDyscalculia,
          }),
          ...(profile.hasAsd !== undefined && { hasAsd: profile.hasAsd }),
          ...(profile.hasProcessingDelay !== undefined && {
            hasProcessingDelay: profile.hasProcessingDelay,
          }),
          ...(profile.masteryThreshold !== undefined && {
            masteryThreshold: profile.masteryThreshold,
          }),
          ...(profile.maxSessionMinutes !== undefined && {
            maxSessionMinutes: profile.maxSessionMinutes,
          }),
          ...(profile.breakFrequencyMinutes !== undefined && {
            breakFrequencyMinutes: profile.breakFrequencyMinutes,
          }),
        },
      });

      return {
        success: true,
        profile: {
          id: updatedProfile.id,
          virtualBrainId: updatedProfile.virtualBrainId,
          conditions: {
            adhd: updatedProfile.hasAdhd,
            dyslexia: updatedProfile.hasDyslexia,
            dyscalculia: updatedProfile.hasDyscalculia,
            asd: updatedProfile.hasAsd,
            processingDelay: updatedProfile.hasProcessingDelay,
          },
          thresholds: {
            masteryThreshold: Number(updatedProfile.masteryThreshold),
          },
          sessionPreferences: {
            maxSessionMinutes: updatedProfile.maxSessionMinutes,
            breakFrequencyMinutes: updatedProfile.breakFrequencyMinutes,
          },
          updatedAt: updatedProfile.updatedAt.toISOString(),
        },
      };
    }
  );
}
