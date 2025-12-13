import Fastify from 'fastify';

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
let redis: import('ioredis').Redis | undefined;
try {
  if (config.redisUrl) {
    const { default: Redis } = await import('ioredis');
    redis = new Redis(config.redisUrl);
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

  app.register(authMiddleware);
  app.register(registerResolveRoutes);
  app.register(registerTenantRoutes);
  app.register(registerSchoolRoutes);
  app.register(registerClassroomRoutes);
  
  // Admin routes for domain management
  app.register(tenantDomainsRoutes, { prefix: '/admin' });

  return app;
}
