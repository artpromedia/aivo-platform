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
 */

import cors from '@fastify/cors';
import Fastify from 'fastify';

import { learningObjectRoutes } from './routes/learningObjects.js';
import { renderRoutes } from './routes/render.js';
import { searchRoutes } from './routes/search.js';
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
  await fastify.register(searchRoutes, { prefix: '/api' });
  await fastify.register(renderRoutes, { prefix: '/api' });

  // Start server
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🚀 Content service running on port ${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

void main();
