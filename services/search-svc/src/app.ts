import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import Fastify from 'fastify';

import { authenticate } from './middleware/auth.js';
import routes from './routes/index.js';

// Type assertion helper for Fastify plugins with type provider mismatches
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const registerPlugin = (app: any, plugin: unknown, opts?: unknown) => app.register(plugin, opts);

export function createApp() {
  const app = Fastify({ logger: true });
  registerPlugin(app, cors, {
    origin:
      process.env.CORS_ORIGINS?.split(',') ??
      (process.env.NODE_ENV === 'production'
        ? []
        : ['http://localhost:3000', 'http://localhost:3001']),
    credentials: true,
  });
  registerPlugin(app, helmet);
  registerPlugin(app, sensible);
  registerPlugin(app, rateLimit, FastifyRateLimitPresets.search('search-svc'));
  app.get('/health', async () => ({ status: 'healthy', service: 'search-svc' }));
  app.register(async (protectedApp) => {
    protectedApp.addHook('preHandler', authenticate);
    protectedApp.register(routes);
  });
  return app;
}
