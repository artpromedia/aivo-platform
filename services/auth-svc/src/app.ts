import Fastify from 'fastify';

import { authMiddleware } from './middleware/authMiddleware.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerDemoRoutes } from './routes/demo.js';

export function createApp() {
  const app = Fastify({ logger: true });

  app.register(authMiddleware);
  app.register(registerAuthRoutes, { prefix: '/auth' });
  app.register(registerDemoRoutes);

  return app;
}
