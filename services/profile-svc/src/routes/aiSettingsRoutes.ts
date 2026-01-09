/**
 * Learner AI Settings Routes
 *
 * API endpoints for managing per-learner AI feature settings.
 * CRITICAL: Supports IEP/504 accommodations requiring AI to be disabled.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import {
  getLearnerAiSettings,
  updateLearnerAiSettings,
  disableAiForLearner,
  enableAiForLearner,
  temporarilyDisableAi,
  getBulkLearnerAiSettings,
  getAiSettingsAuditLog,
  type AiDisabledReason,
} from '../services/learnerAiSettingsService.js';
import type { TenantContext } from '../types/index.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const AiDisabledReasonEnum = z.enum([
  'IEP_ACCOMMODATION',
  'PLAN_504',
  'PARENT_REQUEST',
  'TEACHER_DECISION',
  'ADMIN_POLICY',
  'ASSESSMENT_MODE',
  'BEHAVIORAL',
  'OTHER',
]);

const UpdateAiSettingsSchema = z.object({
  aiEnabled: z.boolean().optional(),
  disabledReason: AiDisabledReasonEnum.optional(),
  disabledReasonText: z.string().max(500).optional(),
  tutorEnabled: z.boolean().optional(),
  homeworkHelperEnabled: z.boolean().optional(),
  hintsEnabled: z.boolean().optional(),
  focusModeEnabled: z.boolean().optional(),
  recommendationsEnabled: z.boolean().optional(),
  temporaryDisableUntil: z.string().datetime().optional().nullable(),
  temporaryDisableReason: z.string().max(500).optional(),
});

const DisableAiSchema = z.object({
  reason: AiDisabledReasonEnum,
  reasonText: z.string().min(1).max(500),
});

const TemporaryDisableSchema = z.object({
  until: z.string().datetime(),
  reason: z.string().min(1).max(500),
});

const BulkGetSchema = z.object({
  learnerIds: z.array(z.string().uuid()).min(1).max(100),
});

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

export async function registerAiSettingsRoutes(app: FastifyInstance): Promise<void> {
  // ──────────────────────────────────────────────────────────────────────────
  // GET /learners/:learnerId/ai-settings
  // Get AI settings for a specific learner
  // ──────────────────────────────────────────────────────────────────────────
  app.get<{ Params: LearnerParams }>(
    '/learners/:learnerId/ai-settings',
    async (request: FastifyRequest<{ Params: LearnerParams }>, reply: FastifyReply) => {
      const context = extractTenantContext(request);
      const { learnerId } = request.params;

      const settings = await getLearnerAiSettings(context.tenantId, learnerId);

      return reply.status(200).send({ settings });
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // PATCH /learners/:learnerId/ai-settings
  // Update AI settings for a specific learner
  // ──────────────────────────────────────────────────────────────────────────
  app.patch<{ Params: LearnerParams }>(
    '/learners/:learnerId/ai-settings',
    async (request: FastifyRequest<{ Params: LearnerParams }>, reply: FastifyReply) => {
      const context = extractTenantContext(request);
      const { learnerId } = request.params;

      const data = UpdateAiSettingsSchema.parse(request.body);

      // Convert string datetime to Date if provided
      const updateData = {
        ...data,
        temporaryDisableUntil: data.temporaryDisableUntil
          ? new Date(data.temporaryDisableUntil)
          : data.temporaryDisableUntil === null
            ? null
            : undefined,
      };

      const settings = await updateLearnerAiSettings(
        context.tenantId,
        learnerId,
        updateData,
        context
      );

      return reply.status(200).send({
        settings,
        message: 'AI settings updated successfully',
      });
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // POST /learners/:learnerId/ai-settings/disable
  // Disable AI for a specific learner (convenience endpoint)
  // ──────────────────────────────────────────────────────────────────────────
  app.post<{ Params: LearnerParams }>(
    '/learners/:learnerId/ai-settings/disable',
    async (request: FastifyRequest<{ Params: LearnerParams }>, reply: FastifyReply) => {
      const context = extractTenantContext(request);
      const { learnerId } = request.params;

      const data = DisableAiSchema.parse(request.body);

      const settings = await disableAiForLearner(
        context.tenantId,
        learnerId,
        data.reason as AiDisabledReason,
        data.reasonText,
        context
      );

      return reply.status(200).send({
        settings,
        message: `AI disabled for learner. Reason: ${data.reasonText}`,
      });
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // POST /learners/:learnerId/ai-settings/enable
  // Enable AI for a specific learner (convenience endpoint)
  // ──────────────────────────────────────────────────────────────────────────
  app.post<{ Params: LearnerParams }>(
    '/learners/:learnerId/ai-settings/enable',
    async (request: FastifyRequest<{ Params: LearnerParams }>, reply: FastifyReply) => {
      const context = extractTenantContext(request);
      const { learnerId } = request.params;

      const settings = await enableAiForLearner(context.tenantId, learnerId, context);

      return reply.status(200).send({
        settings,
        message: 'AI enabled for learner',
      });
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // POST /learners/:learnerId/ai-settings/temporary-disable
  // Temporarily disable AI (e.g., for assessments)
  // ──────────────────────────────────────────────────────────────────────────
  app.post<{ Params: LearnerParams }>(
    '/learners/:learnerId/ai-settings/temporary-disable',
    async (request: FastifyRequest<{ Params: LearnerParams }>, reply: FastifyReply) => {
      const context = extractTenantContext(request);
      const { learnerId } = request.params;

      const data = TemporaryDisableSchema.parse(request.body);
      const until = new Date(data.until);

      // Validate that until is in the future
      if (until <= new Date()) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Temporary disable date must be in the future',
        });
      }

      const settings = await temporarilyDisableAi(
        context.tenantId,
        learnerId,
        until,
        data.reason,
        context
      );

      return reply.status(200).send({
        settings,
        message: `AI temporarily disabled until ${until.toISOString()}`,
      });
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // GET /learners/:learnerId/ai-settings/audit-log
  // Get audit log for AI settings changes
  // ──────────────────────────────────────────────────────────────────────────
  app.get<{ Params: LearnerParams; Querystring: { limit?: string; offset?: string } }>(
    '/learners/:learnerId/ai-settings/audit-log',
    async (
      request: FastifyRequest<{
        Params: LearnerParams;
        Querystring: { limit?: string; offset?: string };
      }>,
      reply: FastifyReply
    ) => {
      const context = extractTenantContext(request);
      const { learnerId } = request.params;
      const { limit, offset } = request.query;

      const result = await getAiSettingsAuditLog(context.tenantId, learnerId, {
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      });

      return reply.status(200).send(result);
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // POST /ai-settings/bulk
  // Get AI settings for multiple learners (for class roster views)
  // ──────────────────────────────────────────────────────────────────────────
  app.post(
    '/ai-settings/bulk',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const context = extractTenantContext(request);
      const data = BulkGetSchema.parse(request.body);

      const settingsMap = await getBulkLearnerAiSettings(context.tenantId, data.learnerIds);

      // Convert Map to object for JSON response
      const settings: Record<string, unknown> = {};
      for (const [learnerId, learnerSettings] of settingsMap) {
        settings[learnerId] = learnerSettings;
      }

      return reply.status(200).send({ settings });
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // GET /internal/ai/learners/:learnerId/ai-settings
  // Internal endpoint for AI orchestrator to check if AI is enabled
  // ──────────────────────────────────────────────────────────────────────────
  app.get<{ Params: LearnerParams }>(
    '/internal/ai/learners/:learnerId/ai-settings',
    async (request: FastifyRequest<{ Params: LearnerParams }>, reply: FastifyReply) => {
      const context = extractTenantContext(request);
      const { learnerId } = request.params;

      const settings = await getLearnerAiSettings(context.tenantId, learnerId);

      // Return simplified settings for AI orchestrator
      return reply.status(200).send({
        aiEnabled: settings.aiEnabled,
        aiDisabledReason: settings.aiDisabledReason,
        disabledBy: settings.disabledBy,
        disabledAt: settings.disabledAt,
      });
    }
  );
}
