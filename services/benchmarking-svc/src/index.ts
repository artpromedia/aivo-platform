/**
 * Cross-District Benchmarking Service
 *
 * Enterprise service for anonymous cross-district performance comparison
 * and AI-powered insights.
 */

import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { PrismaClient } from '@prisma/client';
import Fastify from 'fastify';
import pino from 'pino';

import { registerBenchmarkingRoutes } from './api/routes';

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport: process.env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
});

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

async function buildApp() {
  const app = Fastify({
    logger,
    trustProxy: true,
  });

  // Security plugins
  await app.register(helmet);
  await app.register(cors, {
    origin: process.env.CORS_ORIGINS?.split(',') ?? true,
    credentials: true,
  });
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Health check endpoint
  app.get('/health', async () => ({
    status: 'healthy',
    service: 'benchmarking-svc',
    timestamp: new Date().toISOString(),
  }));

  // Readiness check (includes database)
  app.get('/ready', async (request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ready',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch {
      return reply.status(503).send({
        status: 'not_ready',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // API routes
  registerBenchmarkingRoutes(app, prisma);

  // Error handler
  app.setErrorHandler((error, request, reply) => {
    logger.error({ err: error, path: request.url }, 'Request error');

    if (error.validation) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: error.message,
        details: error.validation,
      });
    }

    return reply.status(error.statusCode ?? 500).send({
      error: error.name ?? 'Internal Server Error',
      message:
        process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message,
    });
  });

  return app;
}

async function start() {
  const port = parseInt(process.env.PORT ?? '3012', 10);
  const host = process.env.HOST ?? '0.0.0.0';

  try {
    // Connect to database
    await prisma.$connect();
    logger.info('Connected to database');

    // Build and start server
    const app = await buildApp();
    await app.listen({ port, host });

    logger.info(`Benchmarking service listening on ${host}:${port}`);

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down...`);
      await app.close();
      await prisma.$disconnect();
      process.exit(0);
    };

    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Export for testing
export { buildApp, prisma };

// Start server if run directly
if (require.main === module) {
  void start();
}
