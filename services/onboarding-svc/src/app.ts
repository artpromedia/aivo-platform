import Fastify from 'fastify';

import { registerProgressRoutes, registerFeatureRoutes, registerAdminRoutes } from './routes.js';

export function createApp() {
  const app = Fastify({ logger: true });

  // ─── Health check ────────────────────────────────────────────────
  app.get('/health', async () => ({
    status: 'healthy',
    service: 'onboarding-svc',
    timestamp: new Date().toISOString(),
  }));

  app.get('/ready', async () => ({
    status: 'ready',
    service: 'onboarding-svc',
  }));

  // ─── Routes ──────────────────────────────────────────────────────
  app.register(registerProgressRoutes);
  app.register(registerFeatureRoutes);
  app.register(registerAdminRoutes);

  return app;
}
