/**
 * AIVO Legal Hold Service - Fastify Application
 */

import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';

import { config } from './config.js';
import { authenticate } from './middleware/auth.js';
import {
  matterRoutes,
  holdRoutes,
  custodianRoutes,
  dataSourceRoutes,
  acknowledgeRoutes,
  reportRoutes,
} from './routes/index.js';

export function createApp() {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      transport: config.nodeEnv === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
    trustProxy: true,
  });

  // Plugins
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.register(cors as any, {
    origin: config.nodeEnv === 'production' ? false : true,
    credentials: true,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.register(helmet as any, { contentSecurityPolicy: false });

  // Rate limiting
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.register(rateLimit as any, FastifyRateLimitPresets.internalApi('legal-hold-svc'));

  // Health check
  app.get('/health', async () => ({
    status: 'ok',
    service: 'legal-hold-svc',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
  }));

  app.get('/ready', async () => ({ status: 'ready' }));

  // Public acknowledgment routes (no auth required)
  app.register(acknowledgeRoutes, { prefix: '/acknowledge' });

  // Authenticated API routes
  app.register(async (api) => {
    api.addHook('preHandler', authenticate);

    api.register(matterRoutes, { prefix: '/matters' });
    api.register(holdRoutes, { prefix: '/holds' });
    api.register(custodianRoutes, { prefix: '/custodians' });
    api.register(dataSourceRoutes, { prefix: '/data-sources' });
    api.register(reportRoutes, { prefix: '/reports' });
  }, { prefix: '/api/v1' });

  // Error handler
  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    if (error.validation) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: error.message,
        details: error.validation,
      });
    }

    const statusCode = error.statusCode || 500;
    return reply.status(statusCode).send({
      error: statusCode >= 500 ? 'Internal Server Error' : error.message,
      message: config.nodeEnv === 'development' ? error.message : undefined,
    });
  });

  return app;
}
