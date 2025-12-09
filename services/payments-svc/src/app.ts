/**
 * Payments Service Application
 *
 * Fastify application setup with routes and middleware.
 */

import Fastify, { type FastifyInstance } from 'fastify';
import rawBody from 'fastify-raw-body';

import { config } from './config.js';
import { paymentRoutes, webhookRoutes } from './routes/index.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      config.nodeEnv === 'development'
        ? {
            level: 'debug',
            transport: {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            },
          }
        : {
            level: 'info',
          },
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
  });

  // Enable raw body for Stripe webhook signature verification
  await app.register(rawBody, {
    field: 'rawBody',
    global: false,
    encoding: 'utf8',
    runFirst: true,
    routes: ['/payments/webhook/stripe'],
  });

  // Health check endpoint
  app.get('/health', async () => {
    return { status: 'ok', service: 'payments-svc' };
  });

  // Register routes
  await app.register(paymentRoutes);
  await app.register(webhookRoutes);

  return app;
}
