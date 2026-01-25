import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';

import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { registerGoalRoutes } from './routes/goals.js';
import { registerSessionPlanRoutes } from './routes/sessionPlans.js';
import { registerProgressNoteRoutes } from './routes/progressNotes.js';
import { registerHealthRoutes } from './routes/health.js';

export function createApp() {
  const app = Fastify({ logger: true });

  // Global error handler
  app.setErrorHandler(errorHandler);

  // Rate limiting
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.register(rateLimit as any, FastifyRateLimitPresets.publicApi('teacher-planning-svc'));

  // Health check (no auth required)
  app.register(registerHealthRoutes);

  // Auth middleware for all other routes
  app.register(authMiddleware);

  // API routes
  app.register(registerGoalRoutes);
  app.register(registerSessionPlanRoutes);
  app.register(registerProgressNoteRoutes);

  return app;
}
