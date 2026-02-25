/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/**
 * Profile Service - Fastify Application
 *
 * Main application setup with route registration, error handling,
 * and observability hooks.
 */

import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';

import { config } from './config.js';
import { natsPublisher } from './events/index.js';
import { connectDatabase, disconnectDatabase } from './prisma.js';
import { registerAccommodationRoutes } from './routes/accommodationRoutes.js';
import { registerLanguagePreferencesRoutes } from './routes/languagePreferencesRoutes.js';
import { registerProfileRoutes } from './routes/profileRoutes.js';
import { registerSensoryProfileRoutes } from './routes/sensory-profile.routes.js';

// ══════════════════════════════════════════════════════════════════════════════
// BUILD APPLICATION
// ══════════════════════════════════════════════════════════════════════════════

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      transport:
        config.nodeEnv === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
              },
            }
          : undefined,
    },
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Register plugins
  // ────────────────────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await app.register(cors as any, {
    origin: config.nodeEnv === 'production' ? false : true,
    credentials: true,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await app.register(helmet as any, {
    contentSecurityPolicy: config.nodeEnv === 'production',
  });

  // Rate limiting for profile endpoints
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await app.register(rateLimit as any, FastifyRateLimitPresets.publicApi('profile-svc'));

  // ────────────────────────────────────────────────────────────────────────────
  // Initialize NATS for event publishing
  // ────────────────────────────────────────────────────────────────────────────
  try {
    await natsPublisher.initialize();
    app.log.info('NATS event publisher initialized');
  } catch (error) {
    app.log.warn({ err: error }, 'NATS initialization failed - events will be skipped');
    // Continue without NATS - events are fire-and-forget
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Connect to database (resilient - service starts even if DB is unavailable)
  // ────────────────────────────────────────────────────────────────────────────
  await connectDatabase();

  // ────────────────────────────────────────────────────────────────────────────
  // Health check endpoints
  // ────────────────────────────────────────────────────────────────────────────
  app.get('/health', async () => {
    const startTime = Date.now();
    let dbStatus = 'healthy';
    let dbLatencyMs = 0;
    let dbError: string | undefined;

    try {
      const { prisma } = await import('./prisma.js');
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
      service: 'profile-svc',
      version: '1.0.0',
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
      const { prisma } = await import('./prisma.js');
      await prisma.$queryRaw`SELECT 1 as ready_check`;
      return reply.send({
        status: 'ready',
        service: 'profile-svc',
        nats: natsPublisher.isReady() ? 'connected' : 'disconnected',
      });
    } catch (error) {
      return reply.status(503).send({
        status: 'not ready',
        service: 'profile-svc',
        nats: natsPublisher.isReady() ? 'connected' : 'disconnected',
        error: error instanceof Error ? error.message : 'Database unavailable',
      });
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Register API routes
  // ────────────────────────────────────────────────────────────────────────────
  await registerProfileRoutes(app);
  await registerAccommodationRoutes(app);
  await registerSensoryProfileRoutes(app);
  await registerLanguagePreferencesRoutes(app);

  // ────────────────────────────────────────────────────────────────────────────
  // Global error handler
  // ────────────────────────────────────────────────────────────────────────────
  app.setErrorHandler((error, request, reply) => {
    app.log.error(
      {
        err: error,
        requestId: request.id,
        url: request.url,
        method: request.method,
      },
      'Request error'
    );

    // Zod validation errors
    if (error.name === 'ZodError') {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Request validation failed',
        details: error,
      });
    }

    // Prisma errors
    if (error.name === 'PrismaClientKnownRequestError') {
      const prismaError = error as { code?: string };
      if (prismaError.code === 'P2002') {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'A record with this identifier already exists',
        });
      }
      if (prismaError.code === 'P2025') {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'The requested record was not found',
        });
      }
    }

    // Default error response
    const statusCode = error.statusCode ?? 500;
    return reply.status(statusCode).send({
      error: statusCode >= 500 ? 'Internal Server Error' : error.name,
      message: statusCode >= 500 ? 'An unexpected error occurred' : error.message,
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Graceful shutdown
  // ────────────────────────────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down gracefully...`);
    await natsPublisher.close();
    await disconnectDatabase();
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  return app;
}
