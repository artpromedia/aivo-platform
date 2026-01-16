/**
 * AIVO Model Registry Service - Application Setup
 */

import Fastify from 'fastify';

import { authMiddleware } from './middleware/authMiddleware.js';
import { registerModelRoutes } from './routes/models.js';
import { registerVersionRoutes } from './routes/versions.js';
import { registerArtifactRoutes } from './routes/artifacts.js';
import { registerDeploymentRoutes } from './routes/deployments.js';

export function createApp() {
  const app = Fastify({ logger: true });

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
