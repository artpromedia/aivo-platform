import Fastify from 'fastify';
import { prismaPlugin } from './plugins/prisma.js';
import { deviceRoutes } from './routes/devices.js';
import { poolRoutes } from './routes/pools.js';
import { policyRoutes } from './routes/policies.js';

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

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
