/**
 * Profile Service - Fastify Application
 *
 * Main application setup with route registration, error handling,
 * and observability hooks.
 */

import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { config } from './config.js';
import { registerProfileRoutes } from './routes/profileRoutes.js';
import { registerAccommodationRoutes } from './routes/accommodationRoutes.js';

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
  await app.register(cors, {
    origin: config.nodeEnv === 'production' ? false : true,
    credentials: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: config.nodeEnv === 'production',
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Health check endpoints
  // ────────────────────────────────────────────────────────────────────────────
  app.get('/health', async () => {
    return { status: 'healthy', service: 'profile-svc' };
  });

  app.get('/ready', async () => {
    // TODO: Check database connectivity
    return { status: 'ready', service: 'profile-svc' };
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Register API routes
  // ────────────────────────────────────────────────────────────────────────────
  await registerProfileRoutes(app);
  await registerAccommodationRoutes(app);

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
      'Request error',
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
      message:
        statusCode >= 500
          ? 'An unexpected error occurred'
          : error.message,
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Graceful shutdown
  // ────────────────────────────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down gracefully...`);
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  return app;
}
