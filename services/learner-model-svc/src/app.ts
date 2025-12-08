import Fastify, { type FastifyInstance } from 'fastify';

import { authMiddleware } from './middleware/authMiddleware.js';
import { planRoutes } from './routes/plan.js';
import { virtualBrainRoutes } from './routes/virtualBrain.js';

export function buildApp(): FastifyInstance {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
  });

  // Health check (no auth required)
  fastify.get('/health', async () => {
    return { status: 'ok', service: 'learner-model-svc', timestamp: new Date().toISOString() };
  });

  // Auth middleware
  if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
    void fastify.register(authMiddleware);
  }

  // Register routes
  void fastify.register(virtualBrainRoutes);
  void fastify.register(planRoutes);

  return fastify;
}
