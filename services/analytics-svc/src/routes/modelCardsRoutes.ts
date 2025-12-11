/**
 * Model Cards API Routes
 *
 * Provides endpoints for accessing AI model documentation including
 * capabilities, limitations, and safety considerations.
 *
 * Used by:
 * - Platform Admin: Full model card management and viewing
 * - District Admin: Tenant-specific model information
 */

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const modelKeyParamsSchema = z.object({
  modelKey: z.string().min(1),
});

const tenantIdParamsSchema = z.object({
  tenantId: z.string().uuid(),
});

const listQuerySchema = z.object({
  provider: z.enum(['OPENAI', 'ANTHROPIC', 'GOOGLE', 'INTERNAL', 'META', 'MISTRAL', 'COHERE']).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface AuthenticatedUser {
  sub: string;
  tenantId: string;
  role: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function formatModelCard(card: {
  id: string;
  modelKey: string;
  provider: string;
  displayName: string;
  description: string;
  intendedUseCases: string;
  limitations: string;
  safetyConsiderations: string;
  inputTypes: string;
  outputTypes: string;
  dataSourcesSummary: string;
  lastReviewedAt: Date;
  lastReviewedBy: string | null;
  metadataJson: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: card.id,
    modelKey: card.modelKey,
    provider: card.provider,
    displayName: card.displayName,
    description: card.description,
    intendedUseCases: card.intendedUseCases,
    limitations: card.limitations,
    safetyConsiderations: card.safetyConsiderations,
    inputTypes: card.inputTypes,
    outputTypes: card.outputTypes,
    dataSourcesSummary: card.dataSourcesSummary,
    lastReviewedAt: card.lastReviewedAt.toISOString(),
    lastReviewedBy: card.lastReviewedBy,
    metadataJson: card.metadataJson,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
  };
}

function formatModelCardSummary(card: {
  id: string;
  modelKey: string;
  provider: string;
  displayName: string;
  description: string;
  intendedUseCases: string;
  lastReviewedAt: Date;
}) {
  return {
    id: card.id,
    modelKey: card.modelKey,
    provider: card.provider,
    displayName: card.displayName,
    description: card.description,
    intendedUseCases: card.intendedUseCases,
    lastReviewedAt: card.lastReviewedAt.toISOString(),
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export const modelCardsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /models/cards
   *
   * List all model cards. For platform admins.
   */
  fastify.get(
    '/cards',
    async (
      request: FastifyRequest<{
        Querystring: z.infer<typeof listQuerySchema>;
      }>,
      reply
    ) => {
      const user = request.user as AuthenticatedUser | undefined;

      // Platform admins can see all model cards
      if (!user || !['PLATFORM_ADMIN', 'SUPPORT'].includes(user.role)) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      const query = listQuerySchema.safeParse(request.query);
      if (!query.success) {
        return reply.code(400).send({ error: 'Invalid query parameters', details: query.error.issues });
      }

      const { provider, limit, offset } = query.data;

      const where = provider ? { provider } : {};

      const [modelCards, total] = await Promise.all([
        prisma.modelCard.findMany({
          where,
          select: {
            id: true,
            modelKey: true,
            provider: true,
            displayName: true,
            description: true,
            intendedUseCases: true,
            lastReviewedAt: true,
          },
          orderBy: { displayName: 'asc' },
          take: limit,
          skip: offset,
        }),
        prisma.modelCard.count({ where }),
      ]);

      return {
        modelCards: modelCards.map(formatModelCardSummary),
        total,
      };
    }
  );

  /**
   * GET /models/cards/:modelKey
   *
   * Get a single model card by key.
   */
  fastify.get(
    '/cards/:modelKey',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof modelKeyParamsSchema>;
      }>,
      reply
    ) => {
      const user = request.user as AuthenticatedUser | undefined;

      // Any authenticated user can view model cards
      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const params = modelKeyParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: 'Invalid model key' });
      }

      const modelCard = await prisma.modelCard.findUnique({
        where: { modelKey: params.data.modelKey },
      });

      if (!modelCard) {
        return reply.code(404).send({ error: 'Model card not found' });
      }

      return { modelCard: formatModelCard(modelCard) };
    }
  );

  /**
   * GET /models/tenant/:tenantId/cards
   *
   * Get model cards relevant to a tenant based on their feature assignments.
   */
  fastify.get(
    '/tenant/:tenantId/cards',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof tenantIdParamsSchema>;
      }>,
      reply
    ) => {
      const user = request.user as AuthenticatedUser | undefined;

      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const params = tenantIdParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: 'Invalid tenant ID' });
      }

      const { tenantId } = params.data;

      // Users can only access their own tenant's models (unless platform admin)
      if (user.tenantId !== tenantId && !['PLATFORM_ADMIN', 'SUPPORT'].includes(user.role)) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      // Get model assignments for this tenant
      const assignments = await prisma.tenantModelAssignment.findMany({
        where: {
          tenantId,
          isActive: true,
        },
        include: {
          modelCard: true,
        },
        orderBy: {
          modelCard: { displayName: 'asc' },
        },
      });

      // If no assignments, return all models (default behavior for new tenants)
      if (assignments.length === 0) {
        const allModels = await prisma.modelCard.findMany({
          orderBy: { displayName: 'asc' },
        });

        return {
          tenantId,
          modelCards: allModels.map((card) => ({
            ...formatModelCard(card),
            featureKey: 'ALL',
            isActive: true,
          })),
          total: allModels.length,
        };
      }

      const modelCards = assignments.map((assignment) => ({
        ...formatModelCard(assignment.modelCard),
        featureKey: assignment.featureKey,
        isActive: assignment.isActive,
      }));

      return {
        tenantId,
        modelCards,
        total: modelCards.length,
      };
    }
  );

  /**
   * GET /models/features
   *
   * List available AI features and their associated models.
   */
  fastify.get('/features', async (request, reply) => {
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    // Static list of features - could be made dynamic in the future
    const features = [
      {
        key: 'TUTORING',
        name: 'AI Tutoring',
        description: 'Personalized tutoring and concept explanations',
        defaultModelKey: 'AIVO_TUTOR_V1',
      },
      {
        key: 'BASELINE',
        name: 'Baseline Assessment',
        description: 'Initial skill assessment and placement',
        defaultModelKey: 'AIVO_BASELINE_V1',
      },
      {
        key: 'HOMEWORK_HELP',
        name: 'Homework Helper',
        description: 'Guided homework assistance',
        defaultModelKey: 'AIVO_TUTOR_V1',
      },
      {
        key: 'FOCUS',
        name: 'Focus Support',
        description: 'Engagement monitoring and break suggestions',
        defaultModelKey: 'AIVO_FOCUS_V1',
      },
      {
        key: 'RECOMMENDATIONS',
        name: 'Learning Recommendations',
        description: 'Activity and path personalization',
        defaultModelKey: 'AIVO_RECOMMENDER_V1',
      },
      {
        key: 'HOMEWORK_PARSING',
        name: 'Homework Vision',
        description: 'Image-to-text homework extraction',
        defaultModelKey: 'AIVO_HOMEWORK_PARSER_V1',
      },
      {
        key: 'SEL',
        name: 'SEL Activities',
        description: 'Social-emotional learning support',
        defaultModelKey: 'AIVO_SEL_V1',
      },
    ];

    return { features };
  });
};
