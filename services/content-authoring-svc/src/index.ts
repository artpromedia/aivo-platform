/**
 * Content Authoring Service
 *
 * REST API for creating and managing Learning Objects through
 * the authoring and publication workflow.
 *
 * Endpoints:
 * - POST   /learning-objects                              Create new LO
 * - GET    /learning-objects                              List LOs
 * - GET    /learning-objects/:loId                        Get LO details
 * - PATCH  /learning-objects/:loId                        Update LO metadata
 * - DELETE /learning-objects/:loId                        Soft-delete LO
 * - POST   /learning-objects/:loId/tags                   Replace tags
 *
 * - GET    /learning-objects/:loId/versions               List versions
 * - POST   /learning-objects/:loId/versions               Create new version
 * - GET    /learning-objects/:loId/versions/:vn           Get version details
 * - PATCH  /learning-objects/:loId/versions/:vn           Update version content
 * - POST   /learning-objects/:loId/versions/:vn/skills    Replace skills
 *
 * Workflow:
 * - POST   /learning-objects/:loId/versions/:vn/submit-review
 * - POST   /learning-objects/:loId/versions/:vn/approve
 * - POST   /learning-objects/:loId/versions/:vn/reject
 * - POST   /learning-objects/:loId/versions/:vn/publish
 *
 * - GET    /review-queue                                  List items for review
 *
 * Translations (i18n):
 * - GET    /learning-objects/:loId/versions/:vn/translations
 * - GET    /learning-objects/:loId/versions/:vn/translations/:locale
 * - PUT    /learning-objects/:loId/versions/:vn/translations/:locale
 * - PATCH  /learning-objects/:loId/versions/:vn/translations/:locale/status
 * - DELETE /learning-objects/:loId/versions/:vn/translations/:locale
 *
 * Content Resolution (for consumers):
 * - POST   /content/learning-objects/resolve
 * - POST   /content/learning-objects/:learningObjectId/resolve
 * - POST   /content/learning-objects/best-match
 * - GET    /content/accessibility-profile/schema
 */

/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any */

import cors from '@fastify/cors';
import Fastify from 'fastify';

import { registerAuthHook } from './auth.js';
import { communityRoutes } from './routes/community.routes.js';
import { contentRoutes } from './routes/content.js';
import { learningObjectRoutes } from './routes/learningObjects.js';
import { lessonBuilderRoutes } from './routes/lesson-builder.routes.js';
import { sharingRoutes } from './routes/sharing.routes.js';
import { translationRoutes } from './routes/translations.js';
import { versionRoutes } from './routes/versions.js';

const PORT = parseInt(process.env.PORT ?? '4021', 10);

async function main() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
  });

  // Register CORS
  await fastify.register(cors as any, {
    origin: process.env.CORS_ORIGIN ?? true,
  });

  // Register auth hook
  registerAuthHook(fastify);

  // Health check
  fastify.get('/health', async () => ({
    status: 'ok',
    service: 'content-authoring-svc',
    timestamp: new Date().toISOString(),
  }));

  // Register routes
  await fastify.register(learningObjectRoutes, { prefix: '/api' });
  await fastify.register(versionRoutes, { prefix: '/api' });
  await fastify.register(translationRoutes, { prefix: '/api' });
  await fastify.register(contentRoutes, { prefix: '/api' });
  await fastify.register(lessonBuilderRoutes, { prefix: '/api' });
  await fastify.register(sharingRoutes, { prefix: '/api' });
  await fastify.register(communityRoutes, { prefix: '/api' });

  // Start server
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🚀 Content Authoring service running on port ${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
