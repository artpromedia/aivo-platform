/**
 * Research Service - Fastify Application
 *
 * Researcher & Insights Export Portal backend.
 * Provides governed access to de-identified analytics data.
 */

import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

// Import types to augment Fastify JWT module
import './types.js';

import { config } from './config.js';
import { prisma } from './prisma.js';
import { accessRoutes } from './routes/access.js';
import { auditRoutes } from './routes/audit.js';
import { dataRoutes } from './routes/data.js';
import { exportRoutes } from './routes/exports.js';
import { projectRoutes } from './routes/projects.js';

// ═══════════════════════════════════════════════════════════════════════════════
// App Factory
// ═══════════════════════════════════════════════════════════════════════════════

export async function createApp() {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      transport: config.isDev ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
    },
    requestIdHeader: 'x-request-id',
    trustProxy: true,
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Security Plugins
  // ─────────────────────────────────────────────────────────────────────────────

  // Use type assertions to work around Fastify plugin type incompatibilities
  await app.register(helmet as unknown as Parameters<FastifyInstance['register']>[0]);

  await app.register(cors as unknown as Parameters<FastifyInstance['register']>[0], {
    origin: config.CORS_ORIGINS.split(','),
    credentials: true,
  });

  await app.register(rateLimit as unknown as Parameters<FastifyInstance['register']>[0], {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
    }),
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // JWT Authentication
  // ─────────────────────────────────────────────────────────────────────────────

  await app.register(jwt as unknown as Parameters<FastifyInstance['register']>[0], {
    secret: config.JWT_SECRET,
  });

  // Auth hook for protected routes
  app.addHook('onRequest', async (request, reply) => {
    // Skip health checks
    if (request.url === '/health' || request.url === '/ready') {
      return;
    }

    try {
      await request.jwtVerify();
    } catch (err) {
      request.log.warn({ err }, 'JWT verification failed');
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Error Handling
  // ─────────────────────────────────────────────────────────────────────────────

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    // Zod validation errors
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    // Known application errors
    if (error.statusCode && error.statusCode < 500) {
      return reply.status(error.statusCode).send({
        error: error.message,
      });
    }

    // Internal errors (don't leak details)
    return reply.status(500).send({
      error: 'Internal Server Error',
      requestId: request.id,
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Health Checks
  // ─────────────────────────────────────────────────────────────────────────────

  app.get('/health', async () => ({ status: 'ok' }));

  app.get('/ready', async () => {
    // Check database connection
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', database: 'connected' };
    } catch {
      const error = new Error('Database unavailable');
      (error as Error & { statusCode: number }).statusCode = 503;
      throw error;
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // API Routes
  // ─────────────────────────────────────────────────────────────────────────────

  await app.register(
    async (api) => {
      await api.register(projectRoutes);
      await api.register(exportRoutes);
      await api.register(accessRoutes);
      await api.register(dataRoutes);
      await api.register(auditRoutes);
    },
    { prefix: '/research' }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Graceful Shutdown
  // ─────────────────────────────────────────────────────────────────────────────

  const shutdown = async () => {
    app.log.info('Shutting down...');
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return app;
}
