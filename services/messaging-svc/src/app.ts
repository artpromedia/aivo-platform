/**
 * Fastify Application Setup
 */

import Fastify, { FastifyInstance } from 'fastify';

import { config } from './config.js';
import { registerConversationRoutes, registerMessageRoutes } from './routes/index.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.nodeEnv === 'production' ? 'info' : 'debug',
      transport:
        config.nodeEnv !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  });

  // ════════════════════════════════════════════════════════════════════════════
  // HEALTH CHECK
  // ════════════════════════════════════════════════════════════════════════════

  app.get('/health', async () => ({
    status: 'ok',
    service: 'messaging-svc',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  }));

  // ════════════════════════════════════════════════════════════════════════════
  // ERROR HANDLER
  // ════════════════════════════════════════════════════════════════════════════

  app.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode ?? 500;

    if (statusCode >= 500) {
      app.log.error({ err: error, requestId: request.id }, 'Server error');
    } else {
      app.log.warn({ err: error, requestId: request.id }, 'Client error');
    }

    if (error.name === 'ZodError') {
      return reply.status(400).send({
        error: 'Validation Error',
        details: JSON.parse(error.message),
      });
    }

    if (error.message === 'Missing tenant context') {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Missing tenant context headers',
      });
    }

    // Handle business logic errors
    const businessErrors = [
      'User is not a participant in this conversation',
      'Only the sender can edit this message',
      'Not authorized to delete this message',
      'Message not found',
    ];

    if (businessErrors.includes(error.message)) {
      return reply.status(error.message.includes('not found') ? 404 : 403).send({
        error: error.message,
      });
    }

    return reply.status(statusCode).send({
      error: statusCode >= 500 ? 'Internal Server Error' : error.message,
      ...(config.nodeEnv !== 'production' && { stack: error.stack }),
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // REGISTER ROUTES
  // ════════════════════════════════════════════════════════════════════════════

  await registerConversationRoutes(app);
  await registerMessageRoutes(app);

  // ════════════════════════════════════════════════════════════════════════════
  // ROOT ENDPOINT
  // ════════════════════════════════════════════════════════════════════════════

  app.get('/', async () => ({
    service: 'messaging-svc',
    version: '0.1.0',
    description: 'In-app Messaging Service',
    endpoints: {
      conversations: '/conversations',
      messages: '/messages',
      unread: '/unread',
    },
  }));

  return app;
}
