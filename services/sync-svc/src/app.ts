import rateLimit from '@fastify/rate-limit';
import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';
import Fastify from 'fastify';
import { config } from './config.js';
import { syncRoutes } from './routes/sync-routes.js';
import { authMiddleware } from './middleware/auth.js';

export async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'test' ? 'error' : 'info',
    },
  });

  // Rate limiting
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await fastify.register(rateLimit as any, FastifyRateLimitPresets.dataIngestion('sync-svc'));

  // Register auth middleware
  await fastify.register(authMiddleware);

  // Register routes
  await fastify.register(syncRoutes, { prefix: '/api/v1/sync' });

  // Health check
  fastify.get('/health', async () => ({
    status: 'ok',
    service: 'sync-svc',
    timestamp: new Date().toISOString(),
  }));

  return fastify;
}
