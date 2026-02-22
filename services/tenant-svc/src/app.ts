/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */
import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import type { Redis as RedisType } from 'ioredis';

import { authMiddleware } from './middleware/authMiddleware.js';
import { registerClassroomRoutes } from './routes/classrooms.js';
import { registerDistrictLookupRoutes } from './routes/district-lookup.js';
import { registerInternalRoutes } from './routes/internal.js';
import { registerOnboardingRoutes } from './routes/onboarding.js';
import { registerResolveRoutes } from './routes/resolve.js';
import { registerSchoolRoutes } from './routes/schools.js';
import { registerTenantRoutes } from './routes/tenants.js';
import { tenantDomainsRoutes } from './routes/admin/tenant-domains.routes.js';
import { tenantResolverPlugin } from './plugins/tenant-resolver.plugin.js';
import { prisma } from './prisma.js';
import { config } from './config.js';

// Optional Redis import - gracefully degrade if not available
let redis: RedisType | undefined;
try {
  if (config.redisUrl) {
    const ioredis = await import('ioredis');
    // Access the default export and create new instance
    const RedisClass = ioredis.default as unknown as new (url: string) => RedisType;
    redis = new RedisClass(config.redisUrl);
  }
} catch {
  // Redis not configured - caching will be disabled
}

export function createApp() {
  const app = Fastify({ logger: true });

  // Rate limiting for tenant management service
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
  app.register(rateLimit as any, { max: 100, timeWindow: '1 minute' });

  // Register tenant resolver plugin (optional - depends on Redis config)
  app.register(tenantResolverPlugin, {
    redis: redis ?? null,
    prisma,
    baseDomain: config.baseDomain ?? 'aivo.ai',
    cacheTtlSeconds: config.cacheTtlSeconds ?? 300,
    defaultTenantId: config.defaultTenantId,
    skipPaths: ['/health', '/healthz', '/ready', '/readyz', '/metrics', '/tenant/resolve'],
  });

  // Health check routes (before auth middleware so they're always accessible)
  app.get('/health', async () => {
    return {
      status: 'healthy',
      service: 'tenant-svc',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });

  app.get('/ready', async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1 as ready_check`;
      return reply.send({ status: 'ready', service: 'tenant-svc' });
    } catch (error) {
      return reply.status(503).send({
        status: 'not ready',
        service: 'tenant-svc',
        error: error instanceof Error ? error.message : 'Database unavailable',
      });
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
  app.register(authMiddleware as any);
  app.register(registerResolveRoutes);
  app.register(registerTenantRoutes);
  app.register(registerSchoolRoutes);
  app.register(registerClassroomRoutes);

  // District lookup routes (public - no auth required for onboarding)
  app.register(registerDistrictLookupRoutes);

  // Internal service-to-service routes (auth skipped via middleware)
  app.register(registerInternalRoutes);

  // District onboarding wizard routes
  app.register(registerOnboardingRoutes, { prefix: '/onboarding' });

  // Admin routes for domain management
  app.register(tenantDomainsRoutes, { prefix: '/admin' });

  return app;
}
