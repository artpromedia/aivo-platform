import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { applyGuardrails, containsDirectAnswer } from '../guardrails/index.js';
import { prisma } from '../prisma.js';
import { aiOrchestratorClient } from '../services/aiOrchestratorClient.js';
import { sessionServiceClient } from '../services/sessionServiceClient.js';
import type {
  HomeworkGuardrails,
  HomeworkHelperRequest,
  GradeBand,
  Subject,
} from '../types/aiContract.js';

// ══════════════════════════════════════════════════════════════════════════════
// REQUEST SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const startHomeworkSchema = z.object({
  subject: z.enum(['ELA', 'MATH', 'SCIENCE', 'OTHER']),
  gradeBand: z.enum(['K5', 'G6_8', 'G9_12']),
  sourceType: z.enum(['IMAGE', 'TEXT', 'PDF']),
  sourceUrl: z.string().optional(),
  rawText: z.string().min(1, 'Problem text is required'),
  maxSteps: z.number().int().min(1).max(10).default(5),
});

const answerStepSchema = z.object({
  responseText: z.string().min(1, 'Response is required'),
  requestFeedback: z.boolean().default(true),
});

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

interface AuthenticatedUser {
  sub: string;
  tenantId: string;
  learnerId?: string;
  role: string;
}

function getUser(request: FastifyRequest): AuthenticatedUser {
  const user = (request as FastifyRequest & { user?: AuthenticatedUser }).user;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user;
}

function getLearnerId(user: AuthenticatedUser): string {
  // Learner ID comes from JWT claim or falls back to sub
  return user.learnerId ?? user.sub;
}

function buildGuardrails(gradeBand: GradeBand): HomeworkGuardrails {
  return {
    noDirectAnswers: true,
    maxHintsPerStep: 2,
    requireWorkShown: true,
    vocabularyLevel: gradeBand,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export const registerHomeworkRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /homework/start
   * Start a new homework help session.
   * Creates a session, calls AI for scaffolding, stores steps.
   */
  app.post('/start', async (request, reply) => {
    const parsed = startHomeworkSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid request', details: parsed.error.issues });
    }

    const user = getUser(request);
    const learnerId = getLearnerId(user);
    const { subject, gradeBand, sourceType, sourceUrl, rawText, maxSteps } = parsed.data;

    // 1. Create a homework session via session-svc
    let sessionId: string | undefined;
    try {
      const session = await sessionServiceClient.createSession(
        user.tenantId,
        learnerId,
        'HOMEWORK_HELPER',
        {
          subject,
          gradeBand,
          sourceType,
        }
      );
      sessionId = session.id;
    } catch (err) {
      request.log.warn({ err }, 'Failed to create session, proceeding without session tracking');
    }

    // 2. Create the submission record
    const submission = await prisma.homeworkSubmission.create({
      data: {
        tenantId: user.tenantId,
        learnerId,
        sessionId,
        subject: subject as Subject,
        gradeBand: gradeBand as GradeBand,
        sourceType,
        sourceUrl: sourceUrl ?? null,
        rawText,
        status: 'RECEIVED',
      },
    });

    // 3. Emit HOMEWORK_CAPTURED event
    if (sessionId) {
      try {
        await sessionServiceClient.emitEvent(sessionId, 'HOMEWORK_CAPTURED', {
          submissionId: submission.id,
          sourceType,
          textLength: rawText.length,
        });
      } catch (err) {
        request.log.warn({ err }, 'Failed to emit HOMEWORK_CAPTURED event');
      }
    }

    // 4. Call AI Orchestrator for scaffolding
    const guardrails = buildGuardrails(gradeBand as GradeBand);
    const aiRequest: HomeworkHelperRequest = {
      subject: subject as Subject,
      gradeBand: gradeBand as GradeBand,
      rawText,
      maxSteps,
      guardrails,
    };

    let aiResponse;
    try {
      aiResponse = await aiOrchestratorClient.generateScaffolding(user.tenantId, aiRequest, {
        correlationId: submission.id,
        learnerId,
        sessionId,
      });
    } catch (err) {
      // Mark submission as failed
      await prisma.homeworkSubmission.update({
        where: { id: submission.id },
        data: {
          status: 'FAILED',
          errorMessage: err instanceof Error ? err.message : 'AI scaffolding failed',
        },
      });

      request.log.error({ err }, 'AI scaffolding failed');
      return reply.code(500).send({ error: 'Failed to generate homework scaffolding' });
    }

    // 5. Apply guardrails to AI response
    const sanitizedSteps = aiResponse.content.steps.map((step) => ({
      ...step,
      promptText: applyGuardrails(step.promptText),
      hintText: step.hintText ? applyGuardrails(step.hintText) : undefined,
    }));

    // 6. Store the steps
    const stepRecords = await Promise.all(
      sanitizedSteps.map((step) =>
        prisma.homeworkStep.create({
          data: {
            submissionId: submission.id,
            stepOrder: step.stepOrder,
            promptText: step.promptText,
            hintText: step.hintText ?? null,
            expectedConcept: step.expectedConcept ?? null,
          },
        })
      )
    );

    // 7. Update submission status
    await prisma.homeworkSubmission.update({
      where: { id: submission.id },
      data: {
        status: 'SCAFFOLDED',
        stepCount: stepRecords.length,
        aiCorrelationId: submission.id,
      },
    });

    // 8. Emit HOMEWORK_PARSED event
    if (sessionId) {
      try {
        await sessionServiceClient.emitEvent(sessionId, 'HOMEWORK_PARSED', {
          submissionId: submission.id,
          stepCount: stepRecords.length,
          problemType: aiResponse.content.problemType,
        });
      } catch (err) {
        request.log.warn({ err }, 'Failed to emit HOMEWORK_PARSED event');
      }
    }

    return reply.code(201).send({
      submission: {
        id: submission.id,
        sessionId,
        subject,
        gradeBand,
        status: 'SCAFFOLDED',
        stepCount: stepRecords.length,
      },
      steps: stepRecords.map((s) => ({
        id: s.id,
        stepOrder: s.stepOrder,
        promptText: s.promptText,
        isStarted: s.isStarted,
        isCompleted: s.isCompleted,
      })),
    });
  });

  /**
   * GET /homework/:homeworkId/steps
   * Get all steps for a homework submission.
   */
  app.get<{ Params: { homeworkId: string } }>('/:homeworkId/steps', async (request, reply) => {
    const user = getUser(request);
    const { homeworkId } = request.params;

    const submission = await prisma.homeworkSubmission.findFirst({
      where: {
        id: homeworkId,
        tenantId: user.tenantId,
        learnerId: getLearnerId(user),
      },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
          include: {
            responses: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!submission) {
      return reply.code(404).send({ error: 'Homework submission not found' });
    }

    return reply.send({
      submission: {
        id: submission.id,
        sessionId: submission.sessionId,
        subject: submission.subject,
        gradeBand: submission.gradeBand,
        status: submission.status,
        stepCount: submission.stepCount,
        stepsCompleted: submission.stepsCompleted,
      },
      steps: submission.steps.map((step) => ({
        id: step.id,
        stepOrder: step.stepOrder,
        promptText: step.promptText,
        hintText: step.hintRevealed ? step.hintText : undefined,
        isStarted: step.isStarted,
        isCompleted: step.isCompleted,
        hintRevealed: step.hintRevealed,
        lastResponse: step.responses[0]
          ? {
              responseText: step.responses[0].responseText,
              aiFeedback: step.responses[0].aiFeedback,
              isCorrect: step.responses[0].isCorrect,
            }
          : undefined,
      })),
    });
  });

  /**
   * POST /homework/steps/:stepId/answer
   * Submit an answer for a homework step.
   */
  app.post<{ Params: { stepId: string } }>('/steps/:stepId/answer', async (request, reply) => {
    const parsed = answerStepSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid request', details: parsed.error.issues });
    }

    const user = getUser(request);
    const { stepId } = request.params;
    const { responseText, requestFeedback } = parsed.data;

    // Get the step and its submission
    const step = await prisma.homeworkStep.findUnique({
      where: { id: stepId },
      include: {
        submission: true,
      },
    });

    if (
      !step ||
      step.submission.tenantId !== user.tenantId ||
      step.submission.learnerId !== getLearnerId(user)
    ) {
      return reply.code(404).send({ error: 'Step not found' });
    }

    // Mark step as started if not already
    if (!step.isStarted) {
      await prisma.homeworkStep.update({
        where: { id: stepId },
        data: { isStarted: true },
      });

      // Emit HOMEWORK_STEP_STARTED event
      if (step.submission.sessionId) {
        try {
          await sessionServiceClient.emitEvent(step.submission.sessionId, 'HOMEWORK_STEP_STARTED', {
            submissionId: step.submissionId,
            stepId: step.id,
            stepOrder: step.stepOrder,
          });
        } catch (err) {
          request.log.warn({ err }, 'Failed to emit HOMEWORK_STEP_STARTED event');
        }
      }
    }

    // Create the response record
    let aiFeedback: string | null = null;
    let isCorrect: boolean | null = null;
    let aiCorrelationId: string | null = null;

    // Generate AI feedback if requested
    if (requestFeedback) {
      try {
        const feedbackResponse = await aiOrchestratorClient.generateFeedback(
          user.tenantId,
          {
            subject: step.submission.subject as Subject,
            gradeBand: step.submission.gradeBand as GradeBand,
            originalProblem: step.submission.rawText,
            stepPrompt: step.promptText,
            learnerResponse: responseText,
            expectedConcept: step.expectedConcept ?? undefined,
            guardrails: buildGuardrails(step.submission.gradeBand as GradeBand),
          },
          {
            correlationId: stepId,
            learnerId: getLearnerId(user),
            sessionId: step.submission.sessionId ?? undefined,
          }
        );

        // Apply guardrails to feedback
        aiFeedback = applyGuardrails(feedbackResponse.content.feedback);
        isCorrect = feedbackResponse.content.demonstratesUnderstanding;
        aiCorrelationId = stepId;

        // Check if feedback accidentally contains a direct answer
        if (containsDirectAnswer(aiFeedback)) {
          request.log.warn({ feedback: aiFeedback }, 'Feedback contained direct answer, redacting');
          aiFeedback =
            "Great effort! Let's think about this step by step. What approach did you use?";
        }
      } catch (err) {
        request.log.warn({ err }, 'Failed to generate AI feedback');
        // Continue without AI feedback
      }
    }

    const stepResponse = await prisma.homeworkStepResponse.create({
      data: {
        stepId,
        responseText,
        aiFeedback,
        isCorrect,
        aiCorrelationId,
      },
    });

    // Mark step as completed if correct
    if (isCorrect === true) {
      await prisma.homeworkStep.update({
        where: { id: stepId },
        data: { isCompleted: true },
      });

      // Update submission's completed count
      await prisma.homeworkSubmission.update({
        where: { id: step.submissionId },
        data: {
          stepsCompleted: { increment: 1 },
        },
      });

      // Emit HOMEWORK_STEP_COMPLETED event
      if (step.submission.sessionId) {
        try {
          await sessionServiceClient.emitEvent(
            step.submission.sessionId,
            'HOMEWORK_STEP_COMPLETED',
            {
              submissionId: step.submissionId,
              stepId: step.id,
              stepOrder: step.stepOrder,
              isCorrect: true,
            }
          );
        } catch (err) {
          request.log.warn({ err }, 'Failed to emit HOMEWORK_STEP_COMPLETED event');
        }
      }
    }

    return reply.send({
      response: {
        id: stepResponse.id,
        stepId,
        responseText: stepResponse.responseText,
        aiFeedback: stepResponse.aiFeedback,
        isCorrect: stepResponse.isCorrect,
      },
      step: {
        id: step.id,
        stepOrder: step.stepOrder,
        isStarted: true,
        isCompleted: isCorrect === true,
      },
    });
  });

  /**
   * POST /homework/steps/:stepId/hint
   * Request a hint for a step.
   */
  app.post<{ Params: { stepId: string } }>('/steps/:stepId/hint', async (request, reply) => {
    const user = getUser(request);
    const { stepId } = request.params;

    const step = await prisma.homeworkStep.findUnique({
      where: { id: stepId },
      include: {
        submission: true,
      },
    });

    if (
      !step ||
      step.submission.tenantId !== user.tenantId ||
      step.submission.learnerId !== getLearnerId(user)
    ) {
      return reply.code(404).send({ error: 'Step not found' });
    }

    if (!step.hintText) {
      return reply.code(400).send({ error: 'No hint available for this step' });
    }

    // Reveal the hint
    await prisma.homeworkStep.update({
      where: { id: stepId },
      data: { hintRevealed: true },
    });

    // Emit HOMEWORK_HINT_REQUESTED event
    if (step.submission.sessionId) {
      try {
        await sessionServiceClient.emitEvent(step.submission.sessionId, 'HOMEWORK_HINT_REQUESTED', {
          submissionId: step.submissionId,
          stepId: step.id,
          stepOrder: step.stepOrder,
        });
      } catch (err) {
        request.log.warn({ err }, 'Failed to emit HOMEWORK_HINT_REQUESTED event');
      }
    }

    return reply.send({
      step: {
        id: step.id,
        stepOrder: step.stepOrder,
        hintText: step.hintText,
        hintRevealed: true,
      },
    });
  });

  /**
   * POST /homework/:homeworkId/complete
   * Mark homework as completed and end the session.
   */
  app.post<{ Params: { homeworkId: string } }>('/:homeworkId/complete', async (request, reply) => {
    const user = getUser(request);
    const { homeworkId } = request.params;

    const submission = await prisma.homeworkSubmission.findFirst({
      where: {
        id: homeworkId,
        tenantId: user.tenantId,
        learnerId: getLearnerId(user),
      },
      include: {
        steps: true,
      },
    });

    if (!submission) {
      return reply.code(404).send({ error: 'Homework submission not found' });
    }

    if (submission.status === 'COMPLETED') {
      return reply.code(400).send({ error: 'Homework already completed' });
    }

    // Update submission status
    const completedSteps = submission.steps.filter((s) => s.isCompleted).length;
    await prisma.homeworkSubmission.update({
      where: { id: homeworkId },
      data: {
        status: 'COMPLETED',
        stepsCompleted: completedSteps,
      },
    });

    // End the session
    if (submission.sessionId) {
      try {
        await sessionServiceClient.endSession(submission.sessionId, {
          submissionId: submission.id,
          subject: submission.subject,
          gradeBand: submission.gradeBand,
          stepCount: submission.stepCount,
          stepsCompleted: completedSteps,
          completionRate: submission.stepCount > 0 ? completedSteps / submission.stepCount : 0,
        });
      } catch (err) {
        request.log.warn({ err }, 'Failed to end session');
      }
    }

    return reply.send({
      submission: {
        id: submission.id,
        sessionId: submission.sessionId,
        status: 'COMPLETED',
        stepCount: submission.stepCount,
        stepsCompleted: completedSteps,
        completionRate: submission.stepCount > 0 ? completedSteps / submission.stepCount : 0,
      },
    });
  });

  /**
   * GET /homework/submissions
   * List homework submissions for the current learner.
   */
  app.get('/submissions', async (request, reply) => {
    const user = getUser(request);
    const learnerId = getLearnerId(user);

    const submissions = await prisma.homeworkSubmission.findMany({
      where: {
        tenantId: user.tenantId,
        learnerId,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        sessionId: true,
        subject: true,
        gradeBand: true,
        sourceType: true,
        status: true,
        stepCount: true,
        stepsCompleted: true,
        createdAt: true,
      },
    });

    return reply.send({ submissions });
  });
};
