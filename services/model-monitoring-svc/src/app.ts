/**
 * AIVO Model Monitoring Service - Main Application
 * 
 * Production ML model monitoring: predictions, metrics, drift, alerts
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';

import { config } from './config.js';
import { prisma } from './prisma.js';
import { registerPredictionRoutes } from './routes/predictions.js';
import { registerMetricsRoutes } from './routes/metrics.js';
import { registerDriftRoutes } from './routes/drift.js';
import { registerAlertsRoutes } from './routes/alerts.js';
import { registerABTestRoutes } from './routes/abTests.js';

export async function createApp() {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      transport: config.environment === 'development' ? {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' }
      } : undefined
    },
    requestIdHeader: 'x-request-id',
    disableRequestLogging: false,
    trustProxy: true,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MIDDLEWARE
  // ═══════════════════════════════════════════════════════════════════════════

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(rateLimit as any, FastifyRateLimitPresets.api('model-monitoring-svc'));

  // ═══════════════════════════════════════════════════════════════════════════
  // HEALTH CHECK
  // ═══════════════════════════════════════════════════════════════════════════

  app.get('/health', async () => {
    const startTime = Date.now();
    let dbStatus = 'healthy';
    let dbLatencyMs = 0;
    let dbError: string | undefined;

    try {
      await prisma.$queryRaw`SELECT 1 as health_check`;
      dbLatencyMs = Date.now() - startTime;
      if (dbLatencyMs > 1000) {
        dbStatus = 'unhealthy';
      } else if (dbLatencyMs > 500) {
        dbStatus = 'degraded';
      }
    } catch (error) {
      dbStatus = 'unhealthy';
      dbLatencyMs = Date.now() - startTime;
      dbError = error instanceof Error ? error.message : 'Unknown error';
    }

    return {
      status: dbStatus === 'unhealthy' ? 'unhealthy' : 'healthy',
      service: config.serviceName,
      version: config.version,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        error: dbError,
      },
    };
  });

  app.get('/ready', async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1 as ready_check`;
      return reply.send({ status: 'ready', service: config.serviceName });
    } catch (error) {
      return reply.status(503).send({
        status: 'not ready',
        service: config.serviceName,
        error: error instanceof Error ? error.message : 'Database unavailable',
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ROUTES
  // ═══════════════════════════════════════════════════════════════════════════

  await registerPredictionRoutes(app);
  await registerMetricsRoutes(app);
  await registerDriftRoutes(app);
  await registerAlertsRoutes(app);
  await registerABTestRoutes(app);

  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR HANDLER
  // ═══════════════════════════════════════════════════════════════════════════

  app.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode ?? 500;
    const message = error.message || 'Internal Server Error';

    request.log.error({
      err: error,
      req: { method: request.method, url: request.url },
    }, 'Request error');

    reply.status(statusCode).send({
      error: {
        message,
        statusCode,
        code: (error as any).code,
      },
    });
  });

  return app;
}
