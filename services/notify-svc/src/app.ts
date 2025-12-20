/**
 * Fastify Application Setup
 */

import Fastify, { FastifyInstance } from 'fastify';

import { config } from './config.js';
import { registerNotificationRoutes, registerPreferenceRoutes, registerDeviceRoutes } from './routes/index.js';
import { initializePushService, shutdownPushService, setInvalidTokenCallback } from './channels/push/push-service.js';
import { initializeNats, closeNats } from './events/notification-events.js';
import { deactivateToken } from './repositories/device-token.repository.js';

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
        config.nodeEnv !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
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

  app.get('/health', async () => ({
    status: 'ok',
    service: 'notify-svc',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    push: {
      fcm: pushStatus.fcm ? 'enabled' : 'disabled',
      apns: pushStatus.apns ? 'enabled' : 'disabled',
    },
  }));

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
  // REGISTER ROUTES
  // ════════════════════════════════════════════════════════════════════════════

  await registerNotificationRoutes(app);
  await registerPreferenceRoutes(app);
  await registerDeviceRoutes(app);

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
    },
  }));

  return app;
}
