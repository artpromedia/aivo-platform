/**
 * Marketplace Service - Entry Point
 *
 * The Marketplace Service provides APIs for:
 * - Catalog browsing and search
 * - Vendor management
 * - Item version review workflow
 * - Tenant/school/classroom installations
 */

import Fastify from 'fastify';

import { config } from './config.js';
import { connectDatabase, disconnectDatabase } from './prisma.js';
import { catalogRoutes } from './routes/catalog.routes.js';
import { vendorRoutes } from './routes/vendor.routes.js';
import { installationRoutes } from './routes/installation.routes.js';
import { adminRoutes } from './routes/admin.routes.js';
import { internalEntitlementRoutes } from './routes/internal-entitlement.routes.js';

async function main() {
  const isDev = process.env.NODE_ENV === 'development';

  const app = Fastify({
    logger: isDev
      ? {
          level: process.env.LOG_LEVEL ?? 'info',
          transport: { target: 'pino-pretty', options: { colorize: true } },
        }
      : {
          level: process.env.LOG_LEVEL ?? 'info',
        },
  });

  // Health check endpoints
  app.get('/health', async () => ({ status: 'ok', service: 'marketplace-svc' }));
  app.get('/ready', async () => {
    // Could add database connectivity check here
    return { status: 'ready' };
  });

  // Register routes
  await app.register(catalogRoutes, { prefix: '/api/v1/catalog' });
  await app.register(vendorRoutes, { prefix: '/api/v1/vendors' });
  await app.register(installationRoutes, { prefix: '/api/v1' }); // Routes already include /tenants/:tenantId/installations
  await app.register(adminRoutes); // Routes already include /admin prefix
  await app.register(internalEntitlementRoutes); // Internal routes for cross-service calls

  // Graceful shutdown
  const shutdown = async () => {
    app.log.info('Shutting down...');
    await app.close();
    await disconnectDatabase();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    await connectDatabase();
    await app.listen({ port: config.port, host: config.host });
    console.log(`🛒 Marketplace service listening on port ${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
