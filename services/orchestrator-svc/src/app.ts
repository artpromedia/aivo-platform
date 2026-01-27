import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import rateLimit from '@fastify/rate-limit';
import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';
import { authenticate } from './middleware/auth.js';
import routes from './routes/index.js';

export function createApp() {
  const app = Fastify({ logger: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.register(cors as any, {
    origin: process.env.CORS_ORIGINS?.split(',') ?? (process.env.NODE_ENV === 'production' ? [] : ['http://localhost:3000', 'http://localhost:3001']),
    credentials: true,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.register(helmet as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.register(sensible as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.register(rateLimit as any, FastifyRateLimitPresets.internalApi('orchestrator-svc'));
  app.get('/health', async () => ({ status: 'healthy', service: 'orchestrator-svc' }));
  app.register(async (protectedApp) => {
    protectedApp.addHook('preHandler', authenticate);
    protectedApp.register(routes);
  });
  return app;
}
