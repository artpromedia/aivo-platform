/**
 * AIVO Compliance Service - Application Setup
 */

import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';

import { authMiddleware } from './middleware/authMiddleware.js';
import { registerFrameworkRoutes } from './routes/frameworks.js';
import { registerFindingRoutes } from './routes/findings.js';
import { registerDashboardRoutes } from './routes/dashboard.js';

export function createApp() {
  const app = Fastify({ logger: true });

  // Rate limiting
  void app.register(rateLimit, FastifyRateLimitPresets.internalApi('compliance-svc'));

  // Health check
  app.get('/health', async (_request, reply) => {
    return reply.status(200).send({
      status: 'ok',
      service: 'compliance-svc',
      version: '0.1.0',
    });
  });

  // Register auth middleware
  void app.register(authMiddleware as any);

  // Register routes
  void app.register(registerDashboardRoutes as any, { prefix: '/compliance/dashboard' });
  void app.register(registerFrameworkRoutes as any, { prefix: '/compliance/frameworks' });
  void app.register(registerFindingRoutes as any, { prefix: '/compliance/findings' });

  return app;
}
