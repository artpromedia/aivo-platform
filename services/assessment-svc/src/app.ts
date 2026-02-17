import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';

import { createAssessmentDataLoaders, type AssessmentDataLoaders } from './dataloaders/index.js';
import { authMiddleware } from './middleware/auth.js';
import {
  assessmentRoutes,
  questionRoutes,
  attemptRoutes,
  gradingRoutes,
  analyticsRoutes,
  securityRoutes,
} from './routes/index.js';

// Extend Fastify Request to include DataLoaders and user
declare module 'fastify' {
  interface FastifyRequest {
    loaders?: AssessmentDataLoaders;
  }
}

// CORS configuration - requires explicit origins in production
function getCorsOrigins(): string[] | boolean {
  if (process.env.CORS_ORIGIN) {
    return process.env.CORS_ORIGIN.split(',').map((o) => o.trim());
  }
  if (process.env.NODE_ENV === 'production') {
    return false; // No origins allowed by default in production
  }
  return ['http://localhost:3000', 'http://localhost:3001']; // Dev defaults
}

export function createApp() {
  const app = Fastify({ logger: true, bodyLimit: 10 * 1024 * 1024 });

  // Security middleware
  app.register(helmet);
  app.register(cors, { origin: getCorsOrigins(), credentials: true });

  // Rate limiting
  app.register(rateLimit, FastifyRateLimitPresets.internalApi('assessment-svc'));

  // Request logging
  app.addHook('onRequest', async (request) => {
    request.log.info(`${request.method} ${request.url}`);
  });

  // Health check (unauthenticated)
  app.get('/health', async () => {
    return { status: 'ok', service: 'assessment-svc' };
  });

  // JWT authentication for all API routes
  app.register(authMiddleware);

  // DataLoader initialization per request (prevents N+1 queries)
  app.addHook('preHandler', async (request) => {
    const user = request.user as { tenantId?: string } | undefined;
    if (user?.tenantId) {
      request.loaders = createAssessmentDataLoaders(user.tenantId);
    }
  });

  // API routes
  app.register(assessmentRoutes, { prefix: '/api/v1/assessments' });
  app.register(questionRoutes, { prefix: '/api/v1/questions' });
  app.register(attemptRoutes, { prefix: '/api/v1/attempts' });
  app.register(gradingRoutes, { prefix: '/api/v1' }); // /api/v1/rubrics, /api/v1/grading
  app.register(analyticsRoutes, { prefix: '/api/v1' }); // /api/v1/analytics
  app.register(securityRoutes, { prefix: '/api/v1' }); // /api/v1/security

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
