/**
 * Plan Routes for Virtual Brain
 *
 * Provides endpoints for:
 * - Generating "Today's Plan" with personalized activities
 * - Difficulty recommendations based on skill mastery
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { callLessonPlanner } from '../lib/aiOrchestrator.js';
import { prisma } from '../prisma.js';
import type {
  SkillDomain,
  TodaysPlanActivity,
  TodaysPlanResponse,
  DifficultyRecommendationResponse,
  SkillStateForPlan,
  LearningObjectRecord,
} from '../types/plan.js';

// ── Constants ────────────────────────────────────────────────────────────────

/** Mastery thresholds for difficulty selection */
const MASTERY_THRESHOLDS = {
  LOW: 0.4, // Below this = needs easier content
  MEDIUM: 0.7, // Above this = ready for challenge
} as const;

/** Default max activities per plan */
const DEFAULT_MAX_ACTIVITIES = 4;

/** All domains for iteration */
const ALL_DOMAINS: SkillDomain[] = ['ELA', 'MATH', 'SCIENCE', 'SPEECH', 'SEL'];

// ── Type Definitions ─────────────────────────────────────────────────────────

interface JwtUser {
  sub: string;
  tenantId?: string;
  tenant_id?: string;
  role: string;
}

// ── Zod Schemas ──────────────────────────────────────────────────────────────

const LearnerIdParams = z.object({
  learnerId: z.string().uuid(),
});

const TodaysPlanBodySchema = z.object({
  maxActivities: z.number().int().min(1).max(10).optional(),
  includeDomains: z.array(z.enum(['ELA', 'MATH', 'SCIENCE', 'SPEECH', 'SEL'])).optional(),
  useAiPlanner: z.boolean().optional(),
});

const DifficultyQuerySchema = z.object({
  domain: z.enum(['ELA', 'MATH', 'SCIENCE', 'SPEECH', 'SEL']).optional(),
  skillCode: z.string().optional(),
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function getUserFromRequest(
  request: FastifyRequest
): { sub: string; tenantId: string; role: string } | null {
  const user = (request as unknown as { user?: JwtUser }).user;
  if (!user) {
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
      const testUserHeader = request.headers['x-test-user'] as string | undefined;
      if (testUserHeader) {
        try {
          const parsed = JSON.parse(testUserHeader) as JwtUser;
          return {
            sub: parsed.sub,
            tenantId: parsed.tenantId ?? parsed.tenant_id ?? '11111111-1111-1111-1111-111111111111',
            role: parsed.role,
          };
        } catch {
          // Fall through to default test user
        }
      }

      return {
        sub: 'test-user',
        tenantId: '11111111-1111-1111-1111-111111111111',
        role: 'service',
      };
    }

    return null;
  }
  return {
    sub: user.sub,
    tenantId: user.tenantId ?? user.tenant_id ?? '',
    role: user.role,
  };
}

/**
 * Determine the appropriate difficulty band based on mastery level.
 *
 * MVP Algorithm:
 * - mastery < 0.4 → difficulty 1-2 (easier)
 * - 0.4 <= mastery <= 0.7 → difficulty 2-4 (medium)
 * - mastery > 0.7 → difficulty 4-5 (harder/challenge)
 *
 * Future: AI could provide more nuanced difficulty curves based on:
 * - Learning velocity (how fast mastery is improving)
 * - Confidence scores
 * - Time since last practice
 * - Error patterns
 */
function getDifficultyBand(mastery: number): { min: number; max: number } {
  if (mastery < MASTERY_THRESHOLDS.LOW) {
    return { min: 1, max: 2 };
  } else if (mastery <= MASTERY_THRESHOLDS.MEDIUM) {
    return { min: 2, max: 4 };
  } else {
    return { min: 4, max: 5 };
  }
}

/**
 * Determine the activity reason based on mastery level.
 */
function getActivityReason(mastery: number): 'focus_area' | 'practice' | 'challenge' {
  if (mastery < MASTERY_THRESHOLDS.LOW) {
    return 'focus_area';
  } else if (mastery <= MASTERY_THRESHOLDS.MEDIUM) {
    return 'practice';
  } else {
    return 'challenge';
  }
}

/**
 * Calculate difficulty recommendation based on mastery and performance.
 */
function calculateDifficultyRecommendation(
  mastery: number,
  correctRate?: number
): { recommendation: 'EASIER' | 'SAME' | 'HARDER'; suggestedLevel: number; reason: string } {
  // Start with mastery-based recommendation
  let recommendation: 'EASIER' | 'SAME' | 'HARDER' = 'SAME';
  let reason = '';
  let suggestedLevel = 3;

  if (mastery < MASTERY_THRESHOLDS.LOW) {
    recommendation = 'EASIER';
    suggestedLevel = 1;
    reason = `Mastery is below ${MASTERY_THRESHOLDS.LOW * 100}%. Focus on building foundational understanding with easier content.`;
  } else if (mastery > MASTERY_THRESHOLDS.MEDIUM) {
    recommendation = 'HARDER';
    suggestedLevel = 4;
    reason = `Mastery is above ${MASTERY_THRESHOLDS.MEDIUM * 100}%. Ready for more challenging content.`;
  } else {
    reason = 'Mastery is in the target range. Continue with current difficulty.';
  }

  // Adjust based on recent performance if available
  if (correctRate !== undefined) {
    if (correctRate < 0.5 && recommendation !== 'EASIER') {
      recommendation = 'EASIER';
      suggestedLevel = Math.max(1, suggestedLevel - 1);
      reason = `Recent accuracy is ${(correctRate * 100).toFixed(0)}%. Recommend easier content to build confidence.`;
    } else if (correctRate > 0.9 && recommendation !== 'HARDER') {
      recommendation = 'HARDER';
      suggestedLevel = Math.min(5, suggestedLevel + 1);
      reason = `Recent accuracy is ${(correctRate * 100).toFixed(0)}%. Ready for more challenging content.`;
    }
  }

  return { recommendation, suggestedLevel, reason };
}

// ── Routes ───────────────────────────────────────────────────────────────────

export async function planRoutes(fastify: FastifyInstance) {
  /**
   * POST /virtual-brains/:learnerId/todays-plan
   * Generate a personalized daily plan of learning activities.
   *
   * Algorithm:
   * 1. Load learner's virtual brain and skill states
   * 2. For each domain (or filtered domains):
   *    - Select 0-2 skills below mastery target (focus areas)
   * 3. For each selected skill:
   *    - Find learning objects matching skill + difficulty band
   * 4. Optionally call AI planner for refined ordering
   * 5. Return structured plan
   */
  fastify.post(
    '/virtual-brains/:learnerId/todays-plan',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // Parse params
      const paramsResult = LearnerIdParams.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({ error: 'Invalid learner ID' });
      }
      const { learnerId } = paramsResult.data;

      // Parse body
      const bodyResult = TodaysPlanBodySchema.safeParse(request.body ?? {});
      if (!bodyResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid request body', details: bodyResult.error.flatten() });
      }
      const {
        maxActivities = DEFAULT_MAX_ACTIVITIES,
        includeDomains,
        useAiPlanner = false,
      } = bodyResult.data;

      // Load virtual brain
      const virtualBrain = await prisma.virtualBrain.findFirst({
        where: {
          learnerId,
          tenantId: user.tenantId,
        },
        include: {
          skillStates: {
            include: {
              skill: true,
            },
          },
        },
      });

      if (!virtualBrain) {
        return reply.status(404).send({ error: 'Virtual brain not found for this learner' });
      }

      // Filter to included domains
      const domains = includeDomains ?? ALL_DOMAINS;

      // Build skill states by domain
      const skillStatesByDomain = new Map<SkillDomain, SkillStateForPlan[]>();
      for (const ss of virtualBrain.skillStates) {
        const domain = ss.skill.domain as SkillDomain;
        if (!domains.includes(domain)) continue;

        const state: SkillStateForPlan = {
          skillId: ss.skillId,
          skillCode: ss.skill.skillCode,
          domain,
          displayName: ss.skill.displayName,
          masteryLevel: Number(ss.masteryLevel),
          confidence: Number(ss.confidence),
          practiceCount: ss.practiceCount,
        };

        if (!skillStatesByDomain.has(domain)) {
          skillStatesByDomain.set(domain, []);
        }
        skillStatesByDomain.get(domain)!.push(state);
      }

      // Select focus skills (below mastery target) from each domain
      const selectedSkills: SkillStateForPlan[] = [];
      const skillsPerDomain = Math.max(1, Math.ceil(maxActivities / domains.length));

      for (const domain of domains) {
        const domainSkills = skillStatesByDomain.get(domain) ?? [];

        // Sort by mastery (lowest first) to prioritize focus areas
        const sorted = [...domainSkills].sort((a, b) => a.masteryLevel - b.masteryLevel);

        // Take up to skillsPerDomain skills that are below mastery target
        const focusSkills = sorted
          .filter((s) => s.masteryLevel < MASTERY_THRESHOLDS.MEDIUM)
          .slice(0, skillsPerDomain);

        selectedSkills.push(...focusSkills);
      }

      // Limit total selected skills
      const finalSkills = selectedSkills.slice(0, maxActivities);

      // Find learning objects for each skill
      const activities: TodaysPlanActivity[] = [];

      for (const skill of finalSkills) {
        const diffBand = getDifficultyBand(skill.masteryLevel);

        // Query learning objects matching skill and difficulty
        const learningObjects = await prisma.learningObject.findMany({
          where: {
            skillCode: skill.skillCode,
            gradeBand: virtualBrain.gradeBand,
            difficultyLevel: {
              gte: diffBand.min,
              lte: diffBand.max,
            },
            isActive: true,
            OR: [{ tenantId: null }, { tenantId: user.tenantId }],
          },
          orderBy: { difficultyLevel: 'asc' },
          take: 1, // One activity per skill for MVP
        });

        if (learningObjects.length > 0) {
          const lo = learningObjects[0] as LearningObjectRecord;
          activities.push({
            activityId: lo.id,
            skillCode: lo.skillCode,
            skillDisplayName: skill.displayName,
            domain: lo.domain,
            difficultyLevel: lo.difficultyLevel,
            objectType: lo.objectType,
            title: lo.title,
            description: lo.description,
            estimatedMinutes: lo.estimatedMinutes,
            contentUrl: lo.contentUrl,
            currentMastery: skill.masteryLevel,
            reason: getActivityReason(skill.masteryLevel),
          });
        }
      }

      // Optionally use AI planner for ordering
      let orderedActivities = activities;
      let aiPlannerUsed = false;

      if (useAiPlanner && activities.length > 1) {
        const plannerResult = await callLessonPlanner({
          learnerId,
          gradeBand: virtualBrain.gradeBand,
          activities,
          focusDomains: domains,
        });
        orderedActivities = plannerResult.orderedActivities;
        aiPlannerUsed = plannerResult.success;
      }

      // Calculate focus areas summary
      const focusAreas = domains
        .map((domain) => {
          const domainActivities = orderedActivities.filter((a) => a.domain === domain);
          if (domainActivities.length === 0) return null;
          return {
            domain,
            skillCount: domainActivities.length,
            avgMastery:
              domainActivities.reduce((sum, a) => sum + a.currentMastery, 0) /
              domainActivities.length,
          };
        })
        .filter((f): f is NonNullable<typeof f> => f !== null);

      const planDate = new Date().toISOString().split('T')[0]!;
      const response: TodaysPlanResponse = {
        learnerId,
        planDate,
        totalMinutes: orderedActivities.reduce((sum, a) => sum + a.estimatedMinutes, 0),
        activities: orderedActivities,
        focusAreas,
        aiPlannerUsed,
      };

      return reply.send(response);
    }
  );

  /**
   * GET /virtual-brains/:learnerId/difficulty-recommendation
   * Get difficulty adjustment recommendation for a learner.
   *
   * Uses:
   * - Skill mastery levels
   * - Recent performance (stubbed for MVP)
   *
   * Returns recommendation: EASIER, SAME, or HARDER
   */
  fastify.get(
    '/virtual-brains/:learnerId/difficulty-recommendation',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // Parse params
      const paramsResult = LearnerIdParams.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({ error: 'Invalid learner ID' });
      }
      const { learnerId } = paramsResult.data;

      // Parse query
      const queryResult = DifficultyQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return reply.status(400).send({ error: 'Invalid query parameters' });
      }
      const { domain, skillCode } = queryResult.data;

      // Load virtual brain
      const virtualBrain = await prisma.virtualBrain.findFirst({
        where: {
          learnerId,
          tenantId: user.tenantId,
        },
        include: {
          skillStates: {
            include: {
              skill: true,
            },
            where: {
              ...(skillCode && { skill: { skillCode } }),
              ...(domain && !skillCode && { skill: { domain } }),
            },
          },
        },
      });

      if (!virtualBrain) {
        return reply.status(404).send({ error: 'Virtual brain not found for this learner' });
      }

      if (virtualBrain.skillStates.length === 0) {
        return reply.status(404).send({
          error: skillCode
            ? `Skill ${skillCode} not found`
            : domain
              ? `No skills found in domain ${domain}`
              : 'No skills found',
        });
      }

      // Type for skill state from Prisma query
      interface SkillStateRecord {
        masteryLevel: unknown;
        practiceCount: number;
        correctStreak: number;
      }

      // Calculate average mastery for the scope
      const skillStates = virtualBrain.skillStates as SkillStateRecord[];
      const avgMastery =
        skillStates.reduce(
          (sum: number, ss: SkillStateRecord) => sum + Number(ss.masteryLevel),
          0
        ) / skillStates.length;

      // Stub: Recent performance (in production, query activity logs)
      // For MVP, use practice count and correct streak as proxy
      const totalPractice = skillStates.reduce(
        (sum: number, ss: SkillStateRecord) => sum + ss.practiceCount,
        0
      );
      const avgCorrectStreak =
        skillStates.reduce((sum: number, ss: SkillStateRecord) => sum + ss.correctStreak, 0) /
        skillStates.length;

      // Estimate correct rate from streak (simplified)
      const estimatedCorrectRate =
        totalPractice > 0 ? Math.min(0.95, 0.5 + avgCorrectStreak * 0.1) : undefined;

      const { recommendation, suggestedLevel, reason } = calculateDifficultyRecommendation(
        avgMastery,
        estimatedCorrectRate
      );

      // Build scope object without undefined values
      const scope: { domain?: SkillDomain; skillCode?: string } = {};
      if (domain) scope.domain = domain as SkillDomain;
      if (skillCode) scope.skillCode = skillCode;

      const response: DifficultyRecommendationResponse = {
        learnerId,
        recommendation,
        reason,
        currentMastery: Math.round(avgMastery * 1000) / 1000,
        suggestedDifficultyLevel: suggestedLevel,
        scope,
        ...(estimatedCorrectRate !== undefined && {
          recentPerformance: {
            totalAttempts: totalPractice,
            correctCount: Math.round(totalPractice * estimatedCorrectRate),
            correctRate: Math.round(estimatedCorrectRate * 1000) / 1000,
          },
        }),
      };

      return reply.send(response);
    }
  );
}
