/**
 * Community Service App
 * Fastify application setup
 */

import Fastify, { type FastifyInstance } from 'fastify';
import { config } from './config.js';
import {
  registerPostRoutes,
  registerResourceRoutes,
  registerStatsRoutes,
} from './routes/index.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      transport:
        config.nodeEnv === 'development'
          ? {
              target: 'pino-pretty',
              options: { colorize: true },
            }
          : undefined,
    },
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CORS (for development)
  // ════════════════════════════════════════════════════════════════════════════
  app.addHook('onRequest', async (request, reply) => {
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    reply.header(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Tenant-Id, X-User-Id, X-User-Name, X-User-Role, X-User-School'
    );

    if (request.method === 'OPTIONS') {
      return reply.status(204).send();
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // HEALTH CHECK
  // ════════════════════════════════════════════════════════════════════════════
  app.get('/health', async () => ({
    status: 'ok',
    service: config.serviceName,
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  }));

  // ════════════════════════════════════════════════════════════════════════════
  // ERROR HANDLER
  // ════════════════════════════════════════════════════════════════════════════
  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    // Zod validation errors
    if (error.name === 'ZodError') {
      return reply.status(400).send({
        error: 'Validation Error',
        details: JSON.parse(error.message),
      });
    }

    // Prisma errors
    if (error.name === 'PrismaClientKnownRequestError') {
      return reply.status(400).send({
        error: 'Database Error',
        message: 'Invalid request',
      });
    }

    // Default error
    return reply.status(error.statusCode ?? 500).send({
      error: error.message ?? 'Internal Server Error',
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ROUTES
  // ════════════════════════════════════════════════════════════════════════════
  await registerPostRoutes(app);
  await registerResourceRoutes(app);
  await registerStatsRoutes(app);

  return app;
}
