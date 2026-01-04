import Fastify from 'fastify';
import multipart from '@fastify/multipart';

import { config } from './config.js';
import { authMiddleware } from './middleware/authMiddleware.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerHomeworkRoutes } from './routes/homework.js';
import { registerParentRoutes } from './routes/parent.js';
import { registerUploadRoutes } from './routes/upload.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: config.logLevel,
    },
  });

  // Register multipart support for file uploads
  await app.register(multipart, {
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
  await app.register(authMiddleware);

  // Homework routes
  await app.register(registerHomeworkRoutes, { prefix: '/homework' });

  // Parent monitoring routes
  await app.register(registerParentRoutes, { prefix: '/parent' });

  // Upload routes (OCR)
  await app.register(registerUploadRoutes, { prefix: '/upload' });

  return app;
}
