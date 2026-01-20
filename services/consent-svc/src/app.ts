import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';
import { authMiddleware } from '@aivo/ts-rbac';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import type { Pool } from 'pg';

import { config } from './config.js';
import { createPool } from './db.js';
import { registerConsentRoutes } from './routes/consents.js';
import { registerPrivacyRoutes } from './routes/privacy.js';

export function createApp(options: { pool?: Pool; logger?: boolean } = {}) {
  const app = Fastify({ logger: options.logger ?? true });
  const pool = options.pool ?? createPool();

  // Rate limiting
  void app.register(rateLimit, FastifyRateLimitPresets.publicApi('consent-svc'));

  const auth = authMiddleware({ publicKey: config.jwtPublicKey });
  app.addHook('preHandler', async (request, reply) => {
    await auth(request as any, reply as any);
  });

  app.register(registerConsentRoutes, { prefix: '/consents', pool });
  app.register(registerPrivacyRoutes, { prefix: '/privacy', pool });

  return app;
}
