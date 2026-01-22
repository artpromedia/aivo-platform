import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import Fastify, { type FastifyPluginAsync } from 'fastify';

import { authenticate } from './middleware/auth.js';
import routes from './routes/index.js';

// Type assertion helper for Fastify plugins with type provider mismatches
const asPlugin = (plugin: unknown): FastifyPluginAsync => plugin as FastifyPluginAsync;

export function createApp() {
  const app = Fastify({ logger: true });
  app.register(asPlugin(cors), {
    origin:
      process.env.CORS_ORIGINS?.split(',') ??
      (process.env.NODE_ENV === 'production'
        ? []
        : ['http://localhost:3000', 'http://localhost:3001']),
    credentials: true,
  });
  app.register(asPlugin(helmet));
  app.register(asPlugin(sensible));
  app.register(asPlugin(rateLimit), FastifyRateLimitPresets.search('search-svc'));
  app.get('/health', async () => ({ status: 'healthy', service: 'search-svc' }));
  app.register(async (protectedApp) => {
    protectedApp.addHook('preHandler', authenticate);
    protectedApp.register(routes);
  });
  return app;
}
