/**
 * Community Service App
 * Fastify application setup
 */

import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';

import { config } from './config.js';
import {
  registerPostRoutes,
  registerResourceRoutes,
  registerStatsRoutes,
} from './routes/index.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      transport:
        config.nodeEnv === 'development'
          ? {
              target: 'pino-pretty',
              options: { colorize: true },
            }
          : undefined,
    },
  });

  // ════════════════════════════════════════════════════════════════════════════
  // RATE LIMITING
  // ════════════════════════════════════════════════════════════════════════════
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await app.register(rateLimit as any, FastifyRateLimitPresets.publicApi('community-svc'));

  // ════════════════════════════════════════════════════════════════════════════
  // CORS (for development)
  // ════════════════════════════════════════════════════════════════════════════
  app.addHook('onRequest', async (request, reply): Promise<void> => {
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    reply.header(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Tenant-Id, X-User-Id, X-User-Name, X-User-Role, X-User-School'
    );

    if (request.method === 'OPTIONS') {
      await reply.status(204).send();
      return;
    }
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
      service: config.serviceName,
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
      return reply.send({ status: 'ready', service: config.serviceName });
    } catch (error) {
      return reply.status(503).send({
        status: 'not ready',
        service: config.serviceName,
        error: error instanceof Error ? error.message : 'Database unavailable',
      });
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ERROR HANDLER
  // ════════════════════════════════════════════════════════════════════════════
  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    // Zod validation errors
    if (error.name === 'ZodError') {
      return reply.status(400).send({
        error: 'Validation Error',
        details: JSON.parse(error.message),
      });
    }

    // Prisma errors
    if (error.name === 'PrismaClientKnownRequestError') {
      return reply.status(400).send({
        error: 'Database Error',
        message: 'Invalid request',
      });
    }

    // Default error
    return reply.status(error.statusCode ?? 500).send({
      error: error.message ?? 'Internal Server Error',
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ROUTES
  // ════════════════════════════════════════════════════════════════════════════
  await registerPostRoutes(app);
  await registerResourceRoutes(app);
  await registerStatsRoutes(app);

  return app;
}
