/**
 * Fastify Application Setup
 */

import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';

import { config } from './config.js';
import { authMiddleware } from './middleware/auth.js';
import assessmentRoutes from './routes/assessment.routes.js';
import gradebookRoutes from './routes/gradebook.routes.js';

export function createApp() {
  const app = Fastify({
    logger: true,
    bodyLimit: 10 * 1024 * 1024, // 10mb
  });

  // Security plugins
  app.register(helmet);
  app.register(cors, {
    origin: config.corsOrigin,
    credentials: true,
  });

  // Rate limiting
  app.register(rateLimit, FastifyRateLimitPresets.publicApi('gradebook-svc'));

  // Health check (unauthenticated)
  app.get('/health', async () => {
    return { status: 'ok', service: 'gradebook-svc' };
  });

  // JWT authentication for all API routes
  app.register(authMiddleware);

  // API routes
  app.register(gradebookRoutes, { prefix: '/api/v1/gradebook' });
  app.register(assessmentRoutes, { prefix: '/api/v1/assessments' });

  // 404 handler
  app.setNotFoundHandler(async (_request, reply) => {
    reply.status(404);
    return { error: 'Not found' };
  });

  // Error handler
  app.setErrorHandler(async (error, _request, reply) => {
    console.error('Unhandled error:', error);
    reply.status(error.statusCode ?? 500);
    return { error: error.message ?? 'Internal server error' };
  });

  return app;
}
