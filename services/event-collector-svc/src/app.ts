/**
 * AIVO Event Collector Service - Fastify Application
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

import { config } from './config.js';
import { authenticate } from './middleware/auth.js';
import {
  ingestRoutes,
  eventRoutes,
  batchRoutes,
  routingRoutes,
  deadLetterRoutes,
  metricsRoutes,
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
    bodyLimit: 10 * 1024 * 1024, // 10MB for batch ingestion
  });

  // Plugins
  app.register(cors, {
    origin: config.nodeEnv === 'production' ? false : true,
    credentials: true,
  });

  app.register(helmet, {
    contentSecurityPolicy: false,
  });

  // Health check (no auth)
  app.get('/health', async () => ({
    status: 'ok',
    service: 'event-collector-svc',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
  }));

  app.get('/ready', async () => ({
    status: 'ready',
    instanceId: config.instanceId,
  }));

  // API routes with authentication
  app.register(async (api) => {
    api.addHook('preHandler', authenticate);

    api.register(ingestRoutes, { prefix: '/ingest' });
    api.register(eventRoutes, { prefix: '/events' });
    api.register(batchRoutes, { prefix: '/batches' });
    api.register(routingRoutes, { prefix: '/routes' });
    api.register(deadLetterRoutes, { prefix: '/dead-letter' });
    api.register(metricsRoutes, { prefix: '/metrics' });
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
