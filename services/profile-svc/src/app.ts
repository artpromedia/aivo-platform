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
import { registerAccommodationRoutes } from './routes/accommodationRoutes.js';
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
  // Health check endpoints
  // ────────────────────────────────────────────────────────────────────────────
  app.get('/health', async () => {
    return { status: 'healthy', service: 'profile-svc' };
  });

  app.get('/ready', async () => {
    return {
      status: 'ready',
      service: 'profile-svc',
      nats: natsPublisher.isReady() ? 'connected' : 'disconnected',
    };
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Register API routes
  // ────────────────────────────────────────────────────────────────────────────
  await registerProfileRoutes(app);
  await registerAccommodationRoutes(app);
  await registerSensoryProfileRoutes(app);

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
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  return app;
}
