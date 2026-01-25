/**
 * AIVO Model Registry Service - Application Setup
 */

import rateLimit from '@fastify/rate-limit';
import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';
import Fastify from 'fastify';

import { authMiddleware } from './middleware/authMiddleware.js';
import { registerModelRoutes } from './routes/models.js';
import { registerVersionRoutes } from './routes/versions.js';
import { registerArtifactRoutes } from './routes/artifacts.js';
import { registerDeploymentRoutes } from './routes/deployments.js';

export async function createApp() {
  const app = Fastify({ logger: true });

  // Rate limiting
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await app.register(rateLimit as any, FastifyRateLimitPresets.internalApi('model-registry-svc'));

  // Health check
  app.get('/health', async (_request, reply) => {
    return reply.status(200).send({
      status: 'ok',
      service: 'model-registry-svc',
      version: '0.1.0',
    });
  });

  // Register auth middleware
  void app.register(authMiddleware as any);

  // Register routes
  void app.register(registerModelRoutes as any, { prefix: '/models' });
  void app.register(registerVersionRoutes as any, { prefix: '/models' });
  void app.register(registerArtifactRoutes as any, { prefix: '/models' });
  void app.register(registerDeploymentRoutes as any, { prefix: '/deployments' });

  return app;
}
