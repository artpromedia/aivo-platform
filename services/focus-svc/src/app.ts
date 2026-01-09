import Fastify from 'fastify';

import { config } from './config.js';
import { authMiddleware } from './middleware/authMiddleware.js';
import { registerFocusRoutes } from './routes/focus.js';
import { registerGamesRoutes } from './routes/games.js';
import { registerHealthRoutes } from './routes/health.js';
import { learningBreakRoutes } from './routes/learningBreaks.js';

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

  // Games routes (also under /focus prefix for consistency)
  await app.register(registerGamesRoutes, { prefix: '/focus' });

  // Learning break routes (personalized educational brain breaks)
  await app.register(learningBreakRoutes, { prefix: '/focus' });

  return app;
}
