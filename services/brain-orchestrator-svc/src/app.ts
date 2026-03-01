import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import Fastify, { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import { config } from './config.js';
import { authMiddleware } from './middleware/auth.js';
import { cognitiveRoutes } from './routes/cognitive.routes.js';
import { learningRoutes } from './routes/learning.routes.js';
import { orchestrationRoutes } from './routes/orchestration.routes.js';
import { peerRoutes } from './routes/peer.routes.js';
import { accessibilityRoutes } from './routes/accessibility.routes.js';
import { specializedSupportRoutes } from './routes/specialized-support.routes.js';

export function createApp(): FastifyInstance {
  const app = Fastify({
    logger: true,
    bodyLimit: 10 * 1024 * 1024, // 10mb
  });

  // Security plugins
  app.register(helmet);
  app.register(cors, {
    origin: config.corsOrigins,
    credentials: true,
  });

  // Health check (unauthenticated)
  app.get('/health', async () => {
    return {
      status: 'ok',
      service: 'brain-orchestrator-svc',
      timestamp: new Date().toISOString(),
    };
  });

  // Auth middleware for all other routes
  app.register(authMiddleware);

  // API routes
  app.register(orchestrationRoutes, { prefix: '/api/v1/brain' });
  app.register(cognitiveRoutes, { prefix: '/api/v1/brain' });
  app.register(learningRoutes, { prefix: '/api/v1/brain' });
  app.register(peerRoutes, { prefix: '/api/v1/brain' });
  app.register(accessibilityRoutes, { prefix: '/api/v1/brain' });
  app.register(specializedSupportRoutes, { prefix: '/api/v1/brain' });

  // Error handler
  app.setErrorHandler(async (error, _request, reply) => {
    console.error('Error:', error);

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      reply.status(400);
      return {
        success: false,
        error: 'Validation error',
        details: error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      };
    }

    // Handle known errors
    if (error.message.includes('not found')) {
      reply.status(404);
      return { success: false, error: error.message };
    }

    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      reply.status(409);
      return { success: false, error: error.message };
    }

    if (
      error.message.includes('Invalid') ||
      error.message.includes('Cannot') ||
      error.message.includes('Missing')
    ) {
      reply.status(400);
      return { success: false, error: error.message };
    }

    // Generic error
    reply.status(error.statusCode ?? 500);
    return {
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    };
  });

  // 404 handler
  app.setNotFoundHandler(async (_request, reply) => {
    reply.status(404);
    return {
      success: false,
      error: 'Endpoint not found',
    };
  });

  return app;
}
