import type { Prisma } from '@prisma/client';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';

// --- Type definitions ---

interface JwtUser {
  sub: string;
  tenantId?: string;
  tenant_id?: string;
  role: string;
}

interface InitializationResult {
  virtualBrainId: string;
  learnerId: string;
  skillsInitialized: number;
  skillsMissing: string[];
  createdAt: string;
}

// Type for skill from DB query
interface SkillRecord {
  id: string;
  skillCode: string;
}

// Type for skill state with relations
interface SkillStateWithRelations {
  id: string;
  skillId: string;
  masteryLevel: Prisma.Decimal;
  confidence: Prisma.Decimal;
  practiceCount: number;
  correctStreak: number;
  lastAssessedAt: Date;
  skill: {
    id: string;
    skillCode: string;
    domain: string;
    gradeBand: string;
    displayName: string;
    description: string | null;
    hasPrerequisite?: PrerequisiteRelation[];
    prerequisiteFor?: DependentRelation[];
  };
}

interface PrerequisiteRelation {
  prerequisiteSkillId: string;
  prerequisiteSkill: {
    id: string;
    skillCode: string;
    displayName: string;
  };
}

interface DependentRelation {
  dependentSkill: {
    id: string;
    skillCode: string;
    displayName: string;
  };
}

interface SkillGraphNode {
  skillId: string;
  skillCode: string;
  displayName: string;
  domain: string;
  masteryLevel: number;
  isMastered: boolean;
  isReady: boolean;
  prerequisites: {
    skillId: string;
    skillCode: string;
    displayName: string;
    isMastered: boolean;
  }[];
  dependents: {
    skillId: string;
    skillCode: string;
    displayName: string;
  }[];
}

// --- Zod Schemas ---

const InitializeSchema = z.object({
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid(),
  baselineProfileId: z.string().uuid(),
  baselineAttemptId: z.string().uuid(),
  gradeBand: z.enum(['K5', 'G6_8', 'G9_12']),
  skillEstimates: z.array(
    z.object({
      skillCode: z.string(),
      domain: z.enum(['ELA', 'MATH', 'SCIENCE', 'SPEECH', 'SEL']),
      estimatedLevel: z.number().min(0).max(10),
      confidence: z.number().min(0).max(1),
    })
  ),
});

const GetByLearnerParams = z.object({
  learnerId: z.string().uuid(),
});

// --- Helpers ---

function getUserFromRequest(
  request: FastifyRequest
): { sub: string; tenantId: string; role: string } | null {
  const user = (request as unknown as { user?: JwtUser }).user;
  if (!user) return null;
  return {
    sub: user.sub,
    tenantId: user.tenantId ?? user.tenant_id ?? '',
    role: user.role,
  };
}

function canAccessTenant(
  user: { sub: string; tenantId: string; role: string },
  tenantId: string
): boolean {
  // Users can only access resources in their own tenant
  // Service-to-service calls would use a service account with elevated permissions
  return user.tenantId === tenantId || user.role === 'service';
}

// --- Routes ---

export async function virtualBrainRoutes(fastify: FastifyInstance) {
  /**
   * POST /virtual-brains/initialize
   * Initialize a Virtual Brain from baseline assessment results.
   *
   * Called by baseline-svc after accept-final.
   * Maps baseline skill estimates to the skill graph and creates learner skill states.
   */
  fastify.post(
    '/virtual-brains/initialize',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const parseResult = InitializeSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid request body', details: parseResult.error.flatten() });
      }

      const {
        tenantId,
        learnerId,
        baselineProfileId,
        baselineAttemptId,
        gradeBand,
        skillEstimates,
      } = parseResult.data;

      // Tenant authorization
      if (!canAccessTenant(user, tenantId)) {
        return reply.status(403).send({ error: 'Forbidden: tenant mismatch' });
      }

      // Check if virtual brain already exists
      const existing = await prisma.virtualBrain.findUnique({
        where: { tenantId_learnerId: { tenantId, learnerId } },
      });

      if (existing) {
        return reply.status(409).send({
          error: 'Virtual brain already exists for this learner',
          virtualBrainId: existing.id,
        });
      }

      // Fetch all skills to map skillCode -> skillId
      const allSkills: SkillRecord[] = await prisma.skill.findMany({
        select: { id: true, skillCode: true },
      });

      const skillCodeToId = new Map<string, string>(allSkills.map((s) => [s.skillCode, s.id]));

      // Map skill estimates to skill states
      const skillStatesToCreate: {
        skillId: string;
        masteryLevel: number;
        confidence: number;
        lastAssessedAt: Date;
      }[] = [];

      const missingSkills: string[] = [];

      for (const estimate of skillEstimates) {
        const skillId = skillCodeToId.get(estimate.skillCode);
        if (!skillId) {
          missingSkills.push(estimate.skillCode);
          continue;
        }

        skillStatesToCreate.push({
          skillId,
          masteryLevel: estimate.estimatedLevel,
          confidence: estimate.confidence,
          lastAssessedAt: new Date(),
        });
      }

      // Create virtual brain and skill states in transaction
      const virtualBrain = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const vb = await tx.virtualBrain.create({
          data: {
            tenantId,
            learnerId,
            baselineProfileId,
            baselineAttemptId,
            gradeBand,
            initializationJson: {
              source: 'baseline',
              skillEstimatesCount: skillEstimates.length,
              missingSkillCodes: missingSkills,
              initializedAt: new Date().toISOString(),
            },
          },
        });

        // Create skill states
        for (const state of skillStatesToCreate) {
          await tx.learnerSkillState.create({
            data: {
              virtualBrainId: vb.id,
              skillId: state.skillId,
              masteryLevel: state.masteryLevel,
              confidence: state.confidence,
              lastAssessedAt: state.lastAssessedAt,
              practiceCount: 0,
              correctStreak: 0,
            },
          });
        }

        return vb;
      });

      const result: InitializationResult = {
        virtualBrainId: virtualBrain.id,
        learnerId: virtualBrain.learnerId,
        skillsInitialized: skillStatesToCreate.length,
        skillsMissing: missingSkills,
        createdAt: virtualBrain.createdAt.toISOString(),
      };

      return reply.status(201).send(result);
    }
  );

  /**
   * GET /virtual-brains/:learnerId
   * Get a learner's Virtual Brain with skill states.
   */
  fastify.get(
    '/virtual-brains/:learnerId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const parseResult = GetByLearnerParams.safeParse(request.params);
      if (!parseResult.success) {
        return reply.status(400).send({ error: 'Invalid learner ID' });
      }

      const { learnerId } = parseResult.data;

      const virtualBrain = await prisma.virtualBrain.findFirst({
        where: {
          learnerId,
          tenantId: user.tenantId,
        },
        include: {
          skillStates: {
            include: {
              skill: {
                select: {
                  id: true,
                  skillCode: true,
                  domain: true,
                  gradeBand: true,
                  displayName: true,
                  description: true,
                },
              },
            },
            orderBy: [{ skill: { domain: 'asc' } }, { masteryLevel: 'desc' }],
          },
        },
      });

      if (!virtualBrain) {
        return reply.status(404).send({ error: 'Virtual brain not found for this learner' });
      }

      // Format response
      const response = {
        id: virtualBrain.id,
        learnerId: virtualBrain.learnerId,
        tenantId: virtualBrain.tenantId,
        gradeBand: virtualBrain.gradeBand,
        baselineProfileId: virtualBrain.baselineProfileId,
        baselineAttemptId: virtualBrain.baselineAttemptId,
        createdAt: virtualBrain.createdAt.toISOString(),
        updatedAt: virtualBrain.updatedAt.toISOString(),
        skillStates: (virtualBrain.skillStates as SkillStateWithRelations[]).map((ss) => ({
          id: ss.id,
          skillId: ss.skillId,
          skillCode: ss.skill.skillCode,
          domain: ss.skill.domain,
          gradeBand: ss.skill.gradeBand,
          displayName: ss.skill.displayName,
          description: ss.skill.description,
          masteryLevel: Number(ss.masteryLevel),
          confidence: Number(ss.confidence),
          practiceCount: ss.practiceCount,
          correctStreak: ss.correctStreak,
          lastAssessedAt: ss.lastAssessedAt.toISOString(),
        })),
        summary: {
          totalSkills: virtualBrain.skillStates.length,
          byDomain: Object.fromEntries(
            ['ELA', 'MATH', 'SCIENCE', 'SPEECH', 'SEL'].map((domain) => {
              const domainStates = (virtualBrain.skillStates as SkillStateWithRelations[]).filter(
                (ss) => ss.skill.domain === domain
              );
              return [
                domain,
                {
                  count: domainStates.length,
                  avgMastery:
                    domainStates.length > 0
                      ? domainStates.reduce((sum: number, ss) => sum + Number(ss.masteryLevel), 0) /
                        domainStates.length
                      : 0,
                },
              ];
            })
          ),
        },
      };

      return reply.send(response);
    }
  );

  /**
   * GET /virtual-brains/:learnerId/skill-graph
   * Get the skill graph with prerequisites for a learner.
   * Includes mastery status and recommended next skills.
   */
  fastify.get(
    '/virtual-brains/:learnerId/skill-graph',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const parseResult = GetByLearnerParams.safeParse(request.params);
      if (!parseResult.success) {
        return reply.status(400).send({ error: 'Invalid learner ID' });
      }

      const { learnerId } = parseResult.data;

      const virtualBrain = await prisma.virtualBrain.findFirst({
        where: {
          learnerId,
          tenantId: user.tenantId,
        },
        include: {
          skillStates: {
            include: {
              skill: {
                include: {
                  hasPrerequisite: {
                    include: {
                      prerequisiteSkill: {
                        select: { id: true, skillCode: true, displayName: true },
                      },
                    },
                  },
                  prerequisiteFor: {
                    include: {
                      dependentSkill: {
                        select: { id: true, skillCode: true, displayName: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!virtualBrain) {
        return reply.status(404).send({ error: 'Virtual brain not found' });
      }

      // Build skill graph with mastery status
      const MASTERY_THRESHOLD = 0.7;
      const typedStates = virtualBrain.skillStates as SkillStateWithRelations[];

      const skillGraph: SkillGraphNode[] = typedStates.map((ss) => {
        const isMastered = Number(ss.masteryLevel) >= MASTERY_THRESHOLD;

        // Check if all prerequisites are mastered
        const prerequisites = (ss.skill.hasPrerequisite || []).map((p: PrerequisiteRelation) => {
          const prereqState = typedStates.find((s) => s.skillId === p.prerequisiteSkillId);
          return {
            skillId: p.prerequisiteSkill.id,
            skillCode: p.prerequisiteSkill.skillCode,
            displayName: p.prerequisiteSkill.displayName,
            isMastered: prereqState ? Number(prereqState.masteryLevel) >= MASTERY_THRESHOLD : false,
          };
        });

        const allPrereqsMastered = prerequisites.every((p) => p.isMastered);
        const isReady = !isMastered && allPrereqsMastered;

        return {
          skillId: ss.skillId,
          skillCode: ss.skill.skillCode,
          displayName: ss.skill.displayName,
          domain: ss.skill.domain,
          masteryLevel: Number(ss.masteryLevel),
          isMastered,
          isReady,
          prerequisites,
          dependents: (ss.skill.prerequisiteFor || []).map((d: DependentRelation) => ({
            skillId: d.dependentSkill.id,
            skillCode: d.dependentSkill.skillCode,
            displayName: d.dependentSkill.displayName,
          })),
        };
      });

      // Find recommended next skills (ready but not mastered)
      const recommendedSkills = skillGraph
        .filter((s) => s.isReady)
        .sort((a, b) => a.masteryLevel - b.masteryLevel)
        .slice(0, 5);

      return reply.send({
        learnerId: virtualBrain.learnerId,
        skillGraph,
        recommendedSkills,
        stats: {
          totalSkills: skillGraph.length,
          masteredSkills: skillGraph.filter((s) => s.isMastered).length,
          readySkills: skillGraph.filter((s) => s.isReady).length,
        },
      });
    }
  );
}
