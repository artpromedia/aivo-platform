import type { Prisma, SkillDomain } from '@prisma/client';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';
import { virtualBrainTemplateService } from '../services/virtual-brain-template.js';

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
  location?: {
    stateCode?: string;
    zipCode?: string;
    ncesDistrictId?: string;
  };
  curriculumStandards: string[];
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
  // Geographic location for curriculum alignment
  location: z.object({
    stateCode: z.string().length(2).optional(),
    zipCode: z.string().min(5).max(10).optional(),
    ncesDistrictId: z.string().optional(),
  }).optional(),
  // Curriculum standards to apply (auto-detected from location or manual)
  curriculumStandards: z.array(z.string()).optional(),
});

const UpdateCurriculumSchema = z.object({
  stateCode: z.string().length(2).optional(),
  zipCode: z.string().min(5).max(10).optional(),
  ncesDistrictId: z.string().optional(),
  curriculumStandards: z.array(z.string()),
});

const UpdateReadingLevelSchema = z.object({
  lexileLevel: z.number().min(-100).max(2000),
  lexileLevelLow: z.number().min(-100).max(2000).optional(),
  lexileLevelHigh: z.number().min(-100).max(2000).optional(),
  confidence: z.number().min(0).max(1),
  gradeEquivalent: z.number().min(0).max(16),
  assessmentType: z.enum(['BASELINE', 'ADAPTIVE', 'COMPREHENSION_CHECK', 'ORAL_READING', 'VOCABULARY_PROBE']),
  assessmentDetails: z.object({
    wordsAssessed: z.number().optional(),
    passagesRead: z.number().optional(),
    comprehensionScore: z.number().min(0).max(1).optional(),
    fluencyWpm: z.number().optional(),
  }).optional(),
});

const UpdateContentPreferencesSchema = z.object({
  preferSimplifiedLanguage: z.boolean().optional(),
  targetContentLexile: z.number().min(-100).max(2000).optional(),
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
   * Initialize a Virtual Brain by cloning from a grade-band template
   * and personalizing with baseline assessment results.
   *
   * Called by baseline-svc after accept-final.
   * Uses the "Main AIVO Brain" template for the grade band and personalizes
   * it with the learner's baseline skill estimates.
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
        location,
        curriculumStandards,
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

      try {
        // Clone from the grade-band template and personalize with baseline results
        const cloneResult = await virtualBrainTemplateService.cloneTemplateForLearner({
          tenantId,
          learnerId,
          gradeBand,
          baselineProfileId,
          baselineAttemptId,
          skillEstimates: skillEstimates.map((e) => ({
            skillCode: e.skillCode,
            domain: e.domain as SkillDomain,
            estimatedLevel: e.estimatedLevel,
            confidence: e.confidence,
          })),
          location,
          curriculumStandards,
        });

        const result: InitializationResult & {
          sourceTemplateId: string;
          templateVersion: string;
          skillsPersonalized: number;
        } = {
          virtualBrainId: cloneResult.virtualBrainId,
          learnerId,
          skillsInitialized: cloneResult.skillsInitialized,
          skillsMissing: cloneResult.skillsMissing,
          createdAt: new Date().toISOString(),
          location: location
            ? {
                stateCode: location.stateCode,
                zipCode: location.zipCode,
                ncesDistrictId: location.ncesDistrictId,
              }
            : undefined,
          curriculumStandards: curriculumStandards ?? ['COMMON_CORE'],
          // New fields from template cloning
          sourceTemplateId: cloneResult.sourceTemplateId,
          templateVersion: cloneResult.templateVersion,
          skillsPersonalized: cloneResult.skillsPersonalized,
        };

        return reply.status(201).send(result);
      } catch (error) {
        console.error('[VirtualBrain] Clone failed:', error);
        return reply.status(500).send({
          error: 'Failed to initialize Virtual Brain from template',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * PATCH /virtual-brains/:learnerId/curriculum
   * Update curriculum standards for a learner's Virtual Brain.
   * Called when learner's location changes or district updates curriculum.
   */
  fastify.patch(
    '/virtual-brains/:learnerId/curriculum',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsResult = GetByLearnerParams.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({ error: 'Invalid learner ID' });
      }

      const bodyResult = UpdateCurriculumSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: bodyResult.error.flatten(),
        });
      }

      const { learnerId } = paramsResult.data;
      const { stateCode, zipCode, ncesDistrictId, curriculumStandards } = bodyResult.data;

      // Find the virtual brain
      const virtualBrain = await prisma.virtualBrain.findFirst({
        where: {
          learnerId,
          tenantId: user.tenantId,
        },
      });

      if (!virtualBrain) {
        return reply.status(404).send({ error: 'Virtual brain not found for this learner' });
      }

      // Update the virtual brain with new curriculum info
      const updated = await prisma.virtualBrain.update({
        where: { id: virtualBrain.id },
        data: {
          stateCode: stateCode ?? virtualBrain.stateCode,
          zipCode: zipCode ?? virtualBrain.zipCode,
          ncesDistrictId: ncesDistrictId ?? virtualBrain.ncesDistrictId,
          curriculumStandards,
          curriculumVersion: `${Number(virtualBrain.curriculumVersion?.split('.')[0] ?? 1) + 1}.0`,
        },
      });

      return reply.send({
        id: updated.id,
        learnerId: updated.learnerId,
        location: {
          stateCode: updated.stateCode,
          zipCode: updated.zipCode,
          ncesDistrictId: updated.ncesDistrictId,
        },
        curriculumStandards: updated.curriculumStandards,
        curriculumVersion: updated.curriculumVersion,
        updatedAt: updated.updatedAt.toISOString(),
      });
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
        // Location and curriculum info
        location: {
          stateCode: virtualBrain.stateCode,
          zipCode: virtualBrain.zipCode,
          ncesDistrictId: virtualBrain.ncesDistrictId,
        },
        curriculumStandards: virtualBrain.curriculumStandards,
        curriculumVersion: virtualBrain.curriculumVersion,
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

  /**
   * PATCH /virtual-brains/:learnerId/reading-level
   * Update reading level for a learner's Virtual Brain.
   * Called after reading assessments or comprehension checks.
   */
  fastify.patch(
    '/virtual-brains/:learnerId/reading-level',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsResult = GetByLearnerParams.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({ error: 'Invalid learner ID' });
      }

      const bodyResult = UpdateReadingLevelSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: bodyResult.error.flatten(),
        });
      }

      const { learnerId } = paramsResult.data;
      const {
        lexileLevel,
        lexileLevelLow,
        lexileLevelHigh,
        confidence,
        gradeEquivalent,
        assessmentType,
        assessmentDetails,
      } = bodyResult.data;

      // Find the virtual brain
      const virtualBrain = await prisma.virtualBrain.findFirst({
        where: {
          learnerId,
          tenantId: user.tenantId,
        },
      });

      if (!virtualBrain) {
        return reply.status(404).send({ error: 'Virtual brain not found for this learner' });
      }

      // Update the virtual brain and create assessment record in transaction
      const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Update reading level in virtual brain
        const updated = await tx.virtualBrain.update({
          where: { id: virtualBrain.id },
          data: {
            lexileLevel,
            lexileLevelLow: lexileLevelLow ?? lexileLevel - 75,
            lexileLevelHigh: lexileLevelHigh ?? lexileLevel + 75,
            lexileConfidence: confidence,
            lexileLastAssessed: new Date(),
            readingGradeLevel: gradeEquivalent,
          },
        });

        // Create assessment record for history
        await tx.readingLevelAssessment.create({
          data: {
            virtualBrainId: virtualBrain.id,
            assessmentType,
            lexileLevel,
            gradeEquivalent,
            confidence,
            wordsAssessed: assessmentDetails?.wordsAssessed,
            passagesRead: assessmentDetails?.passagesRead,
            comprehensionScore: assessmentDetails?.comprehensionScore,
            fluencyWpm: assessmentDetails?.fluencyWpm,
            sourceJson: assessmentDetails ?? undefined,
          },
        });

        return updated;
      });

      return reply.send({
        id: result.id,
        learnerId: result.learnerId,
        readingLevel: {
          lexileLevel: result.lexileLevel,
          lexileLevelLow: result.lexileLevelLow,
          lexileLevelHigh: result.lexileLevelHigh,
          lexileConfidence: result.lexileConfidence ? Number(result.lexileConfidence) : null,
          lexileLastAssessed: result.lexileLastAssessed?.toISOString(),
          readingGradeLevel: result.readingGradeLevel ? Number(result.readingGradeLevel) : null,
        },
        updatedAt: result.updatedAt.toISOString(),
      });
    }
  );

  /**
   * GET /virtual-brains/:learnerId/reading-level
   * Get reading level and history for a learner.
   */
  fastify.get(
    '/virtual-brains/:learnerId/reading-level',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsResult = GetByLearnerParams.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({ error: 'Invalid learner ID' });
      }

      const { learnerId } = paramsResult.data;

      const virtualBrain = await prisma.virtualBrain.findFirst({
        where: {
          learnerId,
          tenantId: user.tenantId,
        },
        include: {
          readingAssessments: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!virtualBrain) {
        return reply.status(404).send({ error: 'Virtual brain not found' });
      }

      return reply.send({
        learnerId: virtualBrain.learnerId,
        currentLevel: {
          lexileLevel: virtualBrain.lexileLevel,
          lexileLevelLow: virtualBrain.lexileLevelLow,
          lexileLevelHigh: virtualBrain.lexileLevelHigh,
          lexileConfidence: virtualBrain.lexileConfidence ? Number(virtualBrain.lexileConfidence) : null,
          lexileLastAssessed: virtualBrain.lexileLastAssessed?.toISOString(),
          readingGradeLevel: virtualBrain.readingGradeLevel ? Number(virtualBrain.readingGradeLevel) : null,
        },
        preferences: {
          preferSimplifiedLanguage: virtualBrain.preferSimplifiedLanguage,
          targetContentLexile: virtualBrain.targetContentLexile,
        },
        assessmentHistory: virtualBrain.readingAssessments.map((a) => ({
          id: a.id,
          assessmentType: a.assessmentType,
          lexileLevel: a.lexileLevel,
          gradeEquivalent: Number(a.gradeEquivalent),
          confidence: Number(a.confidence),
          comprehensionScore: a.comprehensionScore ? Number(a.comprehensionScore) : null,
          fluencyWpm: a.fluencyWpm,
          createdAt: a.createdAt.toISOString(),
        })),
      });
    }
  );

  /**
   * PATCH /virtual-brains/:learnerId/content-preferences
   * Update content delivery preferences for language adaptation.
   */
  fastify.patch(
    '/virtual-brains/:learnerId/content-preferences',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const paramsResult = GetByLearnerParams.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({ error: 'Invalid learner ID' });
      }

      const bodyResult = UpdateContentPreferencesSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: bodyResult.error.flatten(),
        });
      }

      const { learnerId } = paramsResult.data;
      const { preferSimplifiedLanguage, targetContentLexile } = bodyResult.data;

      const virtualBrain = await prisma.virtualBrain.findFirst({
        where: {
          learnerId,
          tenantId: user.tenantId,
        },
      });

      if (!virtualBrain) {
        return reply.status(404).send({ error: 'Virtual brain not found' });
      }

      const updated = await prisma.virtualBrain.update({
        where: { id: virtualBrain.id },
        data: {
          preferSimplifiedLanguage: preferSimplifiedLanguage ?? virtualBrain.preferSimplifiedLanguage,
          targetContentLexile: targetContentLexile ?? virtualBrain.targetContentLexile,
        },
      });

      return reply.send({
        id: updated.id,
        learnerId: updated.learnerId,
        preferences: {
          preferSimplifiedLanguage: updated.preferSimplifiedLanguage,
          targetContentLexile: updated.targetContentLexile,
        },
        readingLevel: {
          lexileLevel: updated.lexileLevel,
          effectiveContentLexile: updated.targetContentLexile ?? updated.lexileLevel,
        },
        updatedAt: updated.updatedAt.toISOString(),
      });
    }
  );

  // ── Template Management Routes ─────────────────────────────────────────────

  /**
   * GET /virtual-brains/templates
   * Get all Virtual Brain templates (Main AIVO Brain templates).
   * Used for admin monitoring of template configuration.
   */
  fastify.get(
    '/virtual-brains/templates',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // Only service accounts or admins can view templates
      if (user.role !== 'service' && user.role !== 'admin') {
        return reply.status(403).send({ error: 'Forbidden: admin access required' });
      }

      try {
        const templates = await virtualBrainTemplateService.getAllTemplates();
        return reply.send({
          templates,
          count: templates.length,
        });
      } catch (error) {
        console.error('[VirtualBrain] Failed to get templates:', error);
        return reply.status(500).send({
          error: 'Failed to retrieve templates',
        });
      }
    }
  );

  /**
   * GET /virtual-brains/templates/:gradeBand
   * Get a specific grade band template details.
   */
  fastify.get(
    '/virtual-brains/templates/:gradeBand',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const params = request.params as { gradeBand: string };
      const gradeBand = params.gradeBand as 'K5' | 'G6_8' | 'G9_12';

      if (!['K5', 'G6_8', 'G9_12'].includes(gradeBand)) {
        return reply.status(400).send({ error: 'Invalid grade band' });
      }

      try {
        const template = await virtualBrainTemplateService.getOrCreateTemplate(gradeBand);
        return reply.send({
          id: template.id,
          gradeBand: template.gradeBand,
          name: template.name,
          version: template.version,
          defaultCurriculumStandards: template.defaultCurriculumStandards,
          lexileRange: {
            min: template.defaultLexileMin,
            max: template.defaultLexileMax,
          },
          skillStateCount: template.templateSkillStates.length,
          bktDefaults: template.templateBktDefaults,
        });
      } catch (error) {
        console.error('[VirtualBrain] Failed to get template:', error);
        return reply.status(500).send({
          error: 'Failed to retrieve template',
        });
      }
    }
  );
}
