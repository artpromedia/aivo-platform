import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';

import { prismaPlugin } from './plugins/prisma.js';
import { deviceRoutes } from './routes/devices.js';
import { policyRoutes } from './routes/policies.js';
import { poolRoutes } from './routes/pools.js';

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  // Rate limiting
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await app.register(rateLimit as any, FastifyRateLimitPresets.internalApi('device-mgmt-svc'));

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
