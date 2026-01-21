/**
 * Sessions Routes
 *
 * Skill practice session tracking.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { prisma, PromptLevel } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const PromptLevelEnum = z.nativeEnum(PromptLevel);

const StartSessionSchema = z.object({
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid(),
  skillId: z.string().uuid(),
  context: z.string().optional(),
  facilitator: z.string().optional(),
  facilitatorRole: z.enum(['PARENT', 'TEACHER', 'AIDE', 'THERAPIST', 'SELF']).optional(),
});

const RecordStepAttemptSchema = z.object({
  stepNumber: z.number().int().min(1),
  wasSuccessful: z.boolean(),
  promptLevel: PromptLevelEnum,
  durationSeconds: z.number().int().min(0).optional(),
  errorType: z.string().optional(),
  errorNotes: z.string().optional(),
  aiPromptGiven: z.string().optional(),
  aiResponseUsed: z.boolean().optional(),
});

const EndSessionSchema = z.object({
  overallPromptLevel: PromptLevelEnum.optional(),
  learnerMood: z.enum(['happy', 'calm', 'tired', 'frustrated', 'upset']).optional(),
  engagementLevel: z.number().int().min(1).max(5).optional(),
  sessionNotes: z.string().optional(),
  nextSessionFocus: z.string().optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function registerSessionRoutes(app: FastifyInstance): Promise<void> {
  const prefix = '/api/v1/sessions';

  // ────────────────────────────────────────────────────────────────────────────
  // POST /sessions/start - Start a new skill session
  // ────────────────────────────────────────────────────────────────────────────
  app.post(`${prefix}/start`, async (request, reply) => {
    const data = StartSessionSchema.parse(request.body);

    // Get or create learner progress
    let learnerProgress = await prisma.learnerSkillProgress.findUnique({
      where: { learnerId_skillId: { learnerId: data.learnerId, skillId: data.skillId } },
    });

    if (!learnerProgress) {
      // Get skill to initialize
      const skill = await prisma.lifeSkill.findUnique({
        where: { id: data.skillId },
        include: {
          taskAnalysis: {
            include: { steps: true },
          },
        },
      });

      if (!skill) {
        return reply.status(404).send({ error: 'Skill not found' });
      }

      learnerProgress = await prisma.learnerSkillProgress.create({
        data: {
          tenantId: data.tenantId,
          learnerId: data.learnerId,
          skillId: data.skillId,
          totalSteps: skill.taskAnalysis?.steps.length ?? 0,
          status: 'INTRODUCED',
          stepProgress: skill.taskAnalysis
            ? {
                create: skill.taskAnalysis.steps.map((step) => ({
                  stepId: step.id,
                })),
              }
            : undefined,
        },
      });
    }

    // Create session
    const session = await prisma.skillSession.create({
      data: {
        learnerProgressId: learnerProgress.id,
        context: data.context,
        facilitator: data.facilitator,
        facilitatorRole: data.facilitatorRole,
        startedAt: new Date(),
      },
      include: {
        learnerProgress: {
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
            stepProgress: true,
          },
        },
      },
    });

    // Update progress status if first session
    if (learnerProgress.status === 'NOT_INTRODUCED') {
      await prisma.learnerSkillProgress.update({
        where: { id: learnerProgress.id },
        data: { status: 'INTRODUCED' },
      });
    }

    return reply.status(201).send({ session });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // POST /sessions/:id/step - Record a step attempt
  // ────────────────────────────────────────────────────────────────────────────
  app.post<{ Params: { id: string } }>(`${prefix}/:id/step`, async (request, reply) => {
    const { id } = request.params;
    const data = RecordStepAttemptSchema.parse(request.body);

    // Verify session exists
    const session = await prisma.skillSession.findUnique({
      where: { id },
      include: {
        learnerProgress: true,
      },
    });

    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    if (session.endedAt) {
      return reply.status(400).send({ error: 'Session has already ended' });
    }

    // Record the attempt
    const attempt = await prisma.stepAttempt.create({
      data: {
        sessionId: id,
        stepNumber: data.stepNumber,
        wasSuccessful: data.wasSuccessful,
        promptLevel: data.promptLevel,
        attemptedAt: new Date(),
        durationSeconds: data.durationSeconds,
        errorType: data.errorType,
        errorNotes: data.errorNotes,
        aiPromptGiven: data.aiPromptGiven,
        aiResponseUsed: data.aiResponseUsed ?? false,
      },
    });

    // Update session counts
    await prisma.skillSession.update({
      where: { id },
      data: {
        stepsAttempted: { increment: 1 },
        ...(data.wasSuccessful && { stepsCompleted: { increment: 1 } }),
        ...(data.aiPromptGiven && {
          aiGuidanceUsed: true,
          aiInteractionCount: { increment: 1 },
        }),
      },
    });

    // Update step progress if successful
    if (data.wasSuccessful) {
      // Find the step
      const taskAnalysis = await prisma.taskAnalysis.findFirst({
        where: { skill: { learnerProgress: { some: { id: session.learnerProgressId } } } },
        include: { steps: true },
      });

      const step = taskAnalysis?.steps.find((s) => s.stepNumber === data.stepNumber);

      if (step) {
        await prisma.stepProgress.upsert({
          where: {
            learnerProgressId_stepId: {
              learnerProgressId: session.learnerProgressId,
              stepId: step.id,
            },
          },
          create: {
            learnerProgressId: session.learnerProgressId,
            stepId: step.id,
            totalAttempts: 1,
            successfulAttempts: 1,
            lastPromptLevel: data.promptLevel,
            isAcquired: data.promptLevel === 'INDEPENDENT' || data.promptLevel === 'VISUAL',
            acquisitionDate: data.promptLevel === 'INDEPENDENT' ? new Date() : undefined,
          },
          update: {
            totalAttempts: { increment: 1 },
            successfulAttempts: { increment: 1 },
            lastPromptLevel: data.promptLevel,
            // Mark as acquired if done with minimal prompting
            ...(data.promptLevel === 'INDEPENDENT' && {
              isAcquired: true,
              acquisitionDate: new Date(),
            }),
          },
        });
      }
    }

    return reply.send({ attempt });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // POST /sessions/:id/end - End a session
  // ────────────────────────────────────────────────────────────────────────────
  app.post<{ Params: { id: string } }>(`${prefix}/:id/end`, async (request, reply) => {
    const { id } = request.params;
    const data = EndSessionSchema.parse(request.body);

    const session = await prisma.skillSession.findUnique({
      where: { id },
      include: { learnerProgress: true },
    });

    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    const endedAt = new Date();
    const durationMinutes = Math.round((endedAt.getTime() - session.startedAt.getTime()) / 60000);

    // Update session
    const updatedSession = await prisma.skillSession.update({
      where: { id },
      data: {
        endedAt,
        durationMinutes,
        overallPromptLevel: data.overallPromptLevel,
        learnerMood: data.learnerMood,
        engagementLevel: data.engagementLevel,
        sessionNotes: data.sessionNotes,
        nextSessionFocus: data.nextSessionFocus,
      },
      include: {
        stepAttempts: true,
      },
    });

    // Update learner progress
    const allStepProgress = await prisma.stepProgress.findMany({
      where: { learnerProgressId: session.learnerProgressId },
    });

    const acquiredCount = allStepProgress.filter((sp) => sp.isAcquired).length;
    const totalSteps = session.learnerProgress.totalSteps;
    const masteryPercent = totalSteps > 0 ? (acquiredCount / totalSteps) * 100 : 0;

    // Determine status
    let status = session.learnerProgress.status;
    if (masteryPercent >= 100) {
      status = 'INDEPENDENT';
    } else if (masteryPercent >= 80) {
      status = 'PARTIAL';
    } else if (masteryPercent >= 50) {
      status = 'PROMPTED';
    } else if (masteryPercent > 0) {
      status = 'INTRODUCED';
    }

    // Update streak - if session was today and had progress
    const today = new Date().toDateString();
    const lastSession = session.learnerProgress.lastSessionAt;
    const wasYesterday =
      lastSession && new Date(lastSession.getTime() + 86400000).toDateString() === today;
    const wasToday = lastSession?.toDateString() === today;

    let newStreak = session.learnerProgress.currentStreak;
    if (wasYesterday) {
      newStreak += 1;
    } else if (!wasToday) {
      newStreak = 1;
    }

    await prisma.learnerSkillProgress.update({
      where: { id: session.learnerProgressId },
      data: {
        stepsCompleted: acquiredCount,
        masteryPercent,
        status,
        totalSessions: { increment: 1 },
        totalMinutes: { increment: durationMinutes },
        lastSessionAt: endedAt,
        currentStreak: newStreak,
        longestStreak: Math.max(session.learnerProgress.longestStreak, newStreak),
        ...(status === 'INDEPENDENT' &&
          !session.learnerProgress.achievedAt && {
            achievedAt: endedAt,
          }),
        // Add context if new
        ...(session.context &&
          !session.learnerProgress.contextsAchieved.includes(session.context) && {
            contextsAchieved: { push: session.context },
          }),
      },
    });

    return reply.send({
      session: updatedSession,
      summary: {
        durationMinutes,
        stepsAttempted: updatedSession.stepsAttempted,
        stepsCompleted: updatedSession.stepsCompleted,
        successRate:
          updatedSession.stepsAttempted > 0
            ? (updatedSession.stepsCompleted / updatedSession.stepsAttempted) * 100
            : 0,
        newMastery: masteryPercent,
        status,
        streak: newStreak,
      },
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // GET /sessions/:id - Get session details
  // ────────────────────────────────────────────────────────────────────────────
  app.get<{ Params: { id: string } }>(`${prefix}/:id`, async (request, reply) => {
    const { id } = request.params;

    const session = await prisma.skillSession.findUnique({
      where: { id },
      include: {
        learnerProgress: {
          include: {
            skill: {
              select: { id: true, name: true, iconUrl: true, category: true },
            },
          },
        },
        stepAttempts: {
          orderBy: { attemptedAt: 'asc' },
        },
      },
    });

    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    return reply.send({ session });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // GET /sessions/history - Get session history for a learner
  // ────────────────────────────────────────────────────────────────────────────
  app.get<{
    Querystring: { tenantId: string; learnerId: string; skillId?: string; limit?: string };
  }>(`${prefix}/history`, async (request, reply) => {
    const { tenantId, learnerId, skillId, limit } = request.query;

    if (!tenantId || !learnerId) {
      return reply.status(400).send({ error: 'tenantId and learnerId are required' });
    }

    const sessions = await prisma.skillSession.findMany({
      where: {
        learnerProgress: {
          tenantId,
          learnerId,
          ...(skillId && { skillId }),
        },
      },
      include: {
        learnerProgress: {
          include: {
            skill: {
              select: { id: true, name: true, iconUrl: true, category: true },
            },
          },
        },
        _count: {
          select: { stepAttempts: true },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: limit ? Number.parseInt(limit, 10) : 20,
    });

    return reply.send({ sessions });
  });
}
