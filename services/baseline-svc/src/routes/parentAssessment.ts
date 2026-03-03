import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { PARENT_ASSESSMENT_QUESTIONS, validateResponses } from '../lib/parentAssessmentQuestions.js';
import { prisma, toJsonValue } from '../prisma.js';

// --- Type definitions ---

interface JwtUser {
  sub: string;
  tenantId?: string;
  tenant_id?: string;
  role: string;
}

// --- Zod Schemas ---

const SubmitAssessmentSchema = z.object({
  responses: z.record(z.unknown()),
});

// IDEA/Section 504 compliant assessment submission schema
const IdeaCompliantAssessmentSchema = z.object({
  learnerId: z.string().uuid(),
  responses: z.record(z.unknown()),
  assessmentType: z.enum(['STANDARD', 'STANDARD_WITH_ACCOMMODATIONS', 'MODIFIED', 'ALTERNATE']),
  supportLevel: z.number().min(0).max(100).optional(),
  recommendations: z.array(z.string()).optional(),
  hasExistingIep: z.boolean().optional(),
  hasExisting504: z.boolean().optional(),
  disabilityCategories: z.array(z.string()).optional(),
  currentServices: z.array(z.string()).optional(),
  assistiveTechnology: z.array(z.string()).optional(),
  additionalNotes: z.string().optional(),
  assessmentSummary: z.object({
    areasOfConcern: z.array(z.string()).optional(),
    strengths: z.array(z.string()).optional(),
  }).optional(),
  ideaCompliant: z.boolean().optional(),
  section504Compliant: z.boolean().optional(),
  submittedAt: z.string().optional(),
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

/**
 * Extract insights from parent assessment responses for AI consumption
 */
function extractInsights(responses: Record<string, unknown>): {
  learningStyleNotes: string;
  strengthsNotes: string;
  challengesNotes: string;
  behaviorNotes: string;
} {
  const insights = {
    learningStyleNotes: '',
    strengthsNotes: '',
    challengesNotes: '',
    behaviorNotes: '',
  };

  const questions = PARENT_ASSESSMENT_QUESTIONS;

  // Extract learning style insights
  const learningStyleQ = questions.filter(q => q.category === 'learning_style');
  const lsResponses: string[] = [];
  for (const q of learningStyleQ) {
    const answer = responses[q.id];
    if (answer) {
      lsResponses.push(`${q.questionText}: ${JSON.stringify(answer)}`);
    }
  }
  insights.learningStyleNotes = lsResponses.join('; ');

  // Extract strengths insights
  const strengthsQ = questions.filter(q => q.category === 'strengths');
  const strResponses: string[] = [];
  for (const q of strengthsQ) {
    const answer = responses[q.id];
    if (answer) {
      strResponses.push(`${q.questionText}: ${JSON.stringify(answer)}`);
    }
  }
  insights.strengthsNotes = strResponses.join('; ');

  // Extract challenges insights
  const challengesQ = questions.filter(q => q.category === 'challenges');
  const chResponses: string[] = [];
  for (const q of challengesQ) {
    const answer = responses[q.id];
    if (answer) {
      chResponses.push(`${q.questionText}: ${JSON.stringify(answer)}`);
    }
  }
  insights.challengesNotes = chResponses.join('; ');

  // Extract behavior insights (combine behavior + preferences + social_emotional)
  const behaviorQ = questions.filter(
    q => q.category === 'behavior' || q.category === 'preferences' || q.category === 'social_emotional'
  );
  const behResponses: string[] = [];
  for (const q of behaviorQ) {
    const answer = responses[q.id];
    if (answer) {
      behResponses.push(`${q.questionText}: ${JSON.stringify(answer)}`);
    }
  }
  insights.behaviorNotes = behResponses.join('; ');

  return insights;
}

// --- Routes ---

export async function parentAssessmentRoutes(fastify: FastifyInstance) {
  /**
   * GET /parent-assessment/questions
   * Get all parent assessment questions
   */
  fastify.get('/parent-assessment/questions', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      questions: PARENT_ASSESSMENT_QUESTIONS,
      totalQuestions: PARENT_ASSESSMENT_QUESTIONS.length,
      categories: [
        'learning_style',
        'strengths',
        'challenges',
        'behavior',
        'preferences',
        'social_emotional',
      ],
    });
  });

  /**
   * GET /parent-assessment/:assessmentId
   * Get parent assessment status and questions
   */
  fastify.get(
    '/parent-assessment/:assessmentId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      const { assessmentId } = request.params as { assessmentId: string };

      const assessment = await prisma.parentAssessment.findUnique({
        where: { id: assessmentId },
        include: {
          profile: {
            select: {
              id: true,
              learnerId: true,
              tenantId: true,
              gradeBand: true,
            },
          },
        },
      });

      if (!assessment) {
        return reply.status(404).send({ error: 'Assessment not found' });
      }

      // Allow access if:
      // 1. User is the parent (parentUserId matches)
      // 2. User is admin/teacher in same tenant
      const canAccess =
        !user ||
        assessment.parentUserId === user.sub ||
        (user.role in { admin: 1, teacher: 1 } && assessment.profile.tenantId === user.tenantId);

      if (!canAccess && user) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      return reply.send({
        id: assessment.id,
        profileId: assessment.baselineProfileId,
        status: assessment.status,
        invitedAt: assessment.invitedAt,
        startedAt: assessment.startedAt,
        completedAt: assessment.completedAt,
        enrolledByRole: assessment.enrolledByRole,
        responses: assessment.status === 'COMPLETED' ? assessment.responsesJson : undefined,
        questions: PARENT_ASSESSMENT_QUESTIONS,
      });
    }
  );

  /**
   * GET /parent-assessment/profile/:profileId
   * Get parent assessment by profile ID
   */
  fastify.get(
    '/parent-assessment/profile/:profileId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      const { profileId } = request.params as { profileId: string };

      const assessment = await prisma.parentAssessment.findUnique({
        where: { baselineProfileId: profileId },
        include: {
          profile: {
            select: {
              id: true,
              learnerId: true,
              tenantId: true,
              gradeBand: true,
            },
          },
        },
      });

      if (!assessment) {
        return reply.status(404).send({ error: 'No parent assessment found for this profile' });
      }

      // Allow access if:
      // 1. User is the parent (parentUserId matches)
      // 2. User is admin/teacher in same tenant
      const canAccess =
        !user ||
        assessment.parentUserId === user.sub ||
        (user.role in { admin: 1, teacher: 1 } && assessment.profile.tenantId === user.tenantId);

      if (!canAccess && user) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      return reply.send({
        id: assessment.id,
        profileId: assessment.baselineProfileId,
        status: assessment.status,
        invitedAt: assessment.invitedAt,
        startedAt: assessment.startedAt,
        completedAt: assessment.completedAt,
        enrolledByRole: assessment.enrolledByRole,
        responses: assessment.status === 'COMPLETED' ? assessment.responsesJson : undefined,
      });
    }
  );

  /**
   * POST /parent-assessment/:assessmentId/start
   * Mark assessment as started (status changes from PENDING to IN_PROGRESS)
   */
  fastify.post(
    '/parent-assessment/:assessmentId/start',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      const { assessmentId } = request.params as { assessmentId: string };

      const assessment = await prisma.parentAssessment.findUnique({
        where: { id: assessmentId },
      });

      if (!assessment) {
        return reply.status(404).send({ error: 'Assessment not found' });
      }

      // Only the parent can start their assessment
      if (user && assessment.parentUserId !== user.sub) {
        return reply.status(403).send({ error: 'Only the assigned parent can start this assessment' });
      }

      if (assessment.status === 'COMPLETED') {
        return reply.status(400).send({ error: 'Assessment already completed' });
      }

      const updated = await prisma.parentAssessment.update({
        where: { id: assessmentId },
        data: {
          status: 'IN_PROGRESS',
          startedAt: assessment.startedAt || new Date(),
        },
      });

      return reply.send(updated);
    }
  );

  /**
   * POST /parent-assessment/:assessmentId/submit
   * Submit parent assessment responses
   */
  fastify.post(
    '/parent-assessment/:assessmentId/submit',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      const { assessmentId } = request.params as { assessmentId: string };

      const parseResult = SubmitAssessmentSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid request body', details: parseResult.error.flatten() });
      }

      const { responses } = parseResult.data;

      // Validate responses
      const validation = validateResponses(responses);
      if (!validation.valid) {
        return reply.status(400).send({
          error: 'Invalid responses',
          validationErrors: validation.errors,
        });
      }

      const assessment = await prisma.parentAssessment.findUnique({
        where: { id: assessmentId },
      });

      if (!assessment) {
        return reply.status(404).send({ error: 'Assessment not found' });
      }

      // Only the parent can submit their assessment
      if (user && assessment.parentUserId !== user.sub) {
        return reply.status(403).send({ error: 'Only the assigned parent can submit this assessment' });
      }

      if (assessment.status === 'COMPLETED') {
        return reply.status(400).send({ error: 'Assessment already completed' });
      }

      // Extract insights from responses
      const insights = extractInsights(responses);

      const updated = await prisma.parentAssessment.update({
        where: { id: assessmentId },
        data: {
          responsesJson: toJsonValue(responses),
          status: 'COMPLETED',
          completedAt: new Date(),
          startedAt: assessment.startedAt || new Date(),
          learningStyleNotes: insights.learningStyleNotes,
          strengthsNotes: insights.strengthsNotes,
          challengesNotes: insights.challengesNotes,
          behaviorNotes: insights.behaviorNotes,
        },
      });

      // ── Notify the enrolling teacher that parent completed assessment ──
      if (assessment.enrolledByRole === 'teacher') {
        void notifyTeacherOfCompletion(assessment.baselineProfileId).catch((err: unknown) => {
          fastify.log.error({ err }, 'Failed to notify teacher of parent assessment completion');
        });
      }

      return reply.send({
        message: 'Parent assessment completed successfully',
        assessment: updated,
      });
    }
  );

  /**
   * PATCH /parent-assessment/:assessmentId
   * Save partial progress (auto-save functionality)
   */
  fastify.patch(
    '/parent-assessment/:assessmentId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      const { assessmentId } = request.params as { assessmentId: string };

      const parseResult = SubmitAssessmentSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid request body', details: parseResult.error.flatten() });
      }

      const { responses } = parseResult.data;

      const assessment = await prisma.parentAssessment.findUnique({
        where: { id: assessmentId },
      });

      if (!assessment) {
        return reply.status(404).send({ error: 'Assessment not found' });
      }

      // Only the parent can update their assessment
      if (user && assessment.parentUserId !== user.sub) {
        return reply.status(403).send({ error: 'Only the assigned parent can update this assessment' });
      }

      if (assessment.status === 'COMPLETED') {
        return reply.status(400).send({ error: 'Cannot update completed assessment' });
      }

      const updated = await prisma.parentAssessment.update({
        where: { id: assessmentId },
        data: {
          responsesJson: toJsonValue(responses),
          status: assessment.status === 'PENDING' ? 'IN_PROGRESS' : assessment.status,
          startedAt: assessment.startedAt || new Date(),
        },
      });

      return reply.send({
        message: 'Progress saved',
        assessment: updated,
      });
    }
  );

  /**
   * POST /parent-assessments
   * Create a new parent assessment with IDEA/Section 504 compliant data
   * This is the main endpoint called by web-parent onboarding flow
   */
  fastify.post(
    '/parent-assessments',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);

      const parseResult = IdeaCompliantAssessmentSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid request body', details: parseResult.error.flatten() });
      }

      const data = parseResult.data;
      const tenantId = user?.tenantId || 'default-tenant';

      try {
        // Find or create baseline profile for the learner
        let profile = await prisma.baselineProfile.findUnique({
          where: {
            tenantId_learnerId: {
              tenantId,
              learnerId: data.learnerId,
            },
          },
        });

        if (!profile) {
          // Create a new baseline profile
          profile = await prisma.baselineProfile.create({
            data: {
              tenantId,
              learnerId: data.learnerId,
              gradeBand: 'K5', // Default, will be updated
              status: 'NOT_STARTED',
            },
          });
        }

        // Extract insights from responses
        const insights = extractInsights(data.responses);

        // Create or update parent assessment
        const assessment = await prisma.parentAssessment.upsert({
          where: { baselineProfileId: profile.id },
          create: {
            baselineProfileId: profile.id,
            parentUserId: user?.sub || 'anonymous',
            parentEmail: null,
            status: 'COMPLETED',
            assessmentType: data.assessmentType,
            supportLevel: data.supportLevel,
            hasExistingIep: data.hasExistingIep || false,
            hasExisting504: data.hasExisting504 || false,
            disabilityCategoriesJson: toJsonValue(data.disabilityCategories || []),
            currentServicesJson: toJsonValue(data.currentServices || []),
            assistiveTechnologyJson: toJsonValue(data.assistiveTechnology || []),
            recommendationsJson: toJsonValue(data.recommendations || []),
            responsesJson: toJsonValue(data.responses),
            learningStyleNotes: insights.learningStyleNotes,
            strengthsNotes: insights.strengthsNotes,
            challengesNotes: insights.challengesNotes,
            behaviorNotes: insights.behaviorNotes,
            enrolledByRole: 'parent',
            completedAt: data.submittedAt ? new Date(data.submittedAt) : new Date(),
          },
          update: {
            status: 'COMPLETED',
            assessmentType: data.assessmentType,
            supportLevel: data.supportLevel,
            hasExistingIep: data.hasExistingIep || false,
            hasExisting504: data.hasExisting504 || false,
            disabilityCategoriesJson: toJsonValue(data.disabilityCategories || []),
            currentServicesJson: toJsonValue(data.currentServices || []),
            assistiveTechnologyJson: toJsonValue(data.assistiveTechnology || []),
            recommendationsJson: toJsonValue(data.recommendations || []),
            responsesJson: toJsonValue(data.responses),
            learningStyleNotes: insights.learningStyleNotes,
            strengthsNotes: insights.strengthsNotes,
            challengesNotes: insights.challengesNotes,
            behaviorNotes: insights.behaviorNotes,
            completedAt: data.submittedAt ? new Date(data.submittedAt) : new Date(),
          },
        });

        // Publish event to profile-svc to sync assessment type
        await publishAssessmentTypeToProfile({
          tenantId,
          learnerId: data.learnerId,
          assessmentType: data.assessmentType,
          supportLevel: data.supportLevel,
          hasExistingIep: data.hasExistingIep || false,
          hasExisting504: data.hasExisting504 || false,
          disabilityCategories: data.disabilityCategories || [],
          parentUserId: user?.sub || 'anonymous',
        });

        fastify.log.info({
          msg: 'Parent assessment saved',
          assessmentId: assessment.id,
          learnerId: data.learnerId,
          assessmentType: data.assessmentType,
        });

        return reply.status(201).send({
          success: true,
          assessmentId: assessment.id,
          profileId: profile.id,
          assessmentType: data.assessmentType,
          message: 'Parent assessment saved successfully',
        });
      } catch (error) {
        fastify.log.error({ error, learnerId: data.learnerId }, 'Failed to save parent assessment');
        return reply.status(500).send({
          error: 'Failed to save parent assessment',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * GET /parent-assessments/learner/:learnerId
   * Get parent assessment by learner ID
   */
  fastify.get(
    '/parent-assessments/learner/:learnerId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      const { learnerId } = request.params as { learnerId: string };
      const tenantId = user?.tenantId || 'default-tenant';

      const profile = await prisma.baselineProfile.findUnique({
        where: {
          tenantId_learnerId: {
            tenantId,
            learnerId,
          },
        },
        include: {
          parentAssessment: true,
        },
      });

      if (!profile?.parentAssessment) {
        return reply.status(404).send({ error: 'No parent assessment found for this learner' });
      }

      const assessment = profile.parentAssessment;

      return reply.send({
        id: assessment.id,
        learnerId,
        profileId: profile.id,
        status: assessment.status,
        assessmentType: assessment.assessmentType,
        supportLevel: assessment.supportLevel,
        hasExistingIep: assessment.hasExistingIep,
        hasExisting504: assessment.hasExisting504,
        disabilityCategories: assessment.disabilityCategoriesJson,
        currentServices: assessment.currentServicesJson,
        assistiveTechnology: assessment.assistiveTechnologyJson,
        recommendations: assessment.recommendationsJson,
        completedAt: assessment.completedAt,
      });
    }
  );
}

/**
 * Notify the enrolling teacher that the parent completed their assessment.
 * The child can now take their baseline. Fire-and-forget — failures are logged but
 * don't block the parent's completion response.
 */
async function notifyTeacherOfCompletion(baselineProfileId: string): Promise<void> {
  const notifySvcUrl = process.env.NOTIFY_SVC_URL || 'http://localhost:4012';

  // Load the profile so we know the learner + tenant
  const profile = await prisma.baselineProfile.findUnique({
    where: { id: baselineProfileId },
  });
  if (!profile) return;

  // Look up the teacher who has this learner in a classroom
  const teacherRows = await prisma.$queryRaw<{ teacherId: string }[]>`
    SELECT DISTINCT csc."teacherId"
    FROM "ClassroomLearner" cl
    JOIN "ClassroomSessionCode" csc
      ON csc."classroomId" = cl."classroomId" AND csc."isActive" = true
    WHERE cl."learnerId" = ${profile.learnerId}::uuid
    LIMIT 1
  `;

  const teacherUserId = teacherRows[0]?.teacherId;
  if (!teacherUserId) {
    console.warn(
      `[notifyTeacherOfCompletion] No teacher found for learner ${profile.learnerId}`,
    );
    return;
  }

  // Look up learner name for a readable notification message
  const learnerRows = await prisma.$queryRaw<{ first_name: string; last_name: string }[]>`
    SELECT first_name, last_name FROM learners
    WHERE id = ${profile.learnerId}::uuid
    LIMIT 1
  `;
  const childName =
    learnerRows[0]
      ? `${learnerRows[0].first_name} ${learnerRows[0].last_name}`.trim()
      : 'A student';

  try {
    await fetch(`${notifySvcUrl}/api/v1/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientId: teacherUserId,
        type: 'PARENT_ASSESSMENT_COMPLETED',
        title: `Parent completed assessment for ${childName}`,
        body: `${childName} can now take their baseline assessment.`,
        channel: ['in-app', 'email'],
        metadata: {
          learnerId: profile.learnerId,
          baselineProfileId: profile.id,
          tenantId: profile.tenantId,
        },
      }),
    });
  } catch (error) {
    console.error('[notifyTeacherOfCompletion] Failed to send notification:', error);
  }
}

/**
 * Publish assessment type to profile-svc
 * This syncs the IDEA-compliant assessment type with the learner's functioning profile
 */
async function publishAssessmentTypeToProfile(data: {
  tenantId: string;
  learnerId: string;
  assessmentType: 'STANDARD' | 'STANDARD_WITH_ACCOMMODATIONS' | 'MODIFIED' | 'ALTERNATE';
  supportLevel?: number;
  hasExistingIep: boolean;
  hasExisting504: boolean;
  disabilityCategories: string[];
  parentUserId: string;
}): Promise<void> {
  const profileServiceUrl = process.env.PROFILE_SERVICE_URL || 'http://profile-svc:3420';
  
  try {
    const response = await fetch(`${profileServiceUrl}/internal/learner-functioning-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Service': 'baseline-svc',
      },
      body: JSON.stringify({
        tenantId: data.tenantId,
        learnerId: data.learnerId,
        assessmentType: data.assessmentType,
        parentAssessmentScore: data.supportLevel,
        hasIepDocumentation: data.hasExistingIep || data.hasExisting504,
        createdByUserId: data.parentUserId,
      }),
    });

    if (response.ok) {
      console.log('[publishAssessmentTypeToProfile] Successfully synced to profile-svc');
    } else {
      const errorText = await response.text();
      console.error('[publishAssessmentTypeToProfile] Failed to sync to profile-svc:', errorText);
    }
  } catch (error) {
    // Log but don't fail - profile sync can be retried
    console.error('[publishAssessmentTypeToProfile] Error syncing to profile-svc:', error);
  }
}
