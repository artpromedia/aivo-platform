import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';
import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';

import { config } from './config.js';
import { authMiddleware } from './middleware/authMiddleware.js';
import { healthRoutes } from './routes/health.js';
import { predictabilityRoutes } from './routes/predictability.js';
import { scheduleRoutes } from './routes/schedules.js';
import { sessionRoutes } from './routes/sessions.js';
import { transitionRoutes } from './transitions/transition.routes.js';

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

  // Health check routes (must be registered early, before auth middleware)
  await app.register(healthRoutes);

  // JWT auth for all other routes

  await app.register(authMiddleware as any);

  // Rate limiting

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
