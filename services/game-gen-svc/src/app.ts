import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import { authenticate } from './middleware/auth.js';
import routes from './routes/index.js';

export function createApp() {
  const app = Fastify({ logger: true });
  app.register(cors, { origin: true });
  app.register(helmet);
  app.register(sensible);
  app.get('/health', async () => ({ status: 'healthy', service: 'game-gen-svc' }));
  app.register(async (protectedApp) => {
    protectedApp.addHook('preHandler', authenticate);
    protectedApp.register(routes);
  });
  return app;
}
