/**
 * Accommodation Routes
 *
 * API endpoints for learner accommodation management.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import {
  emitAccommodationCreated,
  emitAccommodationUpdated,
  emitAccommodationDeleted,
} from '../events/index.js';
import {
  CreateAccommodationRequestSchema,
  UpdateAccommodationRequestSchema,
  ListAccommodationsQuerySchema,
} from '../schemas/index.js';
import {
  listAccommodations,
  createAccommodation,
  updateAccommodation,
  deleteAccommodation,
  getAccommodation,
} from '../services/accommodationService.js';
import type { TenantContext } from '../types/index.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface LearnerParams {
  learnerId: string;
}

interface AccommodationParams extends LearnerParams {
  accommodationId: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPER: Extract tenant context from headers
// ══════════════════════════════════════════════════════════════════════════════

function extractTenantContext(request: FastifyRequest): TenantContext {
  const tenantId = request.headers['x-tenant-id'] as string | undefined;
  const userId = request.headers['x-user-id'] as string | undefined;
  const userRole = request.headers['x-user-role'] as string | undefined;

  if (!tenantId || !userId || !userRole) {
    throw new Error('Missing tenant context');
  }

  return {
    tenantId,
    userId,
    userRole: userRole as TenantContext['userRole'],
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function registerAccommodationRoutes(app: FastifyInstance): Promise<void> {
  // ──────────────────────────────────────────────────────────────────────────
  // GET /learners/:learnerId/accommodations
  // ──────────────────────────────────────────────────────────────────────────
  app.get<{ Params: LearnerParams; Querystring: Record<string, string> }>(
    '/learners/:learnerId/accommodations',
    async (request, reply: FastifyReply) => {
      const context = extractTenantContext(request);
      const { learnerId } = request.params;

      const query = ListAccommodationsQuerySchema.parse(request.query);
      const accommodations = await listAccommodations(context.tenantId, learnerId, query);

      return reply.status(200).send({ accommodations });
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // GET /learners/:learnerId/accommodations/:accommodationId
  // ──────────────────────────────────────────────────────────────────────────
  app.get<{ Params: AccommodationParams }>(
    '/learners/:learnerId/accommodations/:accommodationId',
    async (request: FastifyRequest<{ Params: AccommodationParams }>, reply: FastifyReply) => {
      const context = extractTenantContext(request);
      const { learnerId, accommodationId } = request.params;

      const accommodation = await getAccommodation(context.tenantId, learnerId, accommodationId);

      if (!accommodation) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Accommodation not found',
        });
      }

      return reply.status(200).send({ accommodation });
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // POST /learners/:learnerId/accommodations
  // ──────────────────────────────────────────────────────────────────────────
  app.post<{ Params: LearnerParams }>(
    '/learners/:learnerId/accommodations',
    async (request: FastifyRequest<{ Params: LearnerParams }>, reply: FastifyReply) => {
      const context = extractTenantContext(request);
      const { learnerId } = request.params;

      const data = CreateAccommodationRequestSchema.parse(request.body);
      const accommodation = await createAccommodation(context.tenantId, learnerId, data, context);

      // Emit accommodation.created event to NATS (fire and forget)
      // If isCritical, notify-svc will pick up the event and send notifications
      void emitAccommodationCreated(
        context.tenantId,
        learnerId,
        accommodation.id,
        context.userId,
        accommodation.category,
        accommodation.isCritical
      );

      return reply.status(201).send({
        accommodation,
        message: 'Accommodation created successfully',
      });
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // PATCH /learners/:learnerId/accommodations/:accommodationId
  // ──────────────────────────────────────────────────────────────────────────
  app.patch<{ Params: AccommodationParams }>(
    '/learners/:learnerId/accommodations/:accommodationId',
    async (request: FastifyRequest<{ Params: AccommodationParams }>, reply: FastifyReply) => {
      const context = extractTenantContext(request);
      const { learnerId, accommodationId } = request.params;

      const data = UpdateAccommodationRequestSchema.parse(request.body);

      try {
        const accommodation = await updateAccommodation(
          context.tenantId,
          learnerId,
          accommodationId,
          data,
          context
        );

        // Emit accommodation.updated event to NATS (fire and forget)
        const changedFields = Object.keys(data);
        void emitAccommodationUpdated(
          context.tenantId,
          learnerId,
          accommodationId,
          context.userId,
          changedFields
        );

        return reply.status(200).send({
          accommodation,
          message: 'Accommodation updated successfully',
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'Accommodation not found') {
          return reply.status(404).send({
            error: 'Not Found',
            message: error.message,
          });
        }
        throw error;
      }
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // DELETE /learners/:learnerId/accommodations/:accommodationId
  // ──────────────────────────────────────────────────────────────────────────
  app.delete<{ Params: AccommodationParams }>(
    '/learners/:learnerId/accommodations/:accommodationId',
    async (request: FastifyRequest<{ Params: AccommodationParams }>, reply: FastifyReply) => {
      const context = extractTenantContext(request);
      const { learnerId, accommodationId } = request.params;

      try {
        await deleteAccommodation(context.tenantId, learnerId, accommodationId, context);

        // Emit accommodation.deleted event to NATS (fire and forget)
        void emitAccommodationDeleted(context.tenantId, learnerId, accommodationId, context.userId);

        return reply.status(200).send({
          message: 'Accommodation deleted successfully',
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'Accommodation not found') {
          return reply.status(404).send({
            error: 'Not Found',
            message: error.message,
          });
        }
        throw error;
      }
    }
  );
}
