/**
 * AIVO Legal Hold Service - Fastify Application
 */

import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';

import { config } from './config.js';
import { authenticate } from './middleware/auth.js';
import {
  matterRoutes,
  holdRoutes,
  custodianRoutes,
  dataSourceRoutes,
  acknowledgeRoutes,
  reportRoutes,
} from './routes/index.js';

export function createApp() {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      transport: config.nodeEnv === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
    trustProxy: true,
  });

  // Plugins
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.register(cors as any, {
    origin: config.nodeEnv === 'production' ? false : true,
    credentials: true,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.register(helmet as any, { contentSecurityPolicy: false });

  // Rate limiting
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.register(rateLimit as any, FastifyRateLimitPresets.internalApi('legal-hold-svc'));

  // Health check
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
      service: 'legal-hold-svc',
      version: process.env.npm_package_version || '1.0.0',
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
      return reply.send({ status: 'ready', service: 'legal-hold-svc' });
    } catch (error) {
      return reply.status(503).send({
        status: 'not ready',
        service: 'legal-hold-svc',
        error: error instanceof Error ? error.message : 'Database unavailable',
      });
    }
  });

  app.get('/ready', async () => ({ status: 'ready' }));

  // Public acknowledgment routes (no auth required)
  app.register(acknowledgeRoutes, { prefix: '/acknowledge' });

  // Authenticated API routes
  app.register(async (api) => {
    api.addHook('preHandler', authenticate);

    api.register(matterRoutes, { prefix: '/matters' });
    api.register(holdRoutes, { prefix: '/holds' });
    api.register(custodianRoutes, { prefix: '/custodians' });
    api.register(dataSourceRoutes, { prefix: '/data-sources' });
    api.register(reportRoutes, { prefix: '/reports' });
  }, { prefix: '/api/v1' });

  // Error handler
  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    if (error.validation) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: error.message,
        details: error.validation,
      });
    }

    const statusCode = error.statusCode || 500;
    return reply.status(statusCode).send({
      error: statusCode >= 500 ? 'Internal Server Error' : error.message,
      message: config.nodeEnv === 'development' ? error.message : undefined,
    });
  });

  return app;
}
