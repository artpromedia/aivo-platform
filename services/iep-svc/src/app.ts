/**
 * AIVO IEP Service - Fastify Application
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';

import { authenticate } from './middleware/auth.js';
import { studentRoutes, iepRoutes, complianceRoutes } from './routes/index.js';

export function createApp() {
  const app = Fastify({ logger: true });

  // Plugins
  app.register(cors, { origin: true });
  app.register(helmet);
  app.register(sensible);

  // Health check
  app.get('/health', async () => ({ status: 'healthy', service: 'iep-svc' }));

  // Protected routes
  app.register(async (protectedApp) => {
    protectedApp.addHook('preHandler', authenticate);
    protectedApp.register(studentRoutes, { prefix: '/students' });
    protectedApp.register(iepRoutes, { prefix: '/ieps' });
    protectedApp.register(complianceRoutes, { prefix: '/compliance' });
  });

  return app;
}
