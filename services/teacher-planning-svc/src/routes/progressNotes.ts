/**
 * Progress Note Routes
 *
 * REST endpoints for logging and retrieving progress notes.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { ForbiddenError } from '../middleware/errorHandler.js';
import {
  ensureCanReadLearner,
  ensureCanWriteLearner,
  getTenantIdForQuery,
  getAllowedVisibilityLevels,
} from '../middleware/rbac.js';
import {
  createProgressNoteSchema,
  progressNoteQuerySchema,
  learnerIdParamSchema,
} from '../schemas/index.js';
import { createProgressNote, listProgressNotes } from '../services/progressNoteService.js';
import type { AuthUser, ProgressRating, Visibility, NoteTag } from '../types/index.js';

export async function registerProgressNoteRoutes(fastify: FastifyInstance): Promise<void> {
  // ════════════════════════════════════════════════════════════════════════════
  // PROGRESS NOTE ENDPOINTS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * POST /progress-notes
   * Create a new progress note
   *
   * Callable from in-session UI or post-session review.
   */
  fastify.post(
    '/progress-notes',
    async (
      request: FastifyRequest<{
        Body: unknown;
      }>,
      reply: FastifyReply
    ) => {
      const user = request.user!;
      if (!user) throw new ForbiddenError('Authentication required');

      const body = createProgressNoteSchema.parse(request.body);

      // RBAC check - must have write access to learner
      await ensureCanWriteLearner(request, body.learnerId);

      const note = await createProgressNote({
        tenantId: user.tenantId,
        learnerId: body.learnerId,
        createdByUserId: user.userId,
        sessionId: body.sessionId,
        sessionPlanId: body.sessionPlanId,
        goalId: body.goalId,
        goalObjectiveId: body.goalObjectiveId,
        noteText: body.noteText,
        rating: body.rating as ProgressRating | undefined,
        visibility: body.visibility,
        tags: body.tags as NoteTag[] | undefined,
        evidenceUri: body.evidenceUri,
      });

      return reply.status(201).send(note);
    }
  );

  /**
   * GET /learners/:learnerId/progress-notes
   * List progress notes for a learner (paginated, sorted by date desc)
   */
  fastify.get(
    '/learners/:learnerId/progress-notes',
    async (
      request: FastifyRequest<{
        Params: { learnerId: string };
        Querystring: {
          goalId?: string;
          sessionId?: string;
          page?: string;
          pageSize?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const user = request.user!;
      if (!user) throw new ForbiddenError('Authentication required');

      const { learnerId } = learnerIdParamSchema.parse(request.params);
      const query = progressNoteQuerySchema.parse(request.query);

      // RBAC check
      await ensureCanReadLearner(request, learnerId);

      // Filter notes based on user's visibility permissions
      const allowedVisibility = getAllowedVisibilityLevels(user);

      const result = await listProgressNotes({
        tenantId: user.tenantId,
        learnerId,
        goalId: query.goalId,
        sessionId: query.sessionId,
        allowedVisibility,
        page: query.page,
        pageSize: query.pageSize,
      });

      return reply.send({
        data: result.progressNotes,
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / query.pageSize),
        },
      });
    }
  );
}
