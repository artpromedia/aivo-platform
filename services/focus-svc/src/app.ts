import Fastify from 'fastify';

import { config } from './config.js';
import { authMiddleware } from './middleware/authMiddleware.js';
import { registerFocusRoutes } from './routes/focus.js';
import { registerHealthRoutes } from './routes/health.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: config.logLevel,
    },
  });

  // Global error handler
  app.setErrorHandler(async (error, request, reply) => {
    request.log.error(error);
    const statusCode = error.statusCode ?? 500;
    reply.status(statusCode).send({
      error: error.message || 'Internal Server Error',
    });
  });

  // Health check routes (no auth required)
  await app.register(registerHealthRoutes);

  // Auth middleware for protected routes
  await app.register(authMiddleware);

  // Focus routes
  await app.register(registerFocusRoutes, { prefix: '/focus' });

  return app;
}
