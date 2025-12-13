/**
 * Preference Routes
 *
 * REST endpoints for managing notification preferences and devices.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import * as preferenceService from '../services/preferenceService.js';
import { NotificationType } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const UpdatePreferencesSchema = z.object({
  inAppEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  typePreferences: z.record(z.boolean()).optional(),
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  quietHoursTimezone: z.string().optional().nullable(),
  digestEnabled: z.boolean().optional(),
  digestFrequency: z.enum(['daily', 'weekly']).optional().nullable(),
  digestTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
});

const RegisterDeviceSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android', 'web']),
  deviceId: z.string().optional(),
  appVersion: z.string().optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function getTenantContext(request: FastifyRequest): { tenantId: string; userId: string } {
  const tenantId = request.headers['x-tenant-id'] as string;
  const userId = request.headers['x-user-id'] as string;

  if (!tenantId || !userId) {
    throw new Error('Missing tenant context');
  }

  return { tenantId, userId };
}

export async function registerPreferenceRoutes(fastify: FastifyInstance): Promise<void> {
  // ════════════════════════════════════════════════════════════════════════════
  // PREFERENCES
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * GET /preferences
   * Get current user's notification preferences
   */
  fastify.get('/preferences', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getTenantContext(request);

    const preferences = await preferenceService.getPreferences(ctx.tenantId, ctx.userId);

    return reply.send({ data: preferences });
  });

  /**
   * PATCH /preferences
   * Update notification preferences
   */
  fastify.patch(
    '/preferences',
    async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
      const ctx = getTenantContext(request);
      const body = UpdatePreferencesSchema.parse(request.body);

      const preferences = await preferenceService.updatePreferences(ctx.tenantId, ctx.userId, body);

      fastify.log.info({ userId: ctx.userId }, 'Preferences updated');

      return reply.send({ data: preferences });
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // DEVICE TOKENS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * POST /devices
   * Register a device for push notifications
   */
  fastify.post(
    '/devices',
    async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
      const ctx = getTenantContext(request);
      const body = RegisterDeviceSchema.parse(request.body);

      const device = await preferenceService.registerDeviceToken(
        ctx.tenantId,
        ctx.userId,
        body.token,
        body.platform,
        body.deviceId,
        body.appVersion
      );

      fastify.log.info({ userId: ctx.userId, platform: body.platform }, 'Device registered');

      return reply.status(201).send({ data: device });
    }
  );

  /**
   * GET /devices
   * List registered devices
   */
  fastify.get('/devices', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getTenantContext(request);

    const devices = await preferenceService.getActiveDeviceTokens(ctx.userId);

    return reply.send({ data: devices });
  });

  /**
   * DELETE /devices/:token
   * Deactivate a device token
   */
  fastify.delete(
    '/devices/:token',
    async (request: FastifyRequest<{ Params: { token: string } }>, reply: FastifyReply) => {
      const { token } = request.params;

      await preferenceService.deactivateDeviceToken(token);

      return reply.status(204).send();
    }
  );
}
