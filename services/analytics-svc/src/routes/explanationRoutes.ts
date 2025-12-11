/**
 * Explanation Routes
 *
 * API endpoints for surfacing explanation events to Parent and Teacher UIs.
 * Provides contextual "Why this?" explanations for platform decisions.
 *
 * Design principles:
 * - Non-judgmental, growth-oriented language
 * - Graceful fallbacks when explanations aren't available
 * - Parent-friendly summaries, detailed inputs for teachers
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const byEntityQuerySchema = z.object({
  relatedEntityType: z.string().min(1),
  relatedEntityId: z.string().min(1),
  learnerId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(10).default(3),
});

const recentExplanationsParamsSchema = z.object({
  learnerId: z.string().uuid(),
});

const recentExplanationsQuerySchema = z.object({
  actionTypes: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(',') : undefined)),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface AuthenticatedUser {
  sub: string;
  tenantId: string;
  role: string;
  learnerId?: string;
}

interface ExplanationReason {
  code: string;
  weight: number;
  description: string;
}

interface ExplanationDetailsJson {
  reasons?: ExplanationReason[];
  inputs?: Record<string, unknown>;
  thresholds?: Record<string, unknown>;
  policyReferences?: string[];
  experimentKey?: string;
  variantId?: string;
}

interface FormattedExplanation {
  id: string;
  sourceType: string;
  actionType: string;
  relatedEntityType: string;
  relatedEntityId: string;
  summary: string;
  details: {
    reasons: FormattedReason[];
    inputs: FormattedInput[];
    additionalContext?: string;
  };
  createdAt: string;
}

interface FormattedReason {
  label: string;
  description: string;
}

interface FormattedInput {
  label: string;
  value: string;
  unit?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function getUser(request: FastifyRequest): AuthenticatedUser {
  const user = (request as FastifyRequest & { user?: AuthenticatedUser }).user;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user;
}

/**
 * Convert reason codes to human-friendly labels.
 */
function formatReasonCode(code: string): string {
  const codeMap: Record<string, string> = {
    MASTERY_MATCH: 'Matches current skill level',
    NOT_RECENTLY_USED: 'Fresh content for variety',
    GRADE_BAND_MATCH: 'Appropriate for grade level',
    LOW_MASTERY: 'Opportunity for practice',
    HIGH_MASTERY: 'Ready for more challenge',
    REPEATED_STRUGGLE: 'Extra support needed',
    HIGH_CORRECT_RATE: 'Showing strong performance',
    LOW_ERROR_RATE: 'Consistent accuracy',
    MULTIPLE_RAPID_WRONG_ATTEMPTS: 'Time for a break',
    INACTIVITY_TIMEOUT: 'Encouraging refocus',
    TIME_BASED: 'Based on session length',
    FOCUS_SCORE_LOW: 'Attention check',
    PREREQUISITE_COMPLETE: 'Prerequisites met',
    SKILL_ALIGNMENT: 'Aligns with learning goals',
    DIFFICULTY_APPROPRIATE: 'Right level of challenge',
    ENGAGEMENT_SIGNAL: 'Based on engagement',
    PROACTIVE_SUPPORT: 'Helpful hint offered',
    MULTIPLE_ATTEMPTS: 'After several tries',
  };

  return codeMap[code] ?? code.replace(/_/g, ' ').toLowerCase();
}

/**
 * Convert input keys to human-friendly labels with appropriate formatting.
 */
function formatInput(key: string, value: unknown): FormattedInput | null {
  // Skip internal/sensitive fields
  const skipKeys = ['tenantId', 'learnerId', 'userId', 'sessionId', 'raw', 'internal'];
  if (skipKeys.some((skip) => key.toLowerCase().includes(skip.toLowerCase()))) {
    return null;
  }

  const labelMap: Record<string, { label: string; unit?: string; formatter?: (v: unknown) => string }> = {
    masteryScore: {
      label: 'Current mastery',
      formatter: (v) => `${Math.round(Number(v) * 100)}%`,
    },
    recentAccuracy: {
      label: 'Recent accuracy',
      formatter: (v) => `${Math.round(Number(v) * 100)}%`,
    },
    focusScore: {
      label: 'Focus level',
      formatter: (v) => `${Math.round(Number(v) * 100)}%`,
    },
    sessionDurationMinutes: {
      label: 'Time in session',
      unit: 'minutes',
    },
    durationMinutes: {
      label: 'Duration',
      unit: 'minutes',
    },
    attemptCount: {
      label: 'Attempts made',
    },
    streakLength: {
      label: 'Current streak',
      unit: 'days',
    },
    correctRate: {
      label: 'Correct answers',
      formatter: (v) => `${Math.round(Number(v) * 100)}%`,
    },
    gradeBand: {
      label: 'Grade band',
    },
    subject: {
      label: 'Subject',
    },
    skillArea: {
      label: 'Skill area',
    },
    difficultyLevel: {
      label: 'Difficulty level',
    },
    previousLevel: {
      label: 'Previous level',
    },
    newLevel: {
      label: 'New level',
    },
  };

  const config = labelMap[key];

  if (config) {
    const formattedValue = config.formatter ? config.formatter(value) : String(value);
    return {
      label: config.label,
      value: formattedValue,
      unit: config.unit,
    };
  }

  // Default formatting for unknown keys
  if (typeof value === 'number') {
    // Format percentages (values between 0 and 1)
    if (value >= 0 && value <= 1 && key.toLowerCase().includes('score')) {
      return {
        label: key.replace(/([A-Z])/g, ' $1').trim(),
        value: `${Math.round(value * 100)}%`,
      };
    }
    return {
      label: key.replace(/([A-Z])/g, ' $1').trim(),
      value: String(Math.round(value * 100) / 100),
    };
  }

  if (typeof value === 'string' && value.length < 50) {
    return {
      label: key.replace(/([A-Z])/g, ' $1').trim(),
      value: value,
    };
  }

  return null;
}

/**
 * Format a raw explanation event into a client-friendly structure.
 */
function formatExplanation(event: {
  id: string;
  sourceType: string;
  actionType: string;
  relatedEntityType: string;
  relatedEntityId: string;
  summaryText: string;
  detailsJson: unknown;
  createdAt: Date;
}): FormattedExplanation {
  const details = event.detailsJson as ExplanationDetailsJson;

  // Format reasons
  const reasons: FormattedReason[] = (details.reasons ?? []).map((r) => ({
    label: formatReasonCode(r.code),
    description: r.description,
  }));

  // Format inputs (filter out nulls)
  const inputs: FormattedInput[] = Object.entries(details.inputs ?? {})
    .map(([key, value]) => formatInput(key, value))
    .filter((input): input is FormattedInput => input !== null);

  // Build additional context if experiment info available
  let additionalContext: string | undefined;
  if (details.experimentKey) {
    additionalContext = 'This decision was part of a learning experiment to improve recommendations.';
  }

  return {
    id: event.id,
    sourceType: event.sourceType,
    actionType: event.actionType,
    relatedEntityType: event.relatedEntityType,
    relatedEntityId: event.relatedEntityId,
    summary: event.summaryText,
    details: {
      reasons,
      inputs,
      additionalContext,
    },
    createdAt: event.createdAt.toISOString(),
  };
}

/**
 * Default fallback explanation when no explanation event exists.
 */
function getFallbackExplanation(
  relatedEntityType: string,
  relatedEntityId: string
): FormattedExplanation {
  const fallbackMessages: Record<string, string> = {
    LEARNING_OBJECT_VERSION:
      "Aivo used your child's recent work and learning goals to pick this activity. Detailed explanations are not available for this item yet.",
    SKILL:
      "This skill was identified based on your child's learning progress and curriculum alignment.",
    MODULE:
      "This module was suggested to build on what your child has been learning. We're working on providing more detailed explanations.",
    RECOMMENDATION:
      "This recommendation was generated based on learning patterns and goals. More details will be available soon.",
    SESSION_EVENT:
      "This action was taken to support your child's learning experience. We're enhancing our explanation system.",
  };

  const summary =
    fallbackMessages[relatedEntityType] ??
    "Aivo made this decision based on learning data and goals. We're working on providing more detailed explanations.";

  return {
    id: 'fallback',
    sourceType: 'SYSTEM',
    actionType: 'UNKNOWN',
    relatedEntityType,
    relatedEntityId,
    summary,
    details: {
      reasons: [],
      inputs: [],
    },
    createdAt: new Date().toISOString(),
  };
}

/**
 * Get friendly action type label.
 */
function getActionTypeLabel(actionType: string): string {
  const labels: Record<string, string> = {
    CONTENT_SELECTION: 'Activity Selection',
    DIFFICULTY_CHANGE: 'Difficulty Adjustment',
    FOCUS_BREAK_TRIGGER: 'Focus Break',
    FOCUS_INTERVENTION: 'Focus Support',
    MODULE_RECOMMENDATION: 'Module Suggestion',
    LEARNING_PATH_ADJUSTMENT: 'Learning Path Update',
    SKILL_PROGRESSION: 'Skill Progress',
    SCAFFOLDING_DECISION: 'Learning Support',
    POLICY_ENFORCEMENT: 'Policy Action',
  };
  return labels[actionType] ?? actionType.replace(/_/g, ' ');
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export const explanationRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /explanations/by-entity
   *
   * Fetch explanations for a specific entity (e.g., a learning object version).
   * Used by "Why this?" buttons on activity cards.
   *
   * Query params:
   * - relatedEntityType: Type of entity (e.g., LEARNING_OBJECT_VERSION)
   * - relatedEntityId: ID of the entity
   * - learnerId: Optional filter by learner
   * - limit: Max results (1-10, default 3)
   */
  app.get(
    '/explanations/by-entity',
    async (
      request: FastifyRequest<{
        Querystring: z.infer<typeof byEntityQuerySchema>;
      }>,
      reply
    ) => {
      const user = getUser(request);

      const queryResult = byEntityQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return reply.status(400).send({
          error: 'Invalid query parameters',
          details: queryResult.error.flatten(),
        });
      }

      const { relatedEntityType, relatedEntityId, learnerId, limit } = queryResult.data;

      try {
        const whereClause: Record<string, unknown> = {
          tenantId: user.tenantId,
          relatedEntityType,
          relatedEntityId,
        };

        // Add learner filter if provided
        if (learnerId) {
          whereClause.learnerId = learnerId;
        }

        const events = await prisma.explanationEvent.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: {
            id: true,
            sourceType: true,
            actionType: true,
            relatedEntityType: true,
            relatedEntityId: true,
            summaryText: true,
            detailsJson: true,
            createdAt: true,
          },
        });

        // Return formatted explanations or fallback
        if (events.length === 0) {
          return reply.send({
            explanations: [getFallbackExplanation(relatedEntityType, relatedEntityId)],
            hasFallback: true,
          });
        }

        const formatted = events.map(formatExplanation);

        return reply.send({
          explanations: formatted,
          hasFallback: false,
        });
      } catch (error) {
        request.log.error({ error, relatedEntityType, relatedEntityId }, 'Failed to fetch explanations');
        return reply.status(500).send({
          error: 'Failed to fetch explanations',
        });
      }
    }
  );

  /**
   * GET /explanations/learners/:learnerId/recent
   *
   * Fetch recent key explanations for a learner.
   * Used by Parent dashboard and Teacher learner profiles.
   *
   * Query params:
   * - actionTypes: Comma-separated list of action types to filter (optional)
   * - limit: Max results (1-20, default 10)
   */
  app.get(
    '/explanations/learners/:learnerId/recent',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof recentExplanationsParamsSchema>;
        Querystring: z.infer<typeof recentExplanationsQuerySchema>;
      }>,
      reply
    ) => {
      const user = getUser(request);

      const paramsResult = recentExplanationsParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          error: 'Invalid learner ID',
          details: paramsResult.error.flatten(),
        });
      }

      const queryResult = recentExplanationsQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return reply.status(400).send({
          error: 'Invalid query parameters',
          details: queryResult.error.flatten(),
        });
      }

      const { learnerId } = paramsResult.data;
      const { actionTypes, limit } = queryResult.data;

      try {
        const whereClause: Record<string, unknown> = {
          tenantId: user.tenantId,
          learnerId,
        };

        // Filter by action types if provided
        if (actionTypes && actionTypes.length > 0) {
          whereClause.actionType = { in: actionTypes };
        }

        const events = await prisma.explanationEvent.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: {
            id: true,
            sourceType: true,
            actionType: true,
            relatedEntityType: true,
            relatedEntityId: true,
            summaryText: true,
            detailsJson: true,
            createdAt: true,
          },
        });

        const formatted = events.map(formatExplanation);

        // Group by action type for easier consumption
        const byActionType = formatted.reduce(
          (acc, exp) => {
            const key = exp.actionType;
            if (!acc[key]) {
              acc[key] = [];
            }
            acc[key].push(exp);
            return acc;
          },
          {} as Record<string, FormattedExplanation[]>
        );

        return reply.send({
          learnerId,
          total: formatted.length,
          explanations: formatted,
          byActionType,
          actionTypeLabels: Object.keys(byActionType).reduce(
            (acc, key) => {
              acc[key] = getActionTypeLabel(key);
              return acc;
            },
            {} as Record<string, string>
          ),
        });
      } catch (error) {
        request.log.error({ error, learnerId }, 'Failed to fetch recent explanations');
        return reply.status(500).send({
          error: 'Failed to fetch recent explanations',
        });
      }
    }
  );

  /**
   * GET /explanations/:id
   *
   * Fetch a single explanation by ID.
   */
  app.get(
    '/explanations/:id',
    async (
      request: FastifyRequest<{
        Params: { id: string };
      }>,
      reply
    ) => {
      const user = getUser(request);
      const { id } = request.params;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return reply.status(400).send({ error: 'Invalid explanation ID format' });
      }

      try {
        const event = await prisma.explanationEvent.findFirst({
          where: {
            id,
            tenantId: user.tenantId,
          },
          select: {
            id: true,
            sourceType: true,
            actionType: true,
            relatedEntityType: true,
            relatedEntityId: true,
            summaryText: true,
            detailsJson: true,
            createdAt: true,
          },
        });

        if (!event) {
          return reply.status(404).send({ error: 'Explanation not found' });
        }

        return reply.send({
          explanation: formatExplanation(event),
        });
      } catch (error) {
        request.log.error({ error, id }, 'Failed to fetch explanation');
        return reply.status(500).send({
          error: 'Failed to fetch explanation',
        });
      }
    }
  );
};
