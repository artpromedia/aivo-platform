/**
 * Skills Routes
 *
 * CRUD operations for life skills and task analyses.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { prisma, SkillCategory, DifficultyLevel, ContentType, toJsonValue } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const SkillCategoryEnum = z.nativeEnum(SkillCategory);
const DifficultyLevelEnum = z.nativeEnum(DifficultyLevel);
const ContentTypeEnum = z.nativeEnum(ContentType);

const GetSkillsQuerySchema = z.object({
  category: SkillCategoryEnum.optional(),
  difficulty: DifficultyLevelEnum.optional(),
  tenantId: z.string().uuid().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

const CreateSkillSchema = z.object({
  tenantId: z.string().uuid().optional(),
  code: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string(),
  category: SkillCategoryEnum,
  difficultyLevel: DifficultyLevelEnum.optional(),
  prerequisiteIds: z.array(z.string().uuid()).optional(),
  minAgeMonths: z.number().int().min(0).optional(),
  maxAgeMonths: z.number().int().min(0).optional(),
  iconUrl: z.string().url().optional(),
  coverImageUrl: z.string().url().optional(),
  themeColor: z.string().optional(),
  estimatedMinutes: z.number().int().min(1).optional(),
  keywords: z.array(z.string()).optional(),
});

const CreateTaskAnalysisSchema = z.object({
  skillId: z.string().uuid(),
  teachingTips: z.string().optional(),
  materialsNeeded: z.array(z.string()).optional(),
  setupNotes: z.string().optional(),
  reinforcementIdeas: z.array(z.string()).optional(),
  generalizationContexts: z.record(z.unknown()).optional(),
  steps: z.array(
    z.object({
      stepNumber: z.number().int().min(1),
      instruction: z.string().min(1),
      detailedPrompt: z.string().optional(),
      primaryContent: ContentTypeEnum.optional(),
      imageUrl: z.string().url().optional(),
      videoUrl: z.string().url().optional(),
      animationUrl: z.string().url().optional(),
      symbolUrl: z.string().url().optional(),
      audioUrl: z.string().url().optional(),
      aiPromptTemplate: z.string().optional(),
      commonErrors: z
        .array(
          z.object({
            error: z.string(),
            correction: z.string(),
          })
        )
        .optional(),
      expectedSeconds: z.number().int().min(1).optional(),
      isCritical: z.boolean().optional(),
      allowSkip: z.boolean().optional(),
    })
  ),
});

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function registerSkillRoutes(app: FastifyInstance): Promise<void> {
  const prefix = '/api/v1/skills';

  // ────────────────────────────────────────────────────────────────────────────
  // GET /skills - List all skills
  // ────────────────────────────────────────────────────────────────────────────
  app.get(prefix, async (request, reply) => {
    const query = GetSkillsQuerySchema.parse(request.query);

    const where = {
      isActive: true,
      ...(query.category && { category: query.category }),
      ...(query.difficulty && { difficultyLevel: query.difficulty }),
      ...(query.tenantId && { OR: [{ tenantId: query.tenantId }, { tenantId: null }] }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' as const } },
          { description: { contains: query.search, mode: 'insensitive' as const } },
          { keywords: { has: query.search.toLowerCase() } },
        ],
      }),
    };

    const [skills, total] = await Promise.all([
      prisma.lifeSkill.findMany({
        where,
        take: query.limit,
        skip: query.offset,
        orderBy: [{ category: 'asc' }, { difficultyLevel: 'asc' }, { name: 'asc' }],
        include: {
          taskAnalysis: {
            select: { totalSteps: true },
          },
        },
      }),
      prisma.lifeSkill.count({ where }),
    ]);

    return reply.send({
      skills,
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + skills.length < total,
      },
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // GET /skills/categories - List skill categories with counts
  // ────────────────────────────────────────────────────────────────────────────
  app.get(`${prefix}/categories`, async (_, reply) => {
    const categories = await prisma.lifeSkill.groupBy({
      by: ['category'],
      where: { isActive: true },
      _count: { id: true },
    });

    const categoryInfo = {
      PERSONAL_HYGIENE: {
        name: 'Personal Hygiene',
        icon: '🪥',
        description: 'Brushing teeth, washing hands, bathing, grooming',
      },
      EATING_SKILLS: {
        name: 'Eating Skills',
        icon: '🍴',
        description: 'Using utensils, table manners, food preparation',
      },
      DRESSING: {
        name: 'Dressing',
        icon: '👕',
        description: 'Putting on clothes, shoes, buttons, zippers',
      },
      SAFETY_AWARENESS: {
        name: 'Safety Awareness',
        icon: '⚠️',
        description: 'Road safety, stranger danger, emergency response',
      },
      SOCIAL_SKILLS: {
        name: 'Social Skills',
        icon: '👋',
        description: 'Greetings, personal space, asking for help',
      },
      DAILY_ROUTINES: {
        name: 'Daily Routines',
        icon: '📅',
        description: 'Morning routine, bedtime routine, transitions',
      },
      COMMUNITY_SKILLS: {
        name: 'Community Skills',
        icon: '🏪',
        description: 'Shopping, public transport, restaurants',
      },
      HOME_SKILLS: {
        name: 'Home Skills',
        icon: '🏠',
        description: 'Cleaning, organizing, basic cooking',
      },
      COMMUNICATION: {
        name: 'Communication',
        icon: '💬',
        description: 'Expressing needs, phone use, basic writing',
      },
      MONEY_SKILLS: {
        name: 'Money Skills',
        icon: '💰',
        description: 'Recognizing coins, simple transactions',
      },
    };

    const result = categories.map((cat) => ({
      category: cat.category,
      ...categoryInfo[cat.category as keyof typeof categoryInfo],
      skillCount: cat._count.id,
    }));

    return reply.send({ categories: result });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // GET /skills/:id - Get skill with task analysis
  // ────────────────────────────────────────────────────────────────────────────
  app.get<{ Params: { id: string } }>(`${prefix}/:id`, async (request, reply) => {
    const { id } = request.params;

    const skill = await prisma.lifeSkill.findUnique({
      where: { id },
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

    if (!skill) {
      return reply.status(404).send({ error: 'Skill not found' });
    }

    return reply.send({ skill });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // POST /skills - Create a new skill
  // ────────────────────────────────────────────────────────────────────────────
  app.post(prefix, async (request, reply) => {
    const data = CreateSkillSchema.parse(request.body);

    const skill = await prisma.lifeSkill.create({
      data: {
        tenantId: data.tenantId,
        code: data.code,
        name: data.name,
        description: data.description,
        category: data.category,
        difficultyLevel: data.difficultyLevel ?? 'FOUNDATIONAL',
        prerequisiteIds: data.prerequisiteIds ?? [],
        minAgeMonths: data.minAgeMonths,
        maxAgeMonths: data.maxAgeMonths,
        iconUrl: data.iconUrl,
        coverImageUrl: data.coverImageUrl,
        themeColor: data.themeColor,
        estimatedMinutes: data.estimatedMinutes,
        keywords: data.keywords ?? [],
        isSystemSkill: !data.tenantId,
      },
    });

    return reply.status(201).send({ skill });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // POST /skills/:id/task-analysis - Create task analysis with steps
  // ────────────────────────────────────────────────────────────────────────────
  app.post<{ Params: { id: string } }>(`${prefix}/:id/task-analysis`, async (request, reply) => {
    const { id } = request.params;
    const body = request.body as {
      steps: { stepNumber: number; instruction: string; [key: string]: unknown }[];
    };
    const data = CreateTaskAnalysisSchema.parse({ ...body, skillId: id });

    // Verify skill exists
    const skill = await prisma.lifeSkill.findUnique({ where: { id } });
    if (!skill) {
      return reply.status(404).send({ error: 'Skill not found' });
    }

    // Check if task analysis already exists
    const existing = await prisma.taskAnalysis.findUnique({ where: { skillId: id } });
    if (existing) {
      return reply.status(409).send({ error: 'Task analysis already exists for this skill' });
    }

    // Create task analysis with steps
    const taskAnalysis = await prisma.taskAnalysis.create({
      data: {
        skillId: id,
        totalSteps: data.steps.length,
        teachingTips: data.teachingTips,
        materialsNeeded: data.materialsNeeded ?? [],
        setupNotes: data.setupNotes,
        reinforcementIdeas: data.reinforcementIdeas ?? [],
        generalizationContexts: toJsonValue(data.generalizationContexts),
        steps: {
          create: data.steps.map((step) => ({
            stepNumber: step.stepNumber,
            instruction: step.instruction,
            detailedPrompt: step.detailedPrompt ?? null,
            primaryContent: step.primaryContent ?? 'IMAGE_SEQUENCE',
            imageUrl: step.imageUrl,
            videoUrl: step.videoUrl,
            animationUrl: step.animationUrl,
            symbolUrl: step.symbolUrl,
            audioUrl: step.audioUrl,
            aiPromptTemplate: step.aiPromptTemplate,
            commonErrors: toJsonValue(
              step.commonErrors ? { errors: step.commonErrors } : undefined
            ),
            expectedSeconds: step.expectedSeconds,
            isCritical: step.isCritical ?? false,
            allowSkip: step.allowSkip ?? false,
          })),
        },
      },
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' },
        },
      },
    });

    return reply.status(201).send({ taskAnalysis });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // GET /skills/:id/guide - Get interactive guide for a skill
  // ────────────────────────────────────────────────────────────────────────────
  app.get<{ Params: { id: string }; Querystring: { learnerId?: string } }>(
    `${prefix}/:id/guide`,
    async (request, reply) => {
      const { id } = request.params;
      const { learnerId } = request.query;

      const skill = await prisma.lifeSkill.findUnique({
        where: { id },
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

      // Get learner progress if learnerId provided
      let progress = null;
      if (learnerId) {
        progress = await prisma.learnerSkillProgress.findUnique({
          where: { learnerId_skillId: { learnerId, skillId: id } },
          include: {
            stepProgress: true,
          },
        });
      }

      // Build guide structure
      const guide = {
        skill: {
          id: skill.id,
          name: skill.name,
          description: skill.description,
          category: skill.category,
          estimatedMinutes: skill.estimatedMinutes,
          iconUrl: skill.iconUrl,
          coverImageUrl: skill.coverImageUrl,
          themeColor: skill.themeColor,
        },
        taskAnalysis: {
          totalSteps: skill.taskAnalysis.totalSteps,
          materialsNeeded: skill.taskAnalysis.materialsNeeded,
          setupNotes: skill.taskAnalysis.setupNotes,
          teachingTips: skill.taskAnalysis.teachingTips,
        },
        steps: skill.taskAnalysis.steps.map((step) => ({
          id: step.id,
          stepNumber: step.stepNumber,
          instruction: step.instruction,
          detailedPrompt: step.detailedPrompt,
          media: {
            primaryType: step.primaryContent,
            imageUrl: step.imageUrl,
            videoUrl: step.videoUrl,
            animationUrl: step.animationUrl,
            symbolUrl: step.symbolUrl,
            audioUrl: step.audioUrl,
          },
          timing: {
            expectedSeconds: step.expectedSeconds,
          },
          flags: {
            isCritical: step.isCritical,
            allowSkip: step.allowSkip,
          },
          aiPromptTemplate: step.aiPromptTemplate,
          commonErrors: step.commonErrors,
          // Include learner-specific progress if available
          learnerProgress: progress?.stepProgress.find((sp) => sp.stepId === step.id) ?? null,
        })),
        learnerProgress: progress
          ? {
              status: progress.status,
              masteryPercent: progress.masteryPercent,
              currentPromptLevel: progress.currentPromptLevel,
              stepsCompleted: progress.stepsCompleted,
              totalSessions: progress.totalSessions,
              currentStreak: progress.currentStreak,
            }
          : null,
      };

      return reply.send({ guide });
    }
  );
}
