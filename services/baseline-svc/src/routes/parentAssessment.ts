import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { PARENT_ASSESSMENT_QUESTIONS, validateResponses } from '../lib/parentAssessmentQuestions.js';
import { prisma } from '../prisma.js';

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
          responsesJson: responses as unknown as Record<string, unknown>,
          status: 'COMPLETED',
          completedAt: new Date(),
          startedAt: assessment.startedAt || new Date(),
          learningStyleNotes: insights.learningStyleNotes,
          strengthsNotes: insights.strengthsNotes,
          challengesNotes: insights.challengesNotes,
          behaviorNotes: insights.behaviorNotes,
        },
      });

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
          responsesJson: responses as unknown as Record<string, unknown>,
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
}
