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
