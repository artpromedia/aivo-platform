/**
 * Content Service - Learning Object Management
 *
 * Manages versioned, reviewable Learning Objects with:
 * - Authoring & editing
 * - Review & approval workflow
 * - Versioning & publishing
 * - Skill alignment
 * - Accessibility metadata
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';

import { learningObjectRoutes } from './routes/learningObjects.js';
import { versionRoutes } from './routes/versions.js';

const PORT = parseInt(process.env.PORT ?? '4020', 10);

async function main() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
  });

  // Register CORS
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN ?? true,
  });

  // Health check
  fastify.get('/health', async () => ({ status: 'ok', service: 'content-svc' }));

  // Register routes
  await fastify.register(learningObjectRoutes, { prefix: '/api' });
  await fastify.register(versionRoutes, { prefix: '/api' });

  // Start server
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🚀 Content service running on port ${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
