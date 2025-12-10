import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';

import { config } from './config.js';
import { authMiddleware } from './middleware/auth.js';
import { learnerAnalyticsRoutes } from './routes/learnerAnalytics.js';
import { parentAnalyticsRoutes } from './routes/parentAnalytics.js';
import { teacherAnalyticsRoutes } from './routes/teacherAnalytics.js';

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
  app.get('/health', async () => ({ status: 'ok', service: 'analytics-svc' }));

  // Readiness check (unauthenticated)
  app.get('/ready', async () => ({ status: 'ok', service: 'analytics-svc' }));

  // JWT auth for all other routes
  await app.register(authMiddleware);

  // Register analytics routes under /analytics prefix
  await app.register(learnerAnalyticsRoutes, { prefix: '/analytics' });
  await app.register(parentAnalyticsRoutes, { prefix: '/analytics' });
  await app.register(teacherAnalyticsRoutes, { prefix: '/analytics' });

  return app;
}
