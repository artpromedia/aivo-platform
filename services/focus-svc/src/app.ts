import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';

import { config } from './config.js';
import { authMiddleware } from './middleware/authMiddleware.js';
import { registerFocusRoutes } from './routes/focus.js';
import { registerGamesRoutes } from './routes/games.js';
import { gamificationRoutes } from './routes/gamification.js';
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

  // Rate limiting
  await app.register(rateLimit, FastifyRateLimitPresets.publicApi('focus-svc'));

  // Health check routes (no auth required)
  await app.register(registerHealthRoutes);

  // Auth middleware for protected routes

  await app.register(authMiddleware as any);

  // Focus routes
  await app.register(registerFocusRoutes, { prefix: '/focus' });

  // Games routes (also under /focus prefix for consistency)
  await app.register(registerGamesRoutes, { prefix: '/focus' });

  // Learning break routes (personalized educational brain breaks)
  await app.register(learningBreakRoutes, { prefix: '/focus' });

  // Gamification routes (XP, coins, achievements, streaks, leaderboards)
  await app.register(gamificationRoutes, { prefix: '/focus/gamification' });

  return app;
}
