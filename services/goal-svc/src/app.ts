/**
 * Fastify Application Setup
 *
 * Configures the Fastify instance with plugins and routes.
 */

import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';
import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';

import { config } from './config.js';
import {
  registerGoalRoutes,
  registerSessionPlanRoutes,
  registerProgressNoteRoutes,
  registerInternalRoutes,
} from './routes/index.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.nodeEnv === 'production' ? 'info' : 'debug',
      transport:
        config.nodeEnv !== 'production'
          ? {
              target: 'pino-pretty',
              options: { colorize: true },
            }
          : undefined,
    },
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
      service: 'goal-svc',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
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
      return reply.send({ status: 'ready', service: 'goal-svc' });
    } catch (error) {
      return reply.status(503).send({
        status: 'not ready',
        service: 'goal-svc',
        error: error instanceof Error ? error.message : 'Database unavailable',
      });
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ERROR HANDLER
  // ════════════════════════════════════════════════════════════════════════════

  app.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode ?? 500;

    // Log error
    if (statusCode >= 500) {
      app.log.error({ err: error, requestId: request.id }, 'Server error');
    } else {
      app.log.warn({ err: error, requestId: request.id }, 'Client error');
    }

    // Handle Zod validation errors
    if (error.name === 'ZodError') {
      return reply.status(400).send({
        error: 'Validation Error',
        details: JSON.parse(error.message),
      });
    }

    // Handle known errors
    if (error.message === 'Missing tenant context') {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Missing tenant context headers',
      });
    }

    // Generic error response
    return reply.status(statusCode).send({
      error: statusCode >= 500 ? 'Internal Server Error' : error.message,
      ...(config.nodeEnv !== 'production' && { stack: error.stack }),
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // RATE LIMITING
  // ════════════════════════════════════════════════════════════════════════════

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await app.register(rateLimit as any, FastifyRateLimitPresets.publicApi('goal-svc'));

  // ════════════════════════════════════════════════════════════════════════════
  // REGISTER ROUTES
  // ════════════════════════════════════════════════════════════════════════════

  await registerGoalRoutes(app);
  await registerSessionPlanRoutes(app);
  await registerProgressNoteRoutes(app);
  await registerInternalRoutes(app);

  // ════════════════════════════════════════════════════════════════════════════
  // ROOT ENDPOINT
  // ════════════════════════════════════════════════════════════════════════════

  app.get('/', async () => ({
    service: 'goal-svc',
    version: '0.1.0',
    description: 'Goals, Objectives & Session Planning Service',
    endpoints: {
      goals: '/goals',
      objectives: '/objectives',
      sessionPlans: '/session-plans',
      progressNotes: '/progress-notes',
    },
  }));

  return app;
}
