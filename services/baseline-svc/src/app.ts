import Fastify, { type FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';

import { authMiddleware } from './middleware/authMiddleware.js';
import { baselineRoutes } from './routes/baseline.js';
import { iepUploadRoutes } from './routes/iepUpload.js';

export async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
  });

  // Rate limiting
  await fastify.register(rateLimit, FastifyRateLimitPresets.internalApi('baseline-svc'));

  // Health check (no auth required)
  fastify.get('/health', async () => {
    return { status: 'ok', service: 'baseline-svc', timestamp: new Date().toISOString() };
  });

  // Auth middleware
  void fastify.register(authMiddleware);

  // Register routes
  void fastify.register(baselineRoutes);
  void fastify.register(iepUploadRoutes); // IEP document upload and comparison routes

  return fastify;
}
