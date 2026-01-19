import { authMiddleware } from '@aivo/ts-rbac';
import Fastify from 'fastify';
import type { Pool } from 'pg';

import { config } from './config.js';
import { createPool } from './db.js';
import { registerDsrRoutesV2 } from './routes/dsr-v2.js';
import { registerDsrRoutes } from './routes/dsr.js';
import { startGracePeriodScheduler, stopGracePeriodScheduler } from './scheduler.js';

export function createApp(options: { pool?: Pool; logger?: boolean; enableScheduler?: boolean } = {}) {
  const app = Fastify({ logger: options.logger ?? true });
  const pool = options.pool ?? createPool();

  // Health check endpoint (no auth required)
  app.get('/health', async () => ({ status: 'ok', service: 'dsr-svc' }));

  // Auth middleware for all other routes
  const auth = authMiddleware({ publicKey: config.jwtPublicKey });
  app.addHook('preHandler', async (request, reply) => {
    // Skip auth for health check
    if (request.routeOptions.url === '/health') return;
    await auth(request as any, reply as any);
  });

  // Register DSR routes (v1 and v2)
  app.register(registerDsrRoutes, { prefix: '/dsr', pool });
  app.register(registerDsrRoutesV2, { prefix: '/dsr', pool });

  // Start grace period scheduler if enabled
  if (options.enableScheduler !== false) {
    app.addHook('onReady', async () => {
      startGracePeriodScheduler(pool);
      app.log.info('Grace period scheduler started');
    });

    app.addHook('onClose', async () => {
      stopGracePeriodScheduler();
      app.log.info('Grace period scheduler stopped');
    });
  }

  return app;
}
