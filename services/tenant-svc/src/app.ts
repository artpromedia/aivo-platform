import Fastify from 'fastify';

import { authMiddleware } from './middleware/authMiddleware.js';
import { registerResolveRoutes } from './routes/resolve.js';
import { registerSchoolRoutes } from './routes/schools.js';
import { registerTenantRoutes } from './routes/tenants.js';

export function createApp() {
  const app = Fastify({ logger: true });

  app.register(authMiddleware);
  app.register(registerResolveRoutes);
  app.register(registerTenantRoutes);
  app.register(registerSchoolRoutes);

  return app;
}
