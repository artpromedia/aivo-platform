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
import { exportRoutes } from './export/export.routes.js';
import { scheduledExportRoutes } from './export/scheduled-export.routes.js';
import { runDueScheduledExports } from './export/scheduled-export.service.js';

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

  // ── Data Portability (Sprint A7) ──────────────────────────────────────────
  // Bulk data export routes: POST/GET/DELETE /exports, GET /exports/:id/download
  await app.register(asPlugin(exportRoutes), { prefix: '' });

  // Scheduled export routes: CRUD /scheduled-exports, POST /scheduled-exports/:id/run
  await app.register(asPlugin(scheduledExportRoutes), { prefix: '' });

  // Start scheduled-export runner (check every 15 minutes)
  const SCHEDULE_INTERVAL_MS = 15 * 60 * 1000;
  const systemToken = process.env.SYSTEM_TOKEN || '';
  setInterval(() => {
    runDueScheduledExports(systemToken).catch((err) =>
      console.error('[ScheduledExports] Interval runner error:', err)
    );
  }, SCHEDULE_INTERVAL_MS);

  return app;
}
