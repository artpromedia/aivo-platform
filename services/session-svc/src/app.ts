import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';

import { config } from './config.js';
import { authMiddleware } from './middleware/authMiddleware.js';
import { sessionRoutes } from './routes/sessions.js';
import { scheduleRoutes } from './routes/schedules.js';
import { transitionRoutes } from './transitions/transition.routes.js';
import { predictabilityRoutes } from './routes/predictability.js';

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

  // Health check (unauthenticated)
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
      service: 'session-svc',
      version: '1.0.0',
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
      return reply.send({ status: 'ready', service: 'session-svc' });
    } catch (error) {
      return reply.status(503).send({
        status: 'not ready',
        service: 'session-svc',
        error: error instanceof Error ? error.message : 'Database unavailable',
      });
    }
  });

  // Readiness check (unauthenticated) - can add DB ping later
  app.get('/ready', async () => {
    return { status: 'ok', service: 'session-svc' };
  });

  // JWT auth for all other routes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await app.register(authMiddleware as any);

  // Rate limiting
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await app.register(rateLimit as any, FastifyRateLimitPresets.publicApi('session-svc'));

  // Register session routes
  await app.register(sessionRoutes);

  // Register schedule routes (ND-1.3 Visual Schedules)
  await app.register(scheduleRoutes, { prefix: '/schedules' });

  // Register transition routes
  await app.register(transitionRoutes);

  // Register predictability routes (ND-2.2)
  await app.register(predictabilityRoutes);

  return app;
}
