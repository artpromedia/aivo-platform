/**
 * Fastify Application Setup
 */

import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';
import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import Fastify from 'fastify';

import {
  initializePushService,
  shutdownPushService,
  setInvalidTokenCallback,
} from './channels/push/push-service.js';
import { config } from './config.js';
import { initializeNats, closeNats } from './events/notification-events.js';
import { onboardingRoutes } from './onboarding/index.js';
import { deactivateToken } from './repositories/device-token.repository.js';
import {
  registerNotificationRoutes,
  registerPreferenceRoutes,
  registerDeviceRoutes,
  registerLearnerSettingsRoutes,
  registerInAppRoutes,
  registerWebhookRoutes,
  registerEmailRoutes,
} from './routes/index.js';

// Type assertion helper for Fastify plugins with type provider mismatches
const asPlugin = (plugin: unknown): FastifyPluginAsync => plugin as FastifyPluginAsync;

// Extend Fastify instance type
declare module 'fastify' {
  interface FastifyInstance {
    apnsEnabled: boolean;
  }
}

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.nodeEnv === 'production' ? 'info' : 'debug',
      transport:
        config.nodeEnv === 'production'
          ? undefined
          : { target: 'pino-pretty', options: { colorize: true } },
    },
  });

  // ════════════════════════════════════════════════════════════════════════════
  // INITIALIZE SERVICES
  // ════════════════════════════════════════════════════════════════════════════

  // Initialize push notification providers
  const pushStatus = initializePushService();
  app.decorate('apnsEnabled', pushStatus.apns);

  // Set up invalid token callback
  setInvalidTokenCallback(async (token: string) => {
    await deactivateToken(token);
  });

  // Initialize NATS for events
  await initializeNats();

  // ════════════════════════════════════════════════════════════════════════════
  // SHUTDOWN HOOKS
  // ════════════════════════════════════════════════════════════════════════════

  app.addHook('onClose', async () => {
    await shutdownPushService();
    await closeNats();
  });

  // ════════════════════════════════════════════════════════════════════════════
  // HEALTH CHECK
  // ════════════════════════════════════════════════════════════════════════════

  app.get('/health', async () => {
    const startTime = Date.now();
    let dbStatus = 'healthy';
    let dbLatencyMs = 0;
    let dbError: string | undefined;

    try {
      const { prisma } = await import('./prisma.js');
      await prisma.$queryRaw`SELECT 1 as health_check`;
      dbLatencyMs = Date.now() - startTime;
      if (dbLatencyMs > 1000) {
        dbStatus = 'unhealthy';
      } else if (dbLatencyMs > 500) {
        dbStatus = 'degraded';
      }
    } catch (error) {
      dbStatus = 'unhealthy';
      dbLatencyMs = Date.now() - startTime;
      dbError = error instanceof Error ? error.message : 'Unknown error';
    }

    return {
      status: dbStatus === 'unhealthy' ? 'unhealthy' : 'healthy',
      service: 'notify-svc',
      version: '0.2.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      push: {
        fcm: pushStatus.fcm ? 'enabled' : 'disabled',
        apns: pushStatus.apns ? 'enabled' : 'disabled',
      },
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        error: dbError,
      },
    };
  });

  app.get('/ready', async (_request, reply) => {
    try {
      const { prisma } = await import('./prisma.js');
      await prisma.$queryRaw`SELECT 1 as ready_check`;
      return reply.send({ status: 'ready', service: 'notify-svc' });
    } catch (error) {
      return reply.status(503).send({
        status: 'not ready',
        service: 'notify-svc',
        error: error instanceof Error ? error.message : 'Database unavailable',
      });
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ERROR HANDLER
  // ════════════════════════════════════════════════════════════════════════════

  app.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode ?? 500;

    if (statusCode >= 500) {
      app.log.error({ err: error, requestId: request.id }, 'Server error');
    } else {
      app.log.warn({ err: error, requestId: request.id }, 'Client error');
    }

    if (error.name === 'ZodError') {
      return reply.status(400).send({
        error: 'Validation Error',
        details: JSON.parse(error.message),
      });
    }

    if (error.message === 'Missing tenant context') {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Missing tenant context headers',
      });
    }

    return reply.status(statusCode).send({
      error: statusCode >= 500 ? 'Internal Server Error' : error.message,
      ...(config.nodeEnv !== 'production' && { stack: error.stack }),
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // RATE LIMITING
  // ════════════════════════════════════════════════════════════════════════════

  await app.register(asPlugin(rateLimit), FastifyRateLimitPresets.publicApi('notify-svc'));

  // ════════════════════════════════════════════════════════════════════════════
  // REGISTER ROUTES
  // ════════════════════════════════════════════════════════════════════════════

  await registerNotificationRoutes(app);
  await registerPreferenceRoutes(app);
  await registerDeviceRoutes(app);
  await registerLearnerSettingsRoutes(app);
  await registerInAppRoutes(app);
  await registerWebhookRoutes(app);
  await registerEmailRoutes(app);

  // Onboarding routes (internal API for cross-app flows)
  await app.register(onboardingRoutes, { prefix: '/onboarding' });

  // ════════════════════════════════════════════════════════════════════════════
  // ROOT ENDPOINT
  // ════════════════════════════════════════════════════════════════════════════

  app.get('/', async () => ({
    service: 'notify-svc',
    version: '0.1.0',
    description: 'Notification Delivery Service',
    endpoints: {
      notifications: '/notifications',
      preferences: '/preferences',
      devices: '/devices',
      learnerSettings: '/learner-settings',
      onboarding: '/onboarding',
    },
  }));

  return app;
}
