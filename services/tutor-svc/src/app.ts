import rateLimit from '@fastify/rate-limit';
import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';
import Fastify, { type FastifyInstance } from 'fastify';

import { authMiddleware } from './middleware/authMiddleware.js';
import { personaRoutes } from './routes/personas.js';
import { sessionRoutes } from './routes/sessions.js';
import { messageRoutes } from './routes/messages.js';
import { streamRoutes } from './routes/stream.js';
import { analyticsRoutes } from './routes/analytics.js';

export async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
  });

  // Rate limiting
  await fastify.register(rateLimit, FastifyRateLimitPresets.internalApi('tutor-svc'));

  // Health check (no auth required)
  fastify.get('/health', async () => {
    return { status: 'ok', service: 'tutor-svc', timestamp: new Date().toISOString() };
  });

  // Auth middleware
  if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
    void fastify.register(authMiddleware);
  }

  // Register routes
  void fastify.register(personaRoutes, { prefix: '/api/v1/tutor/personas' });
  void fastify.register(sessionRoutes, { prefix: '/api/v1/tutor/sessions' });
  void fastify.register(messageRoutes, { prefix: '/api/v1/tutor/sessions' });
  void fastify.register(streamRoutes, { prefix: '/api/v1/tutor/sessions' });
  void fastify.register(analyticsRoutes, { prefix: '/api/v1/tutor/analytics' });

  return fastify;
}
