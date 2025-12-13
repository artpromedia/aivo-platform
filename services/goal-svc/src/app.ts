/**
 * Fastify Application Setup
 *
 * Configures the Fastify instance with plugins and routes.
 */

import Fastify, { FastifyInstance } from 'fastify';

import { config } from './config.js';
import { registerGoalRoutes, registerSessionPlanRoutes, registerProgressNoteRoutes } from './routes/index.js';

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
    service: 'goal-svc',
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
        details: JSON.parse(error.message),
      });
    }

    // Handle known errors
    if (error.message === 'Missing tenant context') {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Missing tenant context headers',
      });
    }

    // Generic error response
    return reply.status(statusCode).send({
      error: statusCode >= 500 ? 'Internal Server Error' : error.message,
      ...(config.nodeEnv !== 'production' && { stack: error.stack }),
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // REGISTER ROUTES
  // ════════════════════════════════════════════════════════════════════════════

  await registerGoalRoutes(app);
  await registerSessionPlanRoutes(app);
  await registerProgressNoteRoutes(app);

  // ════════════════════════════════════════════════════════════════════════════
  // ROOT ENDPOINT
  // ════════════════════════════════════════════════════════════════════════════

  app.get('/', async () => ({
    service: 'goal-svc',
    version: '0.1.0',
    description: 'Goals, Objectives & Session Planning Service',
    endpoints: {
      goals: '/goals',
      objectives: '/objectives',
      sessionPlans: '/session-plans',
      progressNotes: '/progress-notes',
    },
  }));

  return app;
}
