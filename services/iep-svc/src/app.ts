/**
 * AIVO IEP Service - Fastify Application
 */

import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import Fastify from 'fastify';

import { authenticate } from './middleware/auth.js';
import { studentRoutes, iepRoutes, complianceRoutes } from './routes/index.js';

export function createApp() {
  const app = Fastify({ logger: true });

  // Plugins
  app.register(cors as any, {
    origin: process.env.CORS_ORIGINS?.split(',') ?? (process.env.NODE_ENV === 'production' ? [] : ['http://localhost:3000', 'http://localhost:3001']),
    credentials: true,
  });
  app.register(helmet as any);
  app.register(sensible as any);
  app.register(rateLimit as any, {
    max: 100,
    timeWindow: '1 minute',
  });

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
