/**
 * Reports Service - Main Application
 *
 * Aggregates data from multiple microservices to generate
 * parent-friendly and teacher-friendly summary reports.
 */

import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';
import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import Fastify from 'fastify';

import { config } from './config.js';

// Type assertion helper for Fastify plugins with type provider mismatches
const asPlugin = (plugin: unknown): FastifyPluginAsync => plugin as FastifyPluginAsync;
import { authMiddleware } from './middleware/auth.js';
import { classroomReportRoutes } from './routes/classroomReport.js';
import { parentReportRoutes } from './routes/parentReport.js';
import { mobileProgressReportRoutes } from './routes/mobileProgressReport.js';
import reportRoutes from './routes/reports.routes.js';

export async function buildApp(): Promise<FastifyInstance> {
  const isDevelopment = config.nodeEnv !== 'production';

  const app = Fastify({
    logger: isDevelopment
      ? {
          level: 'debug',
          transport: { target: 'pino-pretty', options: { colorize: true } },
        }
      : { level: 'info' },
  });

  // Rate limiting
  await app.register(asPlugin(rateLimit), FastifyRateLimitPresets.internalApi('reports-svc'));

  // Health check (unauthenticated)
  app.get('/health', async () => ({ status: 'ok', service: 'reports-svc' }));

  // Readiness check (unauthenticated)
  app.get('/ready', async () => ({ status: 'ok', service: 'reports-svc' }));

  // JWT auth for all other routes
  await app.register(asPlugin(authMiddleware));

  // Register report routes under /reports prefix
  await app.register(parentReportRoutes, { prefix: '/reports' });
  await app.register(classroomReportRoutes, { prefix: '/reports' });

  // Register mobile progress report routes under /progress prefix
  await app.register(mobileProgressReportRoutes, { prefix: '/progress' });

  // Register enterprise report generation, scheduling, and history routes
  await app.register(asPlugin(reportRoutes), { prefix: '/reports' });

  return app;
}
