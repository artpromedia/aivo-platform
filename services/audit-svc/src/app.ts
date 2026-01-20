/**
 * AIVO Audit Service - Application Setup
 *
 * Fastify application configuration and route registration.
 */

import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';

import { authMiddleware } from './middleware/authMiddleware.js';
import { registerAuditRoutes } from './routes/audit.js';
import { registerExportRoutes } from './routes/export.js';
import { registerPolicyRoutes } from './routes/policy.js';
import { registerAlertRoutes } from './routes/alert.js';
import { registerIngestRoutes } from './routes/ingest.js';

export function createApp() {
  const app = Fastify({ logger: true });

  // Rate limiting
  void app.register(rateLimit, FastifyRateLimitPresets.internalApi('audit-svc'));

  // Health check endpoint
  app.get('/health', async (_request, reply) => {
    return reply.status(200).send({
      status: 'ok',
      service: 'audit-svc',
      version: '0.1.0',
    });
  });

  // Register authentication middleware
  void app.register(authMiddleware as any);

  // Register routes
  void app.register(registerIngestRoutes as any, { prefix: '/audit' });
  void app.register(registerAuditRoutes as any, { prefix: '/audit' });
  void app.register(registerExportRoutes as any, { prefix: '/audit/exports' });
  void app.register(registerPolicyRoutes as any, { prefix: '/audit/policies' });
  void app.register(registerAlertRoutes as any, { prefix: '/audit/alerts' });

  return app;
}
