import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import rateLimit from '@fastify/rate-limit';
import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';
import { authenticate } from './middleware/auth.js';
import routes from './routes/index.js';

export function createApp() {
  const app = Fastify({ logger: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.register(cors as any, {
    origin: process.env.CORS_ORIGINS?.split(',') ?? (process.env.NODE_ENV === 'production' ? [] : ['http://localhost:3000', 'http://localhost:3001']),
    credentials: true,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.register(helmet as any);
  app.register(sensible);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.register(rateLimit as any, FastifyRateLimitPresets.internalApi('orchestrator-svc'));
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
      service: 'orchestrator-svc',
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
      return reply.send({ status: 'ready', service: 'orchestrator-svc' });
    } catch (error) {
      return reply.status(503).send({
        status: 'not ready',
        service: 'orchestrator-svc',
        error: error instanceof Error ? error.message : 'Database unavailable',
      });
    }
  });
  app.register(async (protectedApp) => {
    protectedApp.addHook('preHandler', authenticate);
    protectedApp.register(routes);
  });
  return app;
}
