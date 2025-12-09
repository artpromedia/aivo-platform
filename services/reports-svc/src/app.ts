/**
 * Reports Service - Main Application
 *
 * Aggregates data from multiple microservices to generate
 * parent-friendly and teacher-friendly summary reports.
 */

import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';

import { config } from './config.js';
import { authMiddleware } from './middleware/auth.js';
import { classroomReportRoutes } from './routes/classroomReport.js';
import { parentReportRoutes } from './routes/parentReport.js';

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
  app.get('/health', async () => ({ status: 'ok', service: 'reports-svc' }));

  // Readiness check (unauthenticated)
  app.get('/ready', async () => ({ status: 'ok', service: 'reports-svc' }));

  // JWT auth for all other routes
  await app.register(authMiddleware);

  // Register report routes under /reports prefix
  await app.register(parentReportRoutes, { prefix: '/reports' });
  await app.register(classroomReportRoutes, { prefix: '/reports' });

  return app;
}
