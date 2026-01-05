/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/**
 * Profile Routes
 *
 * API endpoints for learner profile management.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { emitProfileCreated, emitProfileUpdated } from '../events/index.js';
import { CreateProfileRequestSchema, UpdateProfileRequestSchema } from '../schemas/index.js';
import {
  getProfile,
  createProfile,
  updateProfile,
  getProfileForAi,
} from '../services/profileService.js';
import type { TenantContext } from '../types/index.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface LearnerParams {
  learnerId: string;
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

export async function registerProfileRoutes(app: FastifyInstance): Promise<void> {
  // ──────────────────────────────────────────────────────────────────────────
  // GET /learners/:learnerId/profile
  // ──────────────────────────────────────────────────────────────────────────
  app.get<{ Params: LearnerParams }>(
    '/learners/:learnerId/profile',
    async (request: FastifyRequest<{ Params: LearnerParams }>, reply: FastifyReply) => {
      const context = extractTenantContext(request);
      const { learnerId } = request.params;

      const profile = await getProfile(context.tenantId, learnerId);

      if (!profile) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Learner profile not found',
        });
      }

      return reply.status(200).send({ profile });
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // POST /learners/:learnerId/profile
  // ──────────────────────────────────────────────────────────────────────────
  app.post<{ Params: LearnerParams }>(
    '/learners/:learnerId/profile',
    async (request: FastifyRequest<{ Params: LearnerParams }>, reply: FastifyReply) => {
      const context = extractTenantContext(request);
      const { learnerId } = request.params;

      const data = CreateProfileRequestSchema.parse(request.body);

      try {
        const profile = await createProfile(context.tenantId, learnerId, data, context);

        // Emit profile.created event to NATS (fire and forget)
        void emitProfileCreated(context.tenantId, learnerId, profile.id, context.userId);

        return reply.status(201).send({
          profile,
          message: 'Profile created successfully',
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes('already exists')) {
          return reply.status(409).send({
            error: 'Conflict',
            message: error.message,
          });
        }
        throw error;
      }
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // PATCH /learners/:learnerId/profile
  // ──────────────────────────────────────────────────────────────────────────
  app.patch<{ Params: LearnerParams }>(
    '/learners/:learnerId/profile',
    async (request: FastifyRequest<{ Params: LearnerParams }>, reply: FastifyReply) => {
      const context = extractTenantContext(request);
      const { learnerId } = request.params;

      const data = UpdateProfileRequestSchema.parse(request.body);

      try {
        const profile = await updateProfile(context.tenantId, learnerId, data, context);

        // Emit profile.updated event to NATS (fire and forget)
        const changedFields = Object.keys(data);
        void emitProfileUpdated(
          context.tenantId,
          learnerId,
          profile.id,
          context.userId,
          changedFields
        );

        return reply.status(200).send({
          profile,
          message: 'Profile updated successfully',
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'Profile not found') {
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
  // GET /internal/ai/learners/:learnerId/profile-for-ai
  // Internal endpoint for AI orchestrator
  // ──────────────────────────────────────────────────────────────────────────
  app.get<{ Params: LearnerParams }>(
    '/internal/ai/learners/:learnerId/profile-for-ai',
    async (request: FastifyRequest<{ Params: LearnerParams }>, reply: FastifyReply) => {
      const context = extractTenantContext(request);
      const { learnerId } = request.params;

      const profileForAi = await getProfileForAi(context.tenantId, learnerId);

      if (!profileForAi) {
        // Return empty defaults if no profile exists
        return reply.status(200).send({
          learning_style: {},
          sensory: {},
          communication: {},
          interaction_constraints: {},
          ui_accessibility: {},
          accommodations: [],
        });
      }

      return reply.status(200).send(profileForAi);
    }
  );
}
