import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import Fastify from 'fastify';

import { authenticate } from './middleware/auth.js';
import routes from './routes/index.js';

export function createApp() {
  const app = Fastify({ logger: true });
  app.register(cors, {
    origin: process.env.CORS_ORIGINS?.split(',') ?? (process.env.NODE_ENV === 'production' ? [] : ['http://localhost:3000', 'http://localhost:3001']),
    credentials: true,
  });
  app.register(helmet);
  app.register(sensible);
  app.register(rateLimit, FastifyRateLimitPresets.aiService('game-gen-svc'));
  app.get('/health', async () => ({ status: 'healthy', service: 'game-gen-svc' }));
  app.register(async (protectedApp) => {
    protectedApp.addHook('preHandler', authenticate);
    protectedApp.register(routes);
  });
  return app;
}
