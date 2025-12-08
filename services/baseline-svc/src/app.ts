import Fastify, { type FastifyInstance } from 'fastify';

import { authMiddleware } from './middleware/authMiddleware.js';
import { baselineRoutes } from './routes/baseline.js';

export function buildApp(): FastifyInstance {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
  });

  // Health check (no auth required)
  fastify.get('/health', async () => {
    return { status: 'ok', service: 'baseline-svc', timestamp: new Date().toISOString() };
  });

  // Auth middleware
  void fastify.register(authMiddleware);

  // Register routes
  void fastify.register(baselineRoutes);

  return fastify;
}
