import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';

import { config } from './config.js';
import { authMiddleware } from './middleware/authMiddleware.js';
import { sessionRoutes } from './routes/sessions.js';
import { scheduleRoutes } from './routes/schedules.js';
import { transitionRoutes } from './transitions/transition.routes.js';
import { predictabilityRoutes } from './routes/predictability.js';

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

  // Health check (unauthenticated)
  app.get('/health', async () => ({ status: 'ok', service: 'session-svc' }));

  // Readiness check (unauthenticated) - can add DB ping later
  app.get('/ready', async () => {
    return { status: 'ok', service: 'session-svc' };
  });

  // JWT auth for all other routes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await app.register(authMiddleware as any);

  // Rate limiting
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
