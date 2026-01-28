/**
 * AIVO IEP Service - Fastify Application
 */

import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import Fastify from 'fastify';

import { authenticate } from './middleware/auth.js';
import { studentRoutes, iepRoutes, complianceRoutes } from './routes/index.js';

export function createApp() {
  const app = Fastify({ logger: true });

  // Plugins
  app.register(cors as any, {
    origin: process.env.CORS_ORIGINS?.split(',') ?? (process.env.NODE_ENV === 'production' ? [] : ['http://localhost:3000', 'http://localhost:3001']),
    credentials: true,
  });
  app.register(helmet as any);
  app.register(sensible as any);
  app.register(rateLimit as any, {
    max: 100,
    timeWindow: '1 minute',
  });

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
      service: 'iep-svc',
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
      return reply.send({ status: 'ready', service: 'iep-svc' });
    } catch (error) {
      return reply.status(503).send({
        status: 'not ready',
        service: 'iep-svc',
        error: error instanceof Error ? error.message : 'Database unavailable',
      });
    }
  });

  // Protected routes
  app.register(async (protectedApp) => {
    protectedApp.addHook('preHandler', authenticate);
    protectedApp.register(studentRoutes, { prefix: '/students' });
    protectedApp.register(iepRoutes, { prefix: '/ieps' });
    protectedApp.register(complianceRoutes, { prefix: '/compliance' });
  });

  return app;
}
