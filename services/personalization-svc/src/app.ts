/**
 * Personalization Service - Fastify App
 *
 * HTTP server for personalization signals API.
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unsafe-argument */

// eslint-disable-next-line import/no-unresolved
import Fastify from 'fastify';
// eslint-disable-next-line import/no-unresolved
import type { FastifyInstance } from 'fastify';
// eslint-disable-next-line import/no-unresolved
import cors from '@fastify/cors';
import { config } from './config.js';
import { registerRoutes } from './routes.js';

// ══════════════════════════════════════════════════════════════════════════════
// APP FACTORY
// ══════════════════════════════════════════════════════════════════════════════

export async function buildApp(): Promise<FastifyInstance> {
  const loggerOptions = process.env['NODE_ENV'] !== 'production'
    ? {
        level: 'info',
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        },
      }
    : { level: 'info' };

  const app = Fastify({
    logger: loggerOptions as any,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'reqId',
  });

  // CORS
  await app.register(cors as any, {
    origin: process.env['NODE_ENV'] === 'production' ? false : true,
    credentials: true,
  });

  // Health check
  app.get('/health', async () => ({
    status: 'ok',
    service: 'personalization-svc',
    timestamp: new Date().toISOString(),
  }));

  // Ready check (includes DB connectivity)
  app.get('/ready', async (request, reply) => {
    try {
      const { getMainPool } = await import('./db.js');
      const pool = getMainPool();
      await pool.query('SELECT 1');
      return { status: 'ready', timestamp: new Date().toISOString() };
    } catch (_error) {
      reply.code(503);
      return { status: 'not_ready', error: 'Database connection failed' };
    }
  });

  // Auth hook - extract tenant and learner from JWT
  app.addHook('preHandler', async (request, reply) => {
    // Skip auth for health checks
    if (request.url === '/health' || request.url === '/ready') {
      return;
    }

    // Skip auth for internal endpoints (service-to-service)
    if (request.url.includes('/internal/')) {
      // Internal auth via service token would go here
      return;
    }

    // Extract tenant from header (set by API gateway after JWT validation)
    const tenantId = request.headers['x-tenant-id'] as string | undefined;
    if (!tenantId) {
      reply.code(401).send({ error: 'Missing tenant context' });
      return;
    }

    // Attach to request for route handlers
    (request as unknown as { tenantId: string }).tenantId = tenantId;

    // Extract learner ID if present (for learner-authenticated requests)
    const learnerId = request.headers['x-learner-id'] as string | undefined;
    if (learnerId) {
      (request as unknown as { learnerId: string }).learnerId = learnerId;
    }
  });

  // Error handler
  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    // Zod validation errors
    if (error.name === 'ZodError') {
      reply.code(400).send({
        error: 'Validation error',
        details: error.message,
      });
      return;
    }

    // Database errors
    if (error.message?.includes('ECONNREFUSED')) {
      reply.code(503).send({
        error: 'Service temporarily unavailable',
        message: 'Database connection failed',
      });
      return;
    }

    // Default error
    reply.code(500).send({
      error: 'Internal server error',
      message: process.env['NODE_ENV'] !== 'production' ? error.message : undefined,
    });
  });

  // Register routes
  await registerRoutes(app as any);

  return app as any;
}

// ══════════════════════════════════════════════════════════════════════════════
// GRACEFUL SHUTDOWN
// ══════════════════════════════════════════════════════════════════════════════

let shutdownInProgress = false;

export async function gracefulShutdown(app: FastifyInstance, signal: string): Promise<void> {
  if (shutdownInProgress) return;
  shutdownInProgress = true;

  console.log(`\n[personalization-svc] Received ${signal}, shutting down gracefully...`);

  try {
    // Close HTTP server
    await app.close();
    console.log('[personalization-svc] HTTP server closed');

    // Close database pools
    const { closePools } = await import('./db.js');
    await closePools();
    console.log('[personalization-svc] Database pools closed');

    process.exit(0);
  } catch (error) {
    console.error('[personalization-svc] Error during shutdown:', error);
    process.exit(1);
  }
}
