/**
 * Safety Scenarios Routes
 *
 * Interactive safety decision-making scenarios.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import {
  prisma,
  SafetyScenarioType,
  DifficultyLevel,
  DecisionOutcome,
  toJsonValue,
} from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const SafetyScenarioTypeEnum = z.nativeEnum(SafetyScenarioType);
const DifficultyLevelEnum = z.nativeEnum(DifficultyLevel);
const DecisionOutcomeEnum = z.nativeEnum(DecisionOutcome);

const GetScenariosQuerySchema = z.object({
  scenarioType: SafetyScenarioTypeEnum.optional(),
  difficulty: DifficultyLevelEnum.optional(),
  tenantId: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
  offset: z.coerce.number().min(0).default(0),
});

const CreateScenarioSchema = z.object({
  tenantId: z.string().uuid().optional(),
  code: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  description: z.string(),
  scenarioType: SafetyScenarioTypeEnum,
  minAgeMonths: z.number().int().min(0).optional(),
  maxAgeMonths: z.number().int().min(0).optional(),
  difficultyLevel: DifficultyLevelEnum.optional(),
  sceneImageUrl: z.string().url().optional(),
  sceneVideoUrl: z.string().url().optional(),
  sceneAudioUrl: z.string().url().optional(),
  sceneDescription: z.string(),
  decisionPrompt: z.string(),
  aiCoachingTemplate: z.string().optional(),
  choices: z
    .array(
      z.object({
        choiceText: z.string(),
        choiceImageUrl: z.string().url().optional(),
        choiceSymbolUrl: z.string().url().optional(),
        outcome: DecisionOutcomeEnum,
        feedbackText: z.string(),
        feedbackVideoUrl: z.string().url().optional(),
        explanation: z.string(),
        orderIndex: z.number().int().optional(),
      })
    )
    .min(2),
});

const RecordAttemptSchema = z.object({
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid(),
  scenarioId: z.string().uuid(),
  choiceId: z.string().uuid(),
  responseTimeMs: z.number().int().min(0).optional(),
  context: z.string().optional(),
  aiGuidanceGiven: z.string().optional(),
  aiFollowUp: z.string().optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function registerSafetyRoutes(app: FastifyInstance): Promise<void> {
  const prefix = '/api/v1/safety';

  // ────────────────────────────────────────────────────────────────────────────
  // GET /safety/scenarios - List all safety scenarios
  // ────────────────────────────────────────────────────────────────────────────
  app.get(`${prefix}/scenarios`, async (request, reply) => {
    const query = GetScenariosQuerySchema.parse(request.query);

    const where = {
      isActive: true,
      ...(query.scenarioType && { scenarioType: query.scenarioType }),
      ...(query.difficulty && { difficultyLevel: query.difficulty }),
      ...(query.tenantId && { OR: [{ tenantId: query.tenantId }, { tenantId: null }] }),
    };

    const [scenarios, total] = await Promise.all([
      prisma.safetyScenario.findMany({
        where,
        take: query.limit,
        skip: query.offset,
        orderBy: [{ scenarioType: 'asc' }, { difficultyLevel: 'asc' }],
        include: {
          _count: { select: { choices: true } },
        },
      }),
      prisma.safetyScenario.count({ where }),
    ]);

    return reply.send({
      scenarios,
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + scenarios.length < total,
      },
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // GET /safety/scenarios/types - List scenario types with info
  // ────────────────────────────────────────────────────────────────────────────
  app.get(`${prefix}/scenarios/types`, async (_, reply) => {
    const types = await prisma.safetyScenario.groupBy({
      by: ['scenarioType'],
      where: { isActive: true },
      _count: { id: true },
    });

    const typeInfo = {
      ROAD_CROSSING: {
        name: 'Road Crossing',
        icon: '🚦',
        description: 'Learn to cross streets safely',
      },
      STRANGER_AWARENESS: {
        name: 'Stranger Awareness',
        icon: '👤',
        description: 'Recognize safe and unsafe people',
      },
      EMERGENCY_RESPONSE: {
        name: 'Emergency Response',
        icon: '🚨',
        description: 'What to do in emergencies',
      },
      FIRE_SAFETY: { name: 'Fire Safety', icon: '🔥', description: 'Fire drills and smoke alarms' },
      WATER_SAFETY: { name: 'Water Safety', icon: '💧', description: 'Pool and bath safety' },
      ONLINE_SAFETY: {
        name: 'Online Safety',
        icon: '💻',
        description: 'Internet and device safety',
      },
      BODY_SAFETY: {
        name: 'Body Safety',
        icon: '🛡️',
        description: 'Personal boundaries and consent',
      },
      HOME_SAFETY: {
        name: 'Home Safety',
        icon: '🏠',
        description: 'Sharp objects, hot items, medicines',
      },
    };

    const result = types.map((t) => ({
      type: t.scenarioType,
      ...typeInfo[t.scenarioType as keyof typeof typeInfo],
      scenarioCount: t._count.id,
    }));

    return reply.send({ types: result });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // GET /safety/scenarios/:id - Get scenario with choices
  // ────────────────────────────────────────────────────────────────────────────
  app.get<{ Params: { id: string } }>(`${prefix}/scenarios/:id`, async (request, reply) => {
    const { id } = request.params;

    const scenario = await prisma.safetyScenario.findUnique({
      where: { id },
      include: {
        choices: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!scenario) {
      return reply.status(404).send({ error: 'Scenario not found' });
    }

    return reply.send({ scenario });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // POST /safety/scenarios - Create a new scenario
  // ────────────────────────────────────────────────────────────────────────────
  app.post(`${prefix}/scenarios`, async (request, reply) => {
    const data = CreateScenarioSchema.parse(request.body);

    const scenario = await prisma.safetyScenario.create({
      data: {
        tenantId: data.tenantId,
        code: data.code,
        title: data.title,
        description: data.description,
        scenarioType: data.scenarioType,
        minAgeMonths: data.minAgeMonths,
        maxAgeMonths: data.maxAgeMonths,
        difficultyLevel: data.difficultyLevel ?? 'FOUNDATIONAL',
        sceneImageUrl: data.sceneImageUrl,
        sceneVideoUrl: data.sceneVideoUrl,
        sceneAudioUrl: data.sceneAudioUrl,
        sceneDescription: data.sceneDescription,
        decisionPrompt: data.decisionPrompt,
        aiCoachingTemplate: data.aiCoachingTemplate,
        isSystemScenario: !data.tenantId,
        choices: {
          create: data.choices.map((choice, index) => ({
            choiceText: choice.choiceText,
            choiceImageUrl: choice.choiceImageUrl,
            choiceSymbolUrl: choice.choiceSymbolUrl,
            outcome: choice.outcome,
            feedbackText: choice.feedbackText,
            feedbackVideoUrl: choice.feedbackVideoUrl,
            explanation: choice.explanation,
            orderIndex: choice.orderIndex ?? index,
          })),
        },
      },
      include: {
        choices: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    return reply.status(201).send({ scenario });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // POST /safety/attempts - Record a scenario attempt
  // ────────────────────────────────────────────────────────────────────────────
  app.post(`${prefix}/attempts`, async (request, reply) => {
    const data = RecordAttemptSchema.parse(request.body);

    // Get the choice to determine outcome
    const choice = await prisma.safetyChoice.findUnique({
      where: { id: data.choiceId },
      include: { scenario: true },
    });

    if (!choice) {
      return reply.status(404).send({ error: 'Choice not found' });
    }

    if (choice.scenarioId !== data.scenarioId) {
      return reply.status(400).send({ error: 'Choice does not belong to this scenario' });
    }

    const attempt = await prisma.safetyAttempt.create({
      data: {
        tenantId: data.tenantId,
        learnerId: data.learnerId,
        scenarioId: data.scenarioId,
        choiceId: data.choiceId,
        outcome: choice.outcome,
        responseTimeMs: data.responseTimeMs,
        context: data.context,
        aiGuidanceGiven: data.aiGuidanceGiven,
        aiFollowUp: data.aiFollowUp,
      },
      include: {
        choice: true,
        scenario: {
          select: { title: true, scenarioType: true },
        },
      },
    });

    return reply.status(201).send({
      attempt,
      feedback: {
        outcome: choice.outcome,
        feedbackText: choice.feedbackText,
        explanation: choice.explanation,
        feedbackVideoUrl: choice.feedbackVideoUrl,
      },
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // GET /safety/attempts/learner/:learnerId - Get learner's safety attempts
  // ────────────────────────────────────────────────────────────────────────────
  app.get<{
    Params: { learnerId: string };
    Querystring: { tenantId: string; scenarioType?: string };
  }>(`${prefix}/attempts/learner/:learnerId`, async (request, reply) => {
    const { learnerId } = request.params;
    const { tenantId, scenarioType } = request.query;

    if (!tenantId) {
      return reply.status(400).send({ error: 'tenantId is required' });
    }

    const attempts = await prisma.safetyAttempt.findMany({
      where: {
        tenantId,
        learnerId,
        ...(scenarioType && { scenario: { scenarioType: scenarioType as SafetyScenarioType } }),
      },
      include: {
        scenario: {
          select: { id: true, title: true, scenarioType: true },
        },
        choice: {
          select: { choiceText: true, outcome: true },
        },
      },
      orderBy: { attemptedAt: 'desc' },
      take: 50,
    });

    // Calculate stats
    const stats = {
      totalAttempts: attempts.length,
      safeChoices: attempts.filter((a) => a.outcome === 'SAFE').length,
      unsafeChoices: attempts.filter((a) => a.outcome === 'UNSAFE').length,
      partiallySafe: attempts.filter((a) => a.outcome === 'PARTIALLY_SAFE').length,
      safetyScore:
        attempts.length > 0
          ? (attempts.filter((a) => a.outcome === 'SAFE').length / attempts.length) * 100
          : 0,
      averageResponseTimeMs:
        attempts.length > 0
          ? attempts.reduce((sum, a) => sum + (a.responseTimeMs ?? 0), 0) /
            attempts.filter((a) => a.responseTimeMs).length
          : 0,
    };

    // Group by scenario type
    const byType: Record<string, { type: string; attempts: number; safePercent: number }> = {};
    for (const attempt of attempts) {
      const type = attempt.scenario.scenarioType;
      if (!byType[type]) {
        byType[type] = { type, attempts: 0, safePercent: 0 };
      }
      byType[type].attempts++;
    }
    for (const type of Object.keys(byType)) {
      const entry = byType[type];
      if (!entry) {
        continue;
      }
      const typeAttempts = attempts.filter((a) => a.scenario.scenarioType === type);
      const safeCount = typeAttempts.filter((a) => a.outcome === 'SAFE').length;
      entry.safePercent = (safeCount / typeAttempts.length) * 100;
    }

    return reply.send({
      attempts,
      stats,
      byType: Object.values(byType),
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // GET /safety/practice/:learnerId - Get next scenario to practice
  // ────────────────────────────────────────────────────────────────────────────
  app.get<{
    Params: { learnerId: string };
    Querystring: { tenantId: string; scenarioType?: string };
  }>(`${prefix}/practice/:learnerId`, async (request, reply) => {
    const { learnerId } = request.params;
    const { tenantId, scenarioType } = request.query;

    if (!tenantId) {
      return reply.status(400).send({ error: 'tenantId is required' });
    }

    // Get scenarios the learner has struggled with (unsafe choices)
    const recentAttempts = await prisma.safetyAttempt.findMany({
      where: {
        tenantId,
        learnerId,
        ...(scenarioType && { scenario: { scenarioType: scenarioType as SafetyScenarioType } }),
      },
      orderBy: { attemptedAt: 'desc' },
      take: 100,
      select: {
        scenarioId: true,
        outcome: true,
      },
    });

    // Find scenarios with unsafe choices for practice
    const unsafeScenarioIds = recentAttempts
      .filter((a) => a.outcome !== 'SAFE')
      .map((a) => a.scenarioId);

    // Get all completed scenario IDs
    const completedScenarioIds = [...new Set(recentAttempts.map((a) => a.scenarioId))];

    // Priority 1: Scenarios where learner made unsafe choices
    // Priority 2: New scenarios not yet attempted
    // Priority 3: Random scenario for reinforcement

    let nextScenario = null;

    // Try to find an unsafe scenario for practice
    if (unsafeScenarioIds.length > 0) {
      nextScenario = await prisma.safetyScenario.findFirst({
        where: {
          id: { in: unsafeScenarioIds },
          isActive: true,
          ...(scenarioType && { scenarioType: scenarioType as SafetyScenarioType }),
        },
        include: {
          choices: {
            orderBy: { orderIndex: 'asc' },
          },
        },
      });
    }

    // If no unsafe scenarios, try a new one
    if (!nextScenario) {
      nextScenario = await prisma.safetyScenario.findFirst({
        where: {
          id: { notIn: completedScenarioIds },
          isActive: true,
          OR: [{ tenantId }, { tenantId: null }],
          ...(scenarioType && { scenarioType: scenarioType as SafetyScenarioType }),
        },
        include: {
          choices: {
            orderBy: { orderIndex: 'asc' },
          },
        },
        orderBy: { difficultyLevel: 'asc' },
      });
    }

    // If still no scenario, pick a random one for reinforcement
    if (!nextScenario) {
      const allScenarios = await prisma.safetyScenario.findMany({
        where: {
          isActive: true,
          OR: [{ tenantId }, { tenantId: null }],
          ...(scenarioType && { scenarioType: scenarioType as SafetyScenarioType }),
        },
        include: {
          choices: {
            orderBy: { orderIndex: 'asc' },
          },
        },
      });

      if (allScenarios.length > 0) {
        const randomIndex = Math.floor(Math.random() * allScenarios.length);
        nextScenario = allScenarios[randomIndex];
      }
    }

    if (!nextScenario) {
      return reply.status(404).send({ error: 'No scenarios available' });
    }

    return reply.send({
      scenario: nextScenario,
      reason: unsafeScenarioIds.includes(nextScenario.id)
        ? 'practice'
        : completedScenarioIds.includes(nextScenario.id)
          ? 'reinforcement'
          : 'new',
    });
  });
}
