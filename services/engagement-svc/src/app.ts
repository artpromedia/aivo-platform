/**
 * Fastify app builder for engagement-svc
 */

import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';

import { config } from './config.js';
import { authMiddleware } from './middleware/authMiddleware.js';
import { engagementRoutes } from './routes/engagement.js';
import { badgeRoutes } from './routes/badges.js';
import { kudosRoutes } from './routes/kudos.js';
import { settingsRoutes } from './routes/settings.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.nodeEnv === 'production' ? 'info' : 'debug',
      transport:
        config.nodeEnv === 'production'
          ? undefined
          : { target: 'pino-pretty', options: { colorize: true } },
    },
  });

  // Health check (unauthenticated)
  app.get('/health', async () => ({ status: 'ok', service: 'engagement-svc', version: '0.1.0' }));

  // Readiness check (unauthenticated)
  app.get('/ready', async () => {
    return { status: 'ok', service: 'engagement-svc' };
  });

  // JWT auth for all other routes
  await app.register(authMiddleware);

  // Register routes
  await app.register(engagementRoutes);
  await app.register(badgeRoutes);
  await app.register(kudosRoutes);
  await app.register(settingsRoutes);

  return app;
}
