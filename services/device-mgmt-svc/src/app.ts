import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';

import { prismaPlugin } from './plugins/prisma.js';
import { deviceRoutes } from './routes/devices.js';
import { policyRoutes } from './routes/policies.js';
import { poolRoutes } from './routes/pools.js';

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  // Rate limiting
  await app.register(rateLimit, FastifyRateLimitPresets.internalApi('device-mgmt-svc'));

  // Register plugins
  await app.register(prismaPlugin);

  // Health check
  app.get('/health', async () => ({ status: 'ok', service: 'device-mgmt-svc' }));

  // Register routes
  await app.register(deviceRoutes, { prefix: '/devices' });
  await app.register(poolRoutes, { prefix: '/pools' });
  await app.register(policyRoutes, { prefix: '/policies' });

  return app;
}
