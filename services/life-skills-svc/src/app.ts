/**
 * Fastify Application Setup
 *
 * Configures the Fastify instance with plugins and routes.
 */

import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';
import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';

import { config } from './config.js';
import {
  registerSkillRoutes,
  registerProgressRoutes,
  registerSafetyRoutes,
  registerGoalRoutes,
  registerSessionRoutes,
  registerAICoachRoutes,
  registerInternalRoutes,
} from './routes/index.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.nodeEnv === 'production' ? 'info' : 'debug',
      transport:
        config.nodeEnv !== 'production'
          ? {
              target: 'pino-pretty',
              options: { colorize: true },
            }
          : undefined,
    },
  });

  // ════════════════════════════════════════════════════════════════════════════
  // HEALTH CHECK
  // ════════════════════════════════════════════════════════════════════════════

  app.get('/health', async () => ({
    status: 'ok',
    service: 'life-skills-svc',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  }));

  // ════════════════════════════════════════════════════════════════════════════
  // ERROR HANDLER
  // ════════════════════════════════════════════════════════════════════════════

  app.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode ?? 500;

    // Log error
    if (statusCode >= 500) {
      app.log.error({ err: error, requestId: request.id }, 'Server error');
    } else {
      app.log.warn({ err: error, requestId: request.id }, 'Client error');
    }

    // Handle Zod validation errors
    if (error.name === 'ZodError') {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Invalid request data',
        details: error.message,
      });
    }

    // Send response
    return reply.status(statusCode).send({
      error: error.name || 'Internal Server Error',
      message: error.message || 'An unexpected error occurred',
      statusCode,
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // RATE LIMITING
  // ════════════════════════════════════════════════════════════════════════════

  if (config.nodeEnv === 'production') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await app.register(rateLimit as any, FastifyRateLimitPresets.internalApi('life-skills-svc'));
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ROUTES
  // ════════════════════════════════════════════════════════════════════════════

  await registerSkillRoutes(app);
  await registerProgressRoutes(app);
  await registerSafetyRoutes(app);
  await registerGoalRoutes(app);
  await registerSessionRoutes(app);
  await registerAICoachRoutes(app);
  await registerInternalRoutes(app);

  return app;
}
