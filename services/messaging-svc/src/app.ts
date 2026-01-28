/**
 * Fastify Application Setup
 */

import Fastify, { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';

import { config } from './config.js';
import { prisma } from './prisma.js';
import { registerConversationRoutes, registerMessageRoutes, registerThreadRoutes } from './routes/index.js';
import { registerMobileMessagingRoutes } from './routes/mobileMessaging.js';

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

  // Rate limiting for messaging endpoints
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await app.register(rateLimit as any, FastifyRateLimitPresets.messaging('messaging-svc'));

  // ════════════════════════════════════════════════════════════════════════════
  // HEALTH CHECK
  // ════════════════════════════════════════════════════════════════════════════

  app.get('/health', async () => {
    const startTime = Date.now();
    let dbStatus = 'healthy';
    let dbLatencyMs = 0;
    let dbError: string | undefined;

    try {
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
      service: 'messaging-svc',
      version: '0.2.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        error: dbError,
      },
    };
  });

  // Readiness check (Kubernetes/healthcheck probes)
  app.get('/ready', async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1 as ready_check`;
      return reply.send({ status: 'ready', service: 'messaging-svc' });
    } catch (error) {
      return reply.status(503).send({
        status: 'not ready',
        service: 'messaging-svc',
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

    // Handle business logic errors
    const businessErrors = [
      'User is not a participant in this conversation',
      'Only the sender can edit this message',
      'Not authorized to delete this message',
      'Message not found',
    ];

    if (businessErrors.includes(error.message)) {
      return reply.status(error.message.includes('not found') ? 404 : 403).send({
        error: error.message,
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

  await registerConversationRoutes(app);
  await registerMessageRoutes(app);
  await registerThreadRoutes(app);

  // Register mobile-specific messaging routes
  await registerMobileMessagingRoutes(app);

  // ════════════════════════════════════════════════════════════════════════════
  // ROOT ENDPOINT
  // ════════════════════════════════════════════════════════════════════════════

  app.get('/', async () => ({
    service: 'messaging-svc',
    version: '0.2.0',
    description: 'In-app Messaging Service with Contextual Threads',
    endpoints: {
      conversations: '/conversations',
      messages: '/messages',
      threads: '/threads',
      unread: '/unread',
    },
  }));

  return app;
}
