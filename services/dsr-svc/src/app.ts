import { authMiddleware } from '@aivo/ts-rbac';
import Fastify from 'fastify';
import type { Pool } from 'pg';

import { config } from './config.js';
import { createPool } from './db.js';
import { registerDsrRoutes } from './routes/dsr.js';

export function createApp(options: { pool?: Pool; logger?: boolean } = {}) {
  const app = Fastify({ logger: options.logger ?? true });
  const pool = options.pool ?? createPool();

  const auth = authMiddleware({ publicKey: config.jwtPublicKey });
  app.addHook('preHandler', async (request, reply) => {
    await auth(request as any, reply as any);
  });

  app.register(registerDsrRoutes, { prefix: '/dsr', pool });

  return app;
}
