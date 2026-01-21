/**
 * AI Coach Routes
 *
 * Agentic AI integration for interactive life skills guidance.
 * Connects to the AI Orchestrator for adaptive prompting and coaching.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { prisma, PromptLevel } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const PromptLevelEnum = z.nativeEnum(PromptLevel);

const GetGuidanceSchema = z.object({
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid(),
  skillId: z.string().uuid(),
  stepNumber: z.number().int().min(1),
  sessionId: z.string().uuid().optional(),
  context: z
    .object({
      currentPromptLevel: PromptLevelEnum.optional(),
      previousAttempts: z.number().int().min(0).optional(),
      lastError: z.string().optional(),
      learnerMood: z.string().optional(),
      timeSpentSeconds: z.number().int().min(0).optional(),
    })
    .optional(),
});

const GetEncouragementSchema = z.object({
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid(),
  skillId: z.string().uuid(),
  event: z.enum([
    'step_completed',
    'skill_started',
    'skill_completed',
    'streak_milestone',
    'struggle_detected',
    'returning_user',
  ]),
  details: z.record(z.unknown()).optional(),
});

const GetSafetyCoachingSchema = z.object({
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid(),
  scenarioId: z.string().uuid(),
  choiceId: z.string().uuid(),
  outcome: z.enum(['SAFE', 'UNSAFE', 'PARTIALLY_SAFE']),
});

const LogInteractionSchema = z.object({
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid(),
  skillId: z.string().uuid().optional(),
  scenarioId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  interactionType: z.enum([
    'prompt',
    'encouragement',
    'correction',
    'celebration',
    'safety_coaching',
  ]),
  userInput: z.string().optional(),
  aiResponse: z.string(),
  wasHelpful: z.boolean().optional(),
  learnerReaction: z.enum(['positive', 'neutral', 'confused', 'frustrated']).optional(),
  responseTimeMs: z.number().int().min(0).optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// AI COACHING TEMPLATES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate step-by-step guidance based on learner context
 */
function generateStepGuidance(
  step: { instruction: string; detailedPrompt?: string | null; aiPromptTemplate?: string | null },
  context: {
    promptLevel?: PromptLevel;
    previousAttempts?: number;
    lastError?: string;
  }
): { guidance: string; visualCue?: string; audioPrompt?: string } {
  const promptLevel = context.promptLevel ?? 'VERBAL';
  const attempts = context.previousAttempts ?? 0;

  // Base instruction
  let guidance = step.instruction;

  // Adapt based on prompt level
  switch (promptLevel) {
    case 'FULL_PHYSICAL':
      guidance = `Let's do this together! ${step.instruction}. I'll help guide your hands.`;
      break;
    case 'PARTIAL_PHYSICAL':
      guidance = `You're doing great! ${step.instruction}. I'll give you a little help.`;
      break;
    case 'MODELING':
      guidance = `Watch me first, then you try! ${step.instruction}`;
      break;
    case 'GESTURAL':
      guidance = `Look where I'm pointing. ${step.instruction}`;
      break;
    case 'VERBAL':
      guidance = step.detailedPrompt ?? `Now it's time to: ${step.instruction}`;
      break;
    case 'VISUAL':
      guidance = `Look at the picture. Can you do this step?`;
      break;
    case 'INDEPENDENT':
      guidance = `What's the next step?`;
      break;
  }

  // Adapt based on attempts
  if (attempts >= 3 && context.lastError) {
    guidance = `Let's try a different way. ${step.instruction}. Remember, ${context.lastError} - let's avoid that this time!`;
  } else if (attempts >= 2) {
    guidance = `You're working so hard! Let's try once more. ${step.instruction}`;
  }

  return {
    guidance,
    visualCue: step.aiPromptTemplate ?? undefined,
    audioPrompt: step.instruction,
  };
}

/**
 * Generate encouragement messages
 */
function generateEncouragement(
  event: string,
  details: Record<string, unknown>
): { message: string; celebration?: string } {
  switch (event) {
    case 'step_completed': {
      const stepMessages = [
        'Great job! You did it! 🌟',
        'Awesome work! On to the next step! ⭐',
        "You're doing amazing! Keep going! 🎉",
        'Wonderful! That was perfect! 👏',
        "Super! You're a star! ⭐",
      ];
      return {
        message: stepMessages[Math.floor(Math.random() * stepMessages.length)],
      };
    }

    case 'skill_started':
      return {
        message: `Let's learn something new together! This is going to be fun! 🎈`,
      };

    case 'skill_completed':
      return {
        message: 'WOW! You completed the whole thing! You are AMAZING! 🎊🌟🎉',
        celebration: 'confetti',
      };

    case 'streak_milestone': {
      const days = (details.streak as number | undefined) ?? 1;
      return {
        message: `Incredible! You've practiced for ${days} days in a row! 🔥`,
        celebration: 'stars',
      };
    }

    case 'struggle_detected':
      return {
        message:
          "It's okay, learning takes time. Let's take a deep breath and try again. You've got this! 💪",
      };

    case 'returning_user':
      return {
        message: "Welcome back! I'm so happy to see you! Ready to practice? 😊",
      };

    default:
      return {
        message: "You're doing great! Keep it up! 🌟",
      };
  }
}

/**
 * Generate safety scenario coaching
 */
function generateSafetyCoaching(
  outcome: string,
  choice: { explanation: string; feedbackText: string },
  _scenario: { title: string; aiCoachingTemplate?: string | null }
): { coaching: string; followUp?: string } {
  switch (outcome) {
    case 'SAFE':
      return {
        coaching: `Excellent choice! ${choice.feedbackText} You made the safe decision! 🛡️`,
        followUp: 'Can you tell me why that was the safe choice?',
      };

    case 'UNSAFE':
      return {
        coaching: `Let's think about that choice. ${choice.explanation} ${choice.feedbackText}`,
        followUp: 'What could you do differently next time to stay safe?',
      };

    case 'PARTIALLY_SAFE':
      return {
        coaching: `Good thinking, but there's an even better choice! ${choice.explanation}`,
        followUp: 'What else could you do to be completely safe?',
      };

    default:
      return {
        coaching: choice.feedbackText,
      };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function registerAICoachRoutes(app: FastifyInstance): Promise<void> {
  const prefix = '/api/v1/ai-coach';

  // ────────────────────────────────────────────────────────────────────────────
  // POST /ai-coach/guidance - Get AI guidance for a skill step
  // ────────────────────────────────────────────────────────────────────────────
  app.post(`${prefix}/guidance`, async (request, reply) => {
    const data = GetGuidanceSchema.parse(request.body);

    // Get skill and step info
    const skill = await prisma.lifeSkill.findUnique({
      where: { id: data.skillId },
      include: {
        taskAnalysis: {
          include: {
            steps: {
              where: { stepNumber: data.stepNumber },
            },
          },
        },
      },
    });

    if (!skill?.taskAnalysis?.steps[0]) {
      return reply.status(404).send({ error: 'Skill or step not found' });
    }

    const step = skill.taskAnalysis.steps[0];

    // Get learner progress for context
    const learnerProgress = await prisma.learnerSkillProgress.findUnique({
      where: { learnerId_skillId: { learnerId: data.learnerId, skillId: data.skillId } },
    });

    // Generate guidance
    const guidance = generateStepGuidance(step, {
      promptLevel: data.context?.currentPromptLevel ?? learnerProgress?.currentPromptLevel,
      previousAttempts: data.context?.previousAttempts,
      lastError: data.context?.lastError,
    });

    // Log the interaction
    await prisma.aICoachingLog.create({
      data: {
        tenantId: data.tenantId,
        learnerId: data.learnerId,
        skillId: data.skillId,
        sessionId: data.sessionId,
        interactionType: 'prompt',
        aiResponse: guidance.guidance,
      },
    });

    return reply.send({
      guidance: guidance.guidance,
      visualCue: guidance.visualCue,
      audioPrompt: guidance.audioPrompt,
      step: {
        number: step.stepNumber,
        instruction: step.instruction,
        media: {
          imageUrl: step.imageUrl,
          videoUrl: step.videoUrl,
          symbolUrl: step.symbolUrl,
          audioUrl: step.audioUrl,
        },
      },
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // POST /ai-coach/encouragement - Get encouragement message
  // ────────────────────────────────────────────────────────────────────────────
  app.post(`${prefix}/encouragement`, async (request, reply) => {
    const data = GetEncouragementSchema.parse(request.body);

    const encouragement = generateEncouragement(data.event, data.details ?? {});

    // Log the interaction
    await prisma.aICoachingLog.create({
      data: {
        tenantId: data.tenantId,
        learnerId: data.learnerId,
        skillId: data.skillId,
        interactionType: data.event === 'skill_completed' ? 'celebration' : 'encouragement',
        aiResponse: encouragement.message,
      },
    });

    return reply.send(encouragement);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // POST /ai-coach/safety - Get safety scenario coaching
  // ────────────────────────────────────────────────────────────────────────────
  app.post(`${prefix}/safety`, async (request, reply) => {
    const data = GetSafetyCoachingSchema.parse(request.body);

    // Get scenario and choice
    const choice = await prisma.safetyChoice.findUnique({
      where: { id: data.choiceId },
      include: {
        scenario: true,
      },
    });

    if (!choice) {
      return reply.status(404).send({ error: 'Choice not found' });
    }

    const coaching = generateSafetyCoaching(data.outcome, choice, choice.scenario);

    // Log the interaction
    await prisma.aICoachingLog.create({
      data: {
        tenantId: data.tenantId,
        learnerId: data.learnerId,
        scenarioId: data.scenarioId,
        interactionType: 'safety_coaching',
        aiResponse: coaching.coaching,
      },
    });

    return reply.send(coaching);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // POST /ai-coach/log - Log an AI interaction
  // ────────────────────────────────────────────────────────────────────────────
  app.post(`${prefix}/log`, async (request, reply) => {
    const data = LogInteractionSchema.parse(request.body);

    const log = await prisma.aICoachingLog.create({
      data: {
        tenantId: data.tenantId,
        learnerId: data.learnerId,
        skillId: data.skillId,
        scenarioId: data.scenarioId,
        sessionId: data.sessionId,
        interactionType: data.interactionType,
        userInput: data.userInput,
        aiResponse: data.aiResponse,
        wasHelpful: data.wasHelpful,
        learnerReaction: data.learnerReaction,
        responseTimeMs: data.responseTimeMs,
      },
    });

    return reply.status(201).send({ log });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // GET /ai-coach/analytics - Get AI coaching analytics
  // ────────────────────────────────────────────────────────────────────────────
  app.get<{
    Querystring: { tenantId: string; learnerId?: string; skillId?: string; days?: string };
  }>(`${prefix}/analytics`, async (request, reply) => {
    const { tenantId, learnerId, skillId, days } = request.query;

    if (!tenantId) {
      return reply.status(400).send({ error: 'tenantId is required' });
    }

    const daysAgo = Number.parseInt(days ?? '30', 10);
    const since = new Date();
    since.setDate(since.getDate() - daysAgo);

    const logs = await prisma.aICoachingLog.findMany({
      where: {
        tenantId,
        ...(learnerId && { learnerId }),
        ...(skillId && { skillId }),
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate analytics
    const totalInteractions = logs.length;
    const byType = logs.reduce<Record<string, number>>((acc, log) => {
      acc[log.interactionType] = (acc[log.interactionType] ?? 0) + 1;
      return acc;
    }, {});

    const helpfulCount = logs.filter((l) => l.wasHelpful === true).length;
    const ratedCount = logs.filter((l) => l.wasHelpful !== null).length;
    const helpfulPercent = ratedCount > 0 ? (helpfulCount / ratedCount) * 100 : 0;

    const reactions = logs.reduce<Record<string, number>>((acc, log) => {
      if (log.learnerReaction) {
        acc[log.learnerReaction] = (acc[log.learnerReaction] ?? 0) + 1;
      }
      return acc;
    }, {});

    const avgResponseTime =
      logs.filter((l) => l.responseTimeMs).length > 0
        ? logs.reduce((sum, l) => sum + (l.responseTimeMs ?? 0), 0) /
          logs.filter((l) => l.responseTimeMs).length
        : 0;

    return reply.send({
      analytics: {
        period: { days: daysAgo, since: since.toISOString() },
        totalInteractions,
        byType,
        effectiveness: {
          helpfulPercent,
          ratedCount,
        },
        learnerReactions: reactions,
        averageResponseTimeMs: avgResponseTime,
      },
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // POST /ai-coach/adaptive-plan - Generate adaptive learning plan
  // ────────────────────────────────────────────────────────────────────────────
  app.post<{ Body: { tenantId: string; learnerId: string; skillId: string } }>(
    `${prefix}/adaptive-plan`,
    async (request, reply) => {
      const { learnerId, skillId } = request.body;

      // Get skill with task analysis
      const skill = await prisma.lifeSkill.findUnique({
        where: { id: skillId },
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

      if (!skill?.taskAnalysis) {
        return reply.status(404).send({ error: 'Skill or task analysis not found' });
      }

      // Get learner progress
      const progress = await prisma.learnerSkillProgress.findUnique({
        where: { learnerId_skillId: { learnerId, skillId } },
        include: {
          stepProgress: true,
        },
      });

      // Analyze step mastery
      const stepAnalysis = skill.taskAnalysis.steps.map((step) => {
        const stepProg = progress?.stepProgress.find((sp) => sp.stepId === step.id);
        return {
          stepNumber: step.stepNumber,
          instruction: step.instruction,
          isAcquired: stepProg?.isAcquired ?? false,
          lastPromptLevel: stepProg?.lastPromptLevel ?? 'FULL_PHYSICAL',
          successRate:
            stepProg && stepProg.totalAttempts > 0
              ? (stepProg.successfulAttempts / stepProg.totalAttempts) * 100
              : 0,
          needsWork: !stepProg?.isAcquired || stepProg.lastPromptLevel !== 'INDEPENDENT',
        };
      });

      // Determine focus areas
      const focusSteps = stepAnalysis.filter((s) => s.needsWork).slice(0, 3);
      const masteredSteps = stepAnalysis.filter((s) => s.isAcquired);

      // Generate recommended prompt level for each focus step
      const recommendations = focusSteps.map((step) => {
        let recommendedPrompt: PromptLevel = 'VERBAL';
        if (step.successRate < 25) {
          recommendedPrompt = 'MODELING';
        } else if (step.successRate < 50) {
          recommendedPrompt = 'GESTURAL';
        } else if (step.successRate < 75) {
          recommendedPrompt = 'VERBAL';
        } else {
          recommendedPrompt = 'VISUAL';
        }

        return {
          stepNumber: step.stepNumber,
          instruction: step.instruction,
          currentSuccessRate: step.successRate,
          recommendedPromptLevel: recommendedPrompt,
          strategy: getTeachingStrategy(recommendedPrompt),
        };
      });

      return reply.send({
        plan: {
          skillName: skill.name,
          overallProgress: progress?.masteryPercent ?? 0,
          totalSteps: skill.taskAnalysis.totalSteps,
          masteredSteps: masteredSteps.length,
          focusAreas: recommendations,
          generalRecommendations: [
            progress?.masteryPercent === 0
              ? 'Start with hand-over-hand guidance for the first few sessions'
              : progress?.masteryPercent !== undefined && progress.masteryPercent < 50
                ? 'Focus on one step at a time, celebrating small wins'
                : progress?.masteryPercent !== undefined && progress.masteryPercent < 80
                  ? 'Start fading prompts - give the learner more independence'
                  : 'Practice in different contexts to generalize the skill',
            'Keep sessions short (5-10 minutes) and positive',
            "Use the learner's preferred reinforcement",
            'Take breaks if frustration increases',
          ],
        },
      });
    }
  );
}

/**
 * Get teaching strategy based on prompt level
 */
function getTeachingStrategy(promptLevel: PromptLevel): string {
  switch (promptLevel) {
    case 'FULL_PHYSICAL':
      return 'Use hand-over-hand guidance, physically helping the learner complete the step';
    case 'PARTIAL_PHYSICAL':
      return 'Give a light touch or nudge to guide the movement';
    case 'MODELING':
      return 'Demonstrate the step first, then have the learner imitate';
    case 'GESTURAL':
      return 'Point to the item or location, use gestures to indicate the action';
    case 'VERBAL':
      return 'Give verbal instructions and reminders';
    case 'VISUAL':
      return 'Show a picture or visual cue, wait for independent response';
    case 'INDEPENDENT':
      return 'Allow independent completion with no prompts';
    default:
      return 'Provide appropriate support based on learner needs';
  }
}
