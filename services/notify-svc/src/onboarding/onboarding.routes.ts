/**
 * Onboarding Notification Routes
 *
 * Internal API endpoints for triggering onboarding notifications.
 * Called by baseline-svc and parent-svc.
 */

import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  notifyParentBaselineComplete,
  notifyParentLearnerAppDownload,
  type BaselineCompletePayload,
  type LearnerAddedPayload,
} from './onboarding-notification.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const baselineCompleteSchema = z.object({
  tenantId: z.string().min(1),
  learnerId: z.string().min(1),
  learnerName: z.string().min(1),
  parentId: z.string().min(1),
  parentEmail: z.string().email(),
  parentPhone: z.string().optional(),
  parentName: z.string().min(1),
  domainsAssessed: z.number().int().positive(),
  locale: z.string().optional(),
});

const learnerAddedSchema = z.object({
  tenantId: z.string().min(1),
  learnerId: z.string().min(1),
  learnerName: z.string().min(1),
  learnerPin: z.string().min(4).max(6),
  parentId: z.string().min(1),
  parentEmail: z.string().email(),
  parentPhone: z.string().optional(),
  parentName: z.string().min(1),
  locale: z.string().optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export const onboardingRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /onboarding/baseline-complete
   *
   * Notify parent when learner completes baseline assessment.
   * Called by baseline-svc after baseline is accepted.
   *
   * Sends:
   * - Email with Parent app download links
   * - SMS with download link (if phone provided)
   */
  fastify.post(
    '/baseline-complete',
    {
      schema: {
        description: 'Notify parent when learner completes baseline',
        tags: ['onboarding'],
        body: {
          type: 'object',
          required: ['tenantId', 'learnerId', 'learnerName', 'parentId', 'parentEmail', 'parentName', 'domainsAssessed'],
          properties: {
            tenantId: { type: 'string' },
            learnerId: { type: 'string' },
            learnerName: { type: 'string' },
            parentId: { type: 'string' },
            parentEmail: { type: 'string', format: 'email' },
            parentPhone: { type: 'string' },
            parentName: { type: 'string' },
            domainsAssessed: { type: 'integer' },
            locale: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              emailSent: { type: 'boolean' },
              smsSent: { type: 'boolean' },
              errors: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parseResult = baselineCompleteSchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parseResult.error.issues,
        });
      }

      const result = await notifyParentBaselineComplete(parseResult.data as BaselineCompletePayload);

      return reply.send(result);
    }
  );

  /**
   * POST /onboarding/learner-added
   *
   * Notify parent when they add a child in the Parent app.
   * Called by parent-svc after child is added.
   *
   * Sends:
   * - Email with Learner app download links and setup instructions
   * - SMS with download link and PIN (if phone provided)
   */
  fastify.post(
    '/learner-added',
    {
      schema: {
        description: 'Notify parent with learner app download link',
        tags: ['onboarding'],
        body: {
          type: 'object',
          required: ['tenantId', 'learnerId', 'learnerName', 'learnerPin', 'parentId', 'parentEmail', 'parentName'],
          properties: {
            tenantId: { type: 'string' },
            learnerId: { type: 'string' },
            learnerName: { type: 'string' },
            learnerPin: { type: 'string' },
            parentId: { type: 'string' },
            parentEmail: { type: 'string', format: 'email' },
            parentPhone: { type: 'string' },
            parentName: { type: 'string' },
            locale: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              emailSent: { type: 'boolean' },
              smsSent: { type: 'boolean' },
              errors: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parseResult = learnerAddedSchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parseResult.error.issues,
        });
      }

      const result = await notifyParentLearnerAppDownload(parseResult.data as LearnerAddedPayload);

      return reply.send(result);
    }
  );
};

export default onboardingRoutes;
