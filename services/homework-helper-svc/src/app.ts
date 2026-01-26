import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';

import { config } from './config.js';
import { authMiddleware } from './middleware/authMiddleware.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerHomeworkRoutes } from './routes/homework.js';
import { registerParentRoutes } from './routes/parent.js';
import { registerUploadRoutes } from './routes/upload.js';
import { registerImageUploadRoutes } from './routes/image-upload.routes.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: config.logLevel,
    },
  });

  // Security middleware
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await app.register(helmet as any, {
    contentSecurityPolicy: false,
  });

  // Rate limiting - protect homework helper from abuse
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await app.register(rateLimit as any, {
    global: true,
    max: 60, // 60 requests per minute (AI calls are expensive)
    timeWindow: '1 minute',
    keyGenerator: (request) => {
      // Use user ID from JWT for rate limiting
      const userId = (request as { userId?: string }).userId;
      if (userId) return `user:${userId}`;
      return (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
        request.ip ||
        'unknown';
    },
    errorResponseBuilder: (request, context) => ({
      error: 'Too Many Requests',
      message: 'Homework helper rate limit exceeded. Please wait before making more requests.',
      retryAfter: context.after,
    }),
    allowList: (request) => request.url === '/health' || request.url === '/ready',
  });

  // Register multipart support for file uploads
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await app.register(multipart as any, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max file size
      files: 1, // Only allow 1 file per request
    },
  });

  // Global error handler
  app.setErrorHandler(async (error, request, reply) => {
    request.log.error(error);
    const statusCode = error.statusCode ?? 500;
    reply.status(statusCode).send({
      error: error.message || 'Internal Server Error',
    });
  });

  // Health check routes (no auth required)
  await app.register(registerHealthRoutes);

  // Auth middleware for protected routes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await app.register(authMiddleware as any);

  // Homework routes
  await app.register(registerHomeworkRoutes, { prefix: '/homework' });

  // Parent monitoring routes
  await app.register(registerParentRoutes, { prefix: '/parent' });

  // Upload routes (OCR)
  await app.register(registerUploadRoutes, { prefix: '/upload' });

  // Image upload routes (new OCR pipeline)
  await app.register(registerImageUploadRoutes, { prefix: '/api/v1/homework' });

  return app;
}
