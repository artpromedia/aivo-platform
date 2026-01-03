/**
 * Progress Note Routes
 *
 * REST endpoints for managing progress notes.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import {
  CreateProgressNoteSchema,
  UpdateProgressNoteSchema,
} from '../schemas/goal.schemas.js';
import * as progressNoteService from '../services/progressNoteService.js';

interface AuthUser {
  userId: string;
  tenantId: string;
  role: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

function getTenantContext(request: FastifyRequest): { tenantId: string; userId: string } {
  const tenantId = request.headers['x-tenant-id'] as string || request.user?.tenantId;
  const userId = request.headers['x-user-id'] as string || request.user?.userId;

  if (!tenantId) {
    throw new Error('Missing tenant context');
  }

  return { tenantId, userId: userId || 'system' };
}

export async function registerProgressNoteRoutes(fastify: FastifyInstance): Promise<void> {
  // ════════════════════════════════════════════════════════════════════════════
  // PROGRESS NOTE ENDPOINTS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * POST /progress-notes
   * Create a new progress note
   */
  fastify.post(
    '/progress-notes',
    async (
      request: FastifyRequest<{ Body: unknown }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const body = CreateProgressNoteSchema.parse({
        ...request.body as object,
        tenantId: ctx.tenantId,
        createdByUserId: ctx.userId,
      }) as Parameters<typeof progressNoteService.createProgressNote>[0];

      const note = await progressNoteService.createProgressNote(body);

      fastify.log.info({ noteId: note.id, tenantId: ctx.tenantId }, 'Progress note created');

      return reply.status(201).send({ data: note });
    }
  );

  /**
   * GET /progress-notes
   * List progress notes with filters
   */
  fastify.get(
    '/progress-notes',
    async (
      request: FastifyRequest<{
        Querystring: {
          learnerId?: string;
          goalId?: string;
          goalObjectiveId?: string;
          sessionId?: string;
          sessionPlanId?: string;
          createdFrom?: string;
          createdTo?: string;
          page?: string;
          pageSize?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const {
        learnerId,
        goalId,
        goalObjectiveId,
        sessionId,
        sessionPlanId,
        createdFrom,
        createdTo,
        page,
        pageSize,
      } = request.query;

      const result = await progressNoteService.listProgressNotes(
        {
          tenantId: ctx.tenantId,
          learnerId,
          goalId,
          goalObjectiveId,
          sessionId,
          sessionPlanId,
          createdFrom: createdFrom ? new Date(createdFrom) : undefined,
          createdTo: createdTo ? new Date(createdTo) : undefined,
        },
        {
          page: page ? parseInt(page, 10) : 1,
          pageSize: pageSize ? parseInt(pageSize, 10) : 20,
        }
      );

      return reply.send(result);
    }
  );

  /**
   * GET /progress-notes/:noteId
   * Get a specific progress note
   */
  fastify.get(
    '/progress-notes/:noteId',
    async (
      request: FastifyRequest<{ Params: { noteId: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { noteId } = request.params;

      const note = await progressNoteService.getProgressNoteById(noteId, ctx.tenantId);

      if (!note) {
        return reply.status(404).send({ error: 'Progress note not found' });
      }

      return reply.send({ data: note });
    }
  );

  /**
   * PATCH /progress-notes/:noteId
   * Update a progress note
   */
  fastify.patch(
    '/progress-notes/:noteId',
    async (
      request: FastifyRequest<{ Params: { noteId: string }; Body: unknown }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { noteId } = request.params;
      const body = UpdateProgressNoteSchema.parse(request.body);

      const note = await progressNoteService.updateProgressNote(noteId, ctx.tenantId, body);

      if (!note) {
        return reply.status(404).send({ error: 'Progress note not found' });
      }

      fastify.log.info({ noteId, tenantId: ctx.tenantId }, 'Progress note updated');

      return reply.send({ data: note });
    }
  );

  /**
   * DELETE /progress-notes/:noteId
   * Delete a progress note
   */
  fastify.delete(
    '/progress-notes/:noteId',
    async (
      request: FastifyRequest<{ Params: { noteId: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { noteId } = request.params;

      const deleted = await progressNoteService.deleteProgressNote(noteId, ctx.tenantId);

      if (!deleted) {
        return reply.status(404).send({ error: 'Progress note not found' });
      }

      fastify.log.info({ noteId, tenantId: ctx.tenantId }, 'Progress note deleted');

      return reply.status(204).send();
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // GOAL PROGRESS TIMELINE
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * GET /goals/:goalId/progress-timeline
   * Get progress note timeline for a goal
   */
  fastify.get(
    '/goals/:goalId/progress-timeline',
    async (
      request: FastifyRequest<{
        Params: { goalId: string };
        Querystring: { page?: string; pageSize?: string };
      }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { goalId } = request.params;
      const { page, pageSize } = request.query;

      const result = await progressNoteService.getGoalProgressTimeline(
        ctx.tenantId,
        goalId,
        {
          page: page ? parseInt(page, 10) : 1,
          pageSize: pageSize ? parseInt(pageSize, 10) : 50,
        }
      );

      if (!result) {
        return reply.status(404).send({ error: 'Goal not found' });
      }

      return reply.send({ data: result });
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // LEARNER RECENT NOTES
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * GET /learners/:learnerId/progress-notes/recent
   * Get recent progress notes for a learner
   */
  fastify.get(
    '/learners/:learnerId/progress-notes/recent',
    async (
      request: FastifyRequest<{
        Params: { learnerId: string };
        Querystring: { limit?: string };
      }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { learnerId } = request.params;
      const { limit } = request.query;

      const notes = await progressNoteService.getLearnerRecentNotes(
        ctx.tenantId,
        learnerId,
        limit ? parseInt(limit, 10) : 10
      );

      return reply.send({ data: notes });
    }
  );
}
