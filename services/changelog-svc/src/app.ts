import Fastify from 'fastify';

import { registerPublicRoutes, registerAdminRoutes } from './routes.js';

export function createApp() {
  const app = Fastify({ logger: true });

  // ─── Health check ────────────────────────────────────────────────
  app.get('/health', async () => ({
    status: 'healthy',
    service: 'changelog-svc',
    timestamp: new Date().toISOString(),
  }));

  app.get('/ready', async () => ({
    status: 'ready',
    service: 'changelog-svc',
  }));

  // ─── Routes ──────────────────────────────────────────────────────
  app.register(registerPublicRoutes);
  app.register(registerAdminRoutes);

  return app;
}
