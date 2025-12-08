import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';

import { config } from './config.js';
import { authMiddleware } from './middleware/authMiddleware.js';
import { sessionRoutes } from './routes/sessions.js';

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
  await app.register(authMiddleware);

  // Register session routes
  await app.register(sessionRoutes);

  return app;
}
