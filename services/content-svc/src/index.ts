/**
 * Content Service - Learning Object Management & Discovery
 *
 * Manages versioned, reviewable Learning Objects with:
 * - Authoring & editing
 * - Review & approval workflow
 * - Versioning & publishing
 * - Skill alignment
 * - Accessibility metadata
 *
 * Content Discovery & Selection:
 * - Search by subject, grade, skills, tags, text
 * - Content selection for lesson planning
 * - Render for learner sessions
 *
 * Content Packaging & Distribution:
 * - Bulk content package generation for device preloading
 * - Delta updates for efficient sync
 * - Pre-signed URL management for content delivery
 */

import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';

import { createContentDataLoaders, type ContentDataLoaders } from './dataloaders/index.js';
import { fileRoutes } from './routes/files.js';
import { ingestionRoutes } from './routes/ingestion.js';
import { learningObjectRoutes } from './routes/learningObjects.js';
import { contentPackageRoutes } from './routes/packages.js';
import { renderRoutes } from './routes/render.js';
import { reviewRoutes } from './routes/reviews.js';
import { searchRoutes } from './routes/search.js';
import { socialStoriesRoutes } from './routes/socialStories.js';
import { versionRoutes } from './routes/versions.js';

// Extend Fastify request type to include DataLoaders
declare module 'fastify' {
  interface FastifyRequest {
    loaders: ContentDataLoaders;
  }
}

const PORT = Number.parseInt(process.env.PORT || '4020', 10);

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// Get CORS origins based on environment
function getCorsOrigins(): string[] {
  const corsOrigins = process.env.CORS_ORIGINS;
  if (corsOrigins) {
    return corsOrigins.split(',');
  }
  if (process.env.NODE_ENV === 'production') {
    return [];
  }
  return ['http://localhost:3000', 'http://localhost:3001'];
}

// Register CORS

await fastify.register(cors as any, {
  origin: getCorsOrigins(),
  credentials: true,
});

// Rate limiting for content endpoints

await fastify.register(rateLimit as any, FastifyRateLimitPresets.content('content-svc'));

// DataLoader initialization per request (prevents N+1 queries)
fastify.addHook('preHandler', async (request) => {
  // Extract tenant ID from JWT user if available

  const user = (request as any).user as { tenantId?: string; tenant_id?: string } | undefined;
  const tenantId = user?.tenantId ?? user?.tenant_id;
  request.loaders = createContentDataLoaders(tenantId);
});

// Health check
fastify.get('/health', async () => ({ status: 'ok', service: 'content-svc' }));

// Register routes
await fastify.register(learningObjectRoutes, { prefix: '/api' });
await fastify.register(versionRoutes, { prefix: '/api' });
await fastify.register(reviewRoutes, { prefix: '/api' });
await fastify.register(ingestionRoutes, { prefix: '/api' });
await fastify.register(searchRoutes, { prefix: '/api' });
await fastify.register(renderRoutes, { prefix: '/api' });
await fastify.register(contentPackageRoutes, { prefix: '/api' });
await fastify.register(fileRoutes, { prefix: '/api' });
await fastify.register(socialStoriesRoutes, { prefix: '/api' });

// Start server
try {
  await fastify.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`🚀 Content service running on port ${PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
