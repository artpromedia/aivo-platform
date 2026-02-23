/**
 * Billing Service - Entry Point
 */

import 'dotenv/config';
import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyPluginAsync } from 'fastify';

import { config } from './config.js';
import { billingEventPublisher } from './events/billing.publisher.js';
import { connectDatabase, disconnectDatabase } from './prisma.js';
import { coverageRoutes } from './routes/coverage.routes.js';
import { enterpriseRoutes } from './routes/enterprise.routes.js';
import { entitlementsRoutes } from './routes/entitlements.routes.js';
import { finopsRoutes } from './routes/finops.routes.js';
import { internalBillingRoutes } from './routes/internal-billing.routes.js';
import { parentBillingRoutes } from './routes/parent-billing.routes.js';
import { webhookRoutes } from './routes/webhook.routes.js';
import { startInvoiceSchedulers, stopInvoiceSchedulers } from './enterprise/invoice-scheduler.js';

// Type assertion helper for Fastify plugins with type provider mismatches
const asPlugin = (plugin: unknown): FastifyPluginAsync => plugin as FastifyPluginAsync;

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

  // Rate limiting
  await app.register(asPlugin(rateLimit), FastifyRateLimitPresets.billing('billing-svc'));

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
  await app.register(asPlugin(internalBillingRoutes), { prefix: '/api/v1/internal' });
  await app.register(enterpriseRoutes, { prefix: '/api/v1/enterprise' });

  // Graceful shutdown
  const shutdown = async () => {
    app.log.info('Shutting down...');
    stopInvoiceSchedulers();
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
    startInvoiceSchedulers();
    console.log(`💳 Billing service listening on port ${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

await main();
