/**
 * Billing Service - Entry Point
 */

import Fastify from 'fastify';

import { config } from './config.js';
import { connectDatabase, disconnectDatabase } from './prisma.js';
import { billingEventPublisher } from './events/billing.publisher.js';
import { coverageRoutes } from './routes/coverage.routes.js';
import { entitlementsRoutes } from './routes/entitlements.routes.js';
import { finopsRoutes } from './routes/finops.routes.js';
import { internalBillingRoutes } from './routes/internal-billing.routes.js';
import { parentBillingRoutes } from './routes/parent-billing.routes.js';
import { webhookRoutes } from './routes/webhook.routes.js';

async function main() {
  const isDev = process.env.NODE_ENV === 'development';

  const app = Fastify({
    logger: isDev
      ? {
          level: process.env.LOG_LEVEL || 'info',
          transport: { target: 'pino-pretty', options: { colorize: true } },
        }
      : {
          level: process.env.LOG_LEVEL || 'info',
        },
  });

  // Health check endpoint
  app.get('/health', async () => ({ status: 'ok', service: 'billing-svc' }));
  app.get('/ready', async () => {
    // Could add database connectivity check here
    return { status: 'ready' };
  });

  // Register routes
  await app.register(coverageRoutes, { prefix: '/api/v1' });
  await app.register(entitlementsRoutes, { prefix: '/api/v1' });
  await app.register(webhookRoutes, { prefix: '/billing/webhooks' });
  await app.register(finopsRoutes, { prefix: '/api/v1/finops' });
  await app.register(parentBillingRoutes, { prefix: '/api/v1' });
  await app.register(internalBillingRoutes, { prefix: '/api/v1/internal' });

  // Graceful shutdown
  const shutdown = async () => {
    app.log.info('Shutting down...');
    await app.close();
    await billingEventPublisher.close();
    await disconnectDatabase();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    await connectDatabase();
    await billingEventPublisher.initialize();
    await app.listen({ port: config.port, host: config.host });
    console.log(`💳 Billing service listening on port ${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

await main();
