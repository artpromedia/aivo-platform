/**
 * Search Routes
 *
 * REST API for content discovery and search.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { searchContent, type SearchQuery } from '../search.js';
import { selectContentForPlan, getContentStatsForSkill } from '../selection.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const SearchQuerySchema = z.object({
  tenantId: z.string().uuid().optional(),
  subject: z.enum(['ELA', 'MATH', 'SCIENCE', 'SEL', 'SPEECH', 'OTHER']).optional(),
  gradeBand: z.enum(['K_2', 'G3_5', 'G6_8', 'G9_12']).optional(),
  skillId: z.string().uuid().optional(),
  skillIds: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(',').filter(Boolean) : undefined)),
  standardCode: z.string().optional(),
  tag: z.string().optional(),
  tags: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(',').filter(Boolean) : undefined)),
  textQuery: z.string().optional(),
  contentType: z.string().optional(),
  minDuration: z.coerce.number().int().min(1).optional(),
  maxDuration: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const SelectContentBodySchema = z.object({
  tenantId: z.string().uuid(),
  learnerId: z.string().uuid(),
  subject: z.enum(['ELA', 'MATH', 'SCIENCE', 'SEL', 'SPEECH', 'OTHER']),
  gradeBand: z.enum(['K_2', 'G3_5', 'G6_8', 'G9_12']),
  targetSkills: z.array(z.string().uuid()).min(1),
  minutesAvailable: z.number().int().min(5).max(120),
  difficultyAdjustment: z.enum(['easier', 'standard', 'harder']).default('standard'),
  accessibilityProfile: z
    .object({
      dyslexiaFriendly: z.boolean().optional(),
      reducedStimuli: z.boolean().optional(),
      screenReader: z.boolean().optional(),
      maxCognitiveLoad: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
    })
    .optional(),
  excludeLOIds: z.array(z.string().uuid()).optional(),
  preferredContentTypes: z.array(z.string()).optional(),
});

const ContentStatsParamsSchema = z.object({
  skillId: z.string().uuid(),
});

const ContentStatsQuerySchema = z.object({
  tenantId: z.string().uuid().optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function searchRoutes(fastify: FastifyInstance) {
  /**
   * GET /content/search
   *
   * Search for published Learning Objects.
   * Used by teachers, lesson planners, and AI agents.
   *
   * Query params:
   *   - tenantId?: UUID - Filter by tenant (includes global content)
   *   - subject?: ELA|MATH|SCIENCE|SEL|SPEECH|OTHER
   *   - gradeBand?: K_2|G3_5|G6_8|G9_12
   *   - skillId?: UUID - Filter by single skill
   *   - skillIds?: comma-separated UUIDs
   *   - standardCode?: string - Filter by standard code
   *   - tag?: string - Filter by single tag
   *   - tags?: comma-separated strings
   *   - textQuery?: string - Text search on title
   *   - contentType?: string - Filter by content type
   *   - minDuration?: number - Minimum duration in minutes
   *   - maxDuration?: number - Maximum duration in minutes
   *   - limit: number (default: 20, max: 100)
   *   - offset: number (default: 0)
   */
  fastify.get('/content/search', async (request: FastifyRequest, reply: FastifyReply) => {
    const queryResult = SearchQuerySchema.safeParse(request.query);
    if (!queryResult.success) {
      return reply
        .status(400)
        .send({ error: 'Invalid query parameters', details: queryResult.error.flatten() });
    }

    const query: SearchQuery = queryResult.data;

    // Get tenant from header if not in query
    if (!query.tenantId) {
      const headerTenantId = request.headers['x-tenant-id'] as string | undefined;
      if (headerTenantId) {
        query.tenantId = headerTenantId;
      }
    }

    const results = await searchContent(query);

    return reply.send(results);
  });

  /**
   * POST /content/select
   *
   * Select content for a learner's plan.
   * Used by Lesson Planner agent and teacher planning tools.
   *
   * Body:
   *   - tenantId: UUID
   *   - learnerId: UUID
   *   - subject: ELA|MATH|SCIENCE|SEL|SPEECH|OTHER
   *   - gradeBand: K_2|G3_5|G6_8|G9_12
   *   - targetSkills: UUID[] (at least one)
   *   - minutesAvailable: number (5-120)
   *   - difficultyAdjustment?: easier|standard|harder
   *   - accessibilityProfile?: { dyslexiaFriendly?, reducedStimuli?, screenReader?, maxCognitiveLoad? }
   *   - excludeLOIds?: UUID[]
   *   - preferredContentTypes?: string[]
   */
  fastify.post('/content/select', async (request: FastifyRequest, reply: FastifyReply) => {
    const bodyResult = SelectContentBodySchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply
        .status(400)
        .send({ error: 'Invalid request body', details: bodyResult.error.flatten() });
    }

    const result = await selectContentForPlan(bodyResult.data);

    return reply.send(result);
  });

  /**
   * GET /content/stats/skill/:skillId
   *
   * Get content statistics for a skill.
   * Used by UI to show content availability.
   */
  fastify.get(
    '/content/stats/skill/:skillId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const paramsResult = ContentStatsParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid parameters', details: paramsResult.error.flatten() });
      }

      const queryResult = ContentStatsQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid query parameters', details: queryResult.error.flatten() });
      }

      const { skillId } = paramsResult.data;
      const tenantId = queryResult.data.tenantId ?? (request.headers['x-tenant-id'] as string);

      const stats = await getContentStatsForSkill(tenantId, skillId);

      return reply.send({
        skillId,
        ...stats,
      });
    }
  );

  /**
   * GET /content/subjects
   *
   * Get list of available subjects.
   */
  fastify.get('/content/subjects', async (_request, reply) => {
    return reply.send({
      subjects: [
        { code: 'ELA', name: 'English Language Arts' },
        { code: 'MATH', name: 'Mathematics' },
        { code: 'SCIENCE', name: 'Science' },
        { code: 'SEL', name: 'Social-Emotional Learning' },
        { code: 'SPEECH', name: 'Speech & Language' },
        { code: 'OTHER', name: 'Other' },
      ],
    });
  });

  /**
   * GET /content/grade-bands
   *
   * Get list of available grade bands.
   */
  fastify.get('/content/grade-bands', async (_request, reply) => {
    return reply.send({
      gradeBands: [
        { code: 'K_2', name: 'K-2', grades: ['K', '1', '2'] },
        { code: 'G3_5', name: '3-5', grades: ['3', '4', '5'] },
        { code: 'G6_8', name: '6-8', grades: ['6', '7', '8'] },
        { code: 'G9_12', name: '9-12', grades: ['9', '10', '11', '12'] },
      ],
    });
  });
}
