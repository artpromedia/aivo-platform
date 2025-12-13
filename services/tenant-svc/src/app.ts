import Fastify from 'fastify';
import type { Redis as RedisType } from 'ioredis';

import { authMiddleware } from './middleware/authMiddleware.js';
import { registerClassroomRoutes } from './routes/classrooms.js';
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

  // Register tenant resolver plugin (optional - depends on Redis config)
  app.register(tenantResolverPlugin, {
    redis: redis ?? null,
    prisma,
    baseDomain: config.baseDomain ?? 'aivo.ai',
    cacheTtlSeconds: config.cacheTtlSeconds ?? 300,
    defaultTenantId: config.defaultTenantId,
    skipPaths: ['/health', '/healthz', '/metrics', '/tenant/resolve'],
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
  app.register(authMiddleware as any);
  app.register(registerResolveRoutes);
  app.register(registerTenantRoutes);
  app.register(registerSchoolRoutes);
  app.register(registerClassroomRoutes);
  
  // Admin routes for domain management
  app.register(tenantDomainsRoutes, { prefix: '/admin' });

  return app;
}
