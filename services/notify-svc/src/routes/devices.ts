/**
 * Device Routes
 *
 * REST endpoints for managing device tokens.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import * as deviceTokenRepo from '../repositories/device-token.repository.js';
import * as pushService from '../channels/push/push-service.js';
import { emitDeviceEvent } from '../events/notification-events.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const RegisterDeviceSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android', 'web']),
  deviceId: z.string().optional(),
  appVersion: z.string().optional(),
});

const RefreshTokenSchema = z.object({
  oldToken: z.string().min(1),
  newToken: z.string().min(1),
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

function getUserRoles(request: FastifyRequest): string[] {
  const rolesHeader = request.headers['x-user-roles'] as string;
  if (!rolesHeader) return [];
  return rolesHeader.split(',').map((r) => r.trim());
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function registerDeviceRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /devices/register
   * Register a device token for push notifications
   */
  fastify.post(
    '/devices/register',
    async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
      const ctx = getTenantContext(request);
      const body = RegisterDeviceSchema.parse(request.body);

      const device = await deviceTokenRepo.registerDeviceToken({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        token: body.token,
        platform: body.platform,
        deviceId: body.deviceId,
        appVersion: body.appVersion,
      });

      // Subscribe to topics for broadcast notifications
      const roles = getUserRoles(request);
      if (body.platform !== 'ios' || !fastify.apnsEnabled) {
        // Use FCM topics for Android, Web, and iOS-via-FCM
        await pushService.subscribeToTopics(body.token, ctx.tenantId, roles);
      }

      // Emit event
      await emitDeviceEvent('device.registered', {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        deviceId: device.id,
        platform: body.platform,
      });

      fastify.log.info(
        { deviceId: device.id, platform: body.platform },
        'Device registered'
      );

      return reply.status(201).send({
        data: {
          id: device.id,
          platform: device.platform,
          registeredAt: device.createdAt,
        },
      });
    }
  );

  /**
   * POST /devices/refresh
   * Handle token refresh (old token -> new token)
   */
  fastify.post(
    '/devices/refresh',
    async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
      const ctx = getTenantContext(request);
      const body = RefreshTokenSchema.parse(request.body);

      const device = await deviceTokenRepo.refreshToken({
        oldToken: body.oldToken,
        newToken: body.newToken,
        userId: ctx.userId,
        tenantId: ctx.tenantId,
      });

      if (!device) {
        return reply.status(404).send({
          error: 'Device not found',
          message: 'The old token was not found or does not belong to this user',
        });
      }

      // Update topic subscriptions
      const roles = getUserRoles(request);
      await pushService.unsubscribeFromTopics(body.oldToken, ctx.tenantId, roles);
      await pushService.subscribeToTopics(body.newToken, ctx.tenantId, roles);

      fastify.log.info({ deviceId: device.id }, 'Device token refreshed');

      return reply.send({
        data: {
          id: device.id,
          refreshedAt: device.updatedAt,
        },
      });
    }
  );

  /**
   * DELETE /devices/:token
   * Unregister a device token
   */
  fastify.delete(
    '/devices/:token',
    async (
      request: FastifyRequest<{ Params: { token: string } }>,
      reply: FastifyReply
    ) => {
      const ctx = getTenantContext(request);
      const { token } = request.params;

      // Get device info before deletion
      const device = await deviceTokenRepo.getTokenByValue(token);

      if (!device) {
        return reply.status(404).send({
          error: 'Device not found',
        });
      }

      // Verify ownership
      if (device.userId !== ctx.userId) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'You can only unregister your own devices',
        });
      }

      // Unsubscribe from topics
      const roles = getUserRoles(request);
      await pushService.unsubscribeFromTopics(token, ctx.tenantId, roles);

      // Delete token
      await deviceTokenRepo.unregisterToken(token);

      // Emit event
      await emitDeviceEvent('device.unregistered', {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        deviceId: device.id,
        platform: device.platform,
      });

      fastify.log.info({ deviceId: device.id }, 'Device unregistered');

      return reply.status(204).send();
    }
  );

  /**
   * GET /devices
   * Get all registered devices for the current user
   */
  fastify.get('/devices', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getTenantContext(request);

    const devices = await deviceTokenRepo.getActiveTokensForUser(
      ctx.userId,
      ctx.tenantId
    );

    return reply.send({
      data: devices.map((d) => ({
        id: d.id,
        platform: d.platform,
        deviceId: d.deviceId,
        appVersion: d.appVersion,
        lastUsedAt: d.lastUsedAt,
        registeredAt: d.createdAt,
      })),
    });
  });

  /**
   * DELETE /devices/all
   * Unregister all devices for the current user (logout from all devices)
   */
  fastify.delete('/devices/all', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getTenantContext(request);

    // Get all tokens to unsubscribe from topics
    const devices = await deviceTokenRepo.getActiveTokensForUser(
      ctx.userId,
      ctx.tenantId
    );

    const roles = getUserRoles(request);
    for (const device of devices) {
      await pushService.unsubscribeFromTopics(device.token, ctx.tenantId, roles);
    }

    // Deactivate all tokens
    const count = await deviceTokenRepo.deactivateAllUserTokens(
      ctx.userId,
      ctx.tenantId
    );

    fastify.log.info({ userId: ctx.userId, count }, 'All devices unregistered');

    return reply.send({
      data: {
        unregisteredCount: count,
      },
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ADMIN ENDPOINTS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * GET /admin/devices/stats
   * Get device token statistics for the tenant
   */
  fastify.get(
    '/admin/devices/stats',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ctx = getTenantContext(request);

      const stats = await deviceTokenRepo.getTokenStats(ctx.tenantId);
      const activeUsers = await deviceTokenRepo.getActiveUserCount(ctx.tenantId);

      return reply.send({
        data: {
          ...stats,
          activeUsers,
        },
      });
    }
  );

  /**
   * POST /admin/devices/prune
   * Prune stale and inactive device tokens
   */
  fastify.post(
    '/admin/devices/prune',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const [stalePruned, inactivePruned] = await Promise.all([
        deviceTokenRepo.pruneStaleTokens(),
        deviceTokenRepo.pruneInactiveTokens(),
      ]);

      return reply.send({
        data: {
          stalePruned,
          inactivePruned,
          totalPruned: stalePruned + inactivePruned,
        },
      });
    }
  );
}
