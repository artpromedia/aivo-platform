/**
 * ND-3.1: Parent Notification API Routes
 *
 * REST endpoints for managing parent notification preferences.
 * Note: ESLint unsafe warnings are expected until Prisma migration is run.
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/restrict-plus-operands */

import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { NotificationPreferencesService } from './notification-preferences.service.js';
import type {
  ParentNotificationPreferencesData,
  CategorySettings,
} from './parent-notification.types.js';
import { ParentNotificationCategory } from './parent-notification.types.js';

interface GetPreferencesParams {
  learnerId: string;
}

interface UpdatePreferencesParams {
  learnerId: string;
}

interface UpdatePreferencesBody {
  urgencySettings?: ParentNotificationPreferencesData['urgencySettings'];
  categorySettings?: CategorySettings;
  pushEnabled?: boolean;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  inAppEnabled?: boolean;
  email?: string;
  phoneNumber?: string;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  quietHoursBypassCritical?: boolean;
  digestEnabled?: boolean;
  digestFrequency?: 'realtime' | 'hourly' | 'daily' | 'weekly';
  digestTime?: string;
  digestDay?: number;
  maxNotificationsPerHour?: number;
  maxNotificationsPerDay?: number;
  timezone?: string;
  language?: string;
}

interface RegisterDeviceBody {
  token: string;
  platform: 'ios' | 'android' | 'web';
  deviceId?: string;
}

interface UnregisterDeviceBody {
  token: string;
}

interface TestNotificationBody {
  learnerId: string;
  category: ParentNotificationCategory;
  event: string;
  data?: Record<string, unknown>;
}

export function registerParentNotificationRoutes(app: FastifyInstance, prisma: PrismaClient): void {
  const preferencesService = new NotificationPreferencesService(prisma);

  /**
   * GET /parent-notifications/preferences
   * Get all notification preferences for the authenticated parent
   */
  app.get(
    '/parent-notifications/preferences',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const parentId = getAuthenticatedUserId(request);
        if (!parentId) {
          return reply.code(401).send({ error: 'Unauthorized' });
        }

        const preferences = await preferencesService.getPreferencesForParent(parentId);

        return reply.send({
          success: true,
          data: preferences,
        });
      } catch (error) {
        console.error('Error fetching preferences:', error);
        return reply.code(500).send({ error: 'Internal server error' });
      }
    }
  );

  /**
   * GET /parent-notifications/preferences/:learnerId
   * Get notification preferences for a specific learner
   */
  app.get<{ Params: GetPreferencesParams }>(
    '/parent-notifications/preferences/:learnerId',
    async (request, reply) => {
      try {
        const parentId = getAuthenticatedUserId(request);
        if (!parentId) {
          return reply.code(401).send({ error: 'Unauthorized' });
        }

        const { learnerId } = request.params;
        const preferences = await preferencesService.getPreferences(parentId, learnerId);

        if (!preferences) {
          return reply.code(404).send({ error: 'Preferences not found' });
        }

        return reply.send({
          success: true,
          data: preferences,
        });
      } catch (error) {
        console.error('Error fetching preferences:', error);
        return reply.code(500).send({ error: 'Internal server error' });
      }
    }
  );

  /**
   * PUT /parent-notifications/preferences/:learnerId
   * Update notification preferences for a specific learner
   */
  app.put<{ Params: UpdatePreferencesParams; Body: UpdatePreferencesBody }>(
    '/parent-notifications/preferences/:learnerId',
    async (request, reply) => {
      try {
        const parentId = getAuthenticatedUserId(request);
        if (!parentId) {
          return reply.code(401).send({ error: 'Unauthorized' });
        }

        const { learnerId } = request.params;

        // Validate the request body
        const validationResult = validateUpdateBody(request.body);
        if (!validationResult.valid) {
          return reply.code(400).send({ error: validationResult.error });
        }

        // Check that preferences exist
        const existing = await preferencesService.getPreferences(parentId, learnerId);
        if (!existing) {
          return reply.code(404).send({ error: 'Preferences not found' });
        }

        const updated = await preferencesService.updatePreferences(
          parentId,
          learnerId,
          request.body
        );

        return reply.send({
          success: true,
          data: updated,
        });
      } catch (error) {
        console.error('Error updating preferences:', error);
        return reply.code(500).send({ error: 'Internal server error' });
      }
    }
  );

  /**
   * POST /parent-notifications/preferences/:learnerId/reset
   * Reset preferences to defaults for a specific learner
   */
  app.post<{ Params: UpdatePreferencesParams }>(
    '/parent-notifications/preferences/:learnerId/reset',
    async (request, reply) => {
      try {
        const parentId = getAuthenticatedUserId(request);
        if (!parentId) {
          return reply.code(401).send({ error: 'Unauthorized' });
        }

        const { learnerId } = request.params;

        // Get existing to find learner name
        const existing = await preferencesService.getPreferences(parentId, learnerId);
        if (!existing) {
          return reply.code(404).send({ error: 'Preferences not found' });
        }

        // Delete existing
        await prisma.parentNotificationPreferences.delete({
          where: {
            parentId_learnerId: { parentId, learnerId },
          },
        });

        // Create new with defaults
        const newPreferences = await preferencesService.createDefaultPreferences({
          parentId,
          learnerId,
          learnerName: existing.learnerName,
          timezone: existing.timezone,
          language: existing.language,
        });

        return reply.send({
          success: true,
          data: newPreferences,
        });
      } catch (error) {
        console.error('Error resetting preferences:', error);
        return reply.code(500).send({ error: 'Internal server error' });
      }
    }
  );

  /**
   * POST /parent-notifications/devices/register
   * Register a device token for push notifications
   */
  app.post<{ Body: RegisterDeviceBody }>(
    '/parent-notifications/devices/register',
    async (request, reply) => {
      try {
        const parentId = getAuthenticatedUserId(request);
        if (!parentId) {
          return reply.code(401).send({ error: 'Unauthorized' });
        }

        const { token, platform, deviceId } = request.body;

        if (!token || !platform) {
          return reply.code(400).send({ error: 'Token and platform are required' });
        }

        if (!['ios', 'android', 'web'].includes(platform)) {
          return reply.code(400).send({ error: 'Invalid platform' });
        }

        await preferencesService.registerDeviceToken(parentId, {
          token,
          platform,
          deviceId,
        });

        return reply.send({
          success: true,
          message: 'Device registered successfully',
        });
      } catch (error) {
        console.error('Error registering device:', error);
        return reply.code(500).send({ error: 'Internal server error' });
      }
    }
  );

  /**
   * POST /parent-notifications/devices/unregister
   * Unregister a device token
   */
  app.post<{ Body: UnregisterDeviceBody }>(
    '/parent-notifications/devices/unregister',
    async (request, reply) => {
      try {
        const parentId = getAuthenticatedUserId(request);
        if (!parentId) {
          return reply.code(401).send({ error: 'Unauthorized' });
        }

        const { token } = request.body;

        if (!token) {
          return reply.code(400).send({ error: 'Token is required' });
        }

        await preferencesService.unregisterDeviceToken(token);

        return reply.send({
          success: true,
          message: 'Device unregistered successfully',
        });
      } catch (error) {
        console.error('Error unregistering device:', error);
        return reply.code(500).send({ error: 'Internal server error' });
      }
    }
  );

  /**
   * GET /parent-notifications/devices
   * Get all registered device tokens for the parent
   */
  app.get('/parent-notifications/devices', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parentId = getAuthenticatedUserId(request);
      if (!parentId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const tokens = await preferencesService.getActiveDeviceTokens(parentId);

      return reply.send({
        success: true,
        data: {
          deviceCount: tokens.length,
        },
      });
    } catch (error) {
      console.error('Error fetching devices:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  /**
   * POST /parent-notifications/test
   * Send a test notification (for development/testing)
   */
  app.post<{ Body: TestNotificationBody }>('/parent-notifications/test', async (request, reply) => {
    try {
      const parentId = getAuthenticatedUserId(request);
      if (!parentId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      // Only allow in development
      if (process.env.NODE_ENV === 'production') {
        return reply.code(403).send({ error: 'Not allowed in production' });
      }

      const { learnerId, category, event, data: testData } = request.body;

      if (!learnerId || !category || !event) {
        return reply.code(400).send({ error: 'learnerId, category, and event are required' });
      }

      // Validate category
      if (!Object.values(ParentNotificationCategory).includes(category)) {
        return reply.code(400).send({ error: 'Invalid category' });
      }

      // This would call the notification service to send a test notification
      // For now, just acknowledge the request
      return reply.send({
        success: true,
        message: 'Test notification queued',
        testData,
        data: {
          parentId,
          learnerId,
          category,
          event,
        },
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  /**
   * GET /parent-notifications/history
   * Get notification history for the parent
   */
  app.get(
    '/parent-notifications/history',
    async (
      request: FastifyRequest<{
        Querystring: { learnerId?: string; limit?: number; offset?: number };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const parentId = getAuthenticatedUserId(request);
        if (!parentId) {
          return reply.code(401).send({ error: 'Unauthorized' });
        }

        const { learnerId, limit = 50, offset = 0 } = request.query;

        const where: { parentId: string; learnerId?: string } = { parentId };
        if (learnerId) {
          where.learnerId = learnerId;
        }

        const [notifications, total] = await Promise.all([
          prisma.parentNotificationQueue.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: Math.min(limit, 100),
            skip: offset,
            select: {
              id: true,
              learnerId: true,
              learnerName: true,
              category: true,
              event: true,
              urgency: true,
              title: true,
              body: true,
              status: true,
              createdAt: true,
              deliveredAt: true,
            },
          }),
          prisma.parentNotificationQueue.count({ where }),
        ]);

        return reply.send({
          success: true,
          data: {
            notifications,
            pagination: {
              total,
              limit,
              offset,
              hasMore: offset + notifications.length < total,
            },
          },
        });
      } catch (error) {
        console.error('Error fetching notification history:', error);
        return reply.code(500).send({ error: 'Internal server error' });
      }
    }
  );
}

/**
 * Helper to get authenticated user ID from request
 */
function getAuthenticatedUserId(request: FastifyRequest): string | null {
  // This would typically come from a JWT or session
  // For now, check for a user object on the request
  const user = (request as unknown as { user?: { id?: string } }).user;
  return user?.id ?? null;
}

/**
 * Validate update preferences body
 */
function validateUpdateBody(body: UpdatePreferencesBody): { valid: boolean; error?: string } {
  // Validate quiet hours format
  if (body.quietHoursStart && !/^\d{2}:\d{2}$/.test(body.quietHoursStart)) {
    return { valid: false, error: 'Invalid quietHoursStart format. Use HH:MM' };
  }
  if (body.quietHoursEnd && !/^\d{2}:\d{2}$/.test(body.quietHoursEnd)) {
    return { valid: false, error: 'Invalid quietHoursEnd format. Use HH:MM' };
  }

  // Validate digest time format
  if (body.digestTime && !/^\d{2}:\d{2}$/.test(body.digestTime)) {
    return { valid: false, error: 'Invalid digestTime format. Use HH:MM' };
  }

  // Validate digest frequency
  if (
    body.digestFrequency &&
    !['realtime', 'hourly', 'daily', 'weekly'].includes(body.digestFrequency)
  ) {
    return { valid: false, error: 'Invalid digestFrequency' };
  }

  // Validate digest day
  if (body.digestDay !== undefined && (body.digestDay < 0 || body.digestDay > 6)) {
    return { valid: false, error: 'Invalid digestDay. Must be 0-6 (Sunday-Saturday)' };
  }

  // Validate rate limits
  if (body.maxNotificationsPerHour !== undefined && body.maxNotificationsPerHour < 1) {
    return { valid: false, error: 'maxNotificationsPerHour must be at least 1' };
  }
  if (body.maxNotificationsPerDay !== undefined && body.maxNotificationsPerDay < 1) {
    return { valid: false, error: 'maxNotificationsPerDay must be at least 1' };
  }

  return { valid: true };
}
