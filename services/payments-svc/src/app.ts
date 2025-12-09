/**
 * Payments Service Application
 *
 * Fastify application setup with routes and middleware.
 */

import Fastify, { type FastifyInstance } from 'fastify';
import rawBody from 'fastify-raw-body';

import { config } from './config.js';
import { exportMetrics } from './metrics.js';
import { paymentRoutes, webhookRoutes } from './routes/index.js';
import { generateCorrelationId } from './safety.js';

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
    genReqId: () => generateCorrelationId(),
  });

  // Add correlation ID to all requests
  app.addHook('onRequest', async (request) => {
    // Use existing correlation ID from header or generate new one
    const correlationId =
      (request.headers['x-correlation-id'] as string) || request.id || generateCorrelationId();

    // Attach to request for use in handlers
    (request as typeof request & { correlationId: string }).correlationId = correlationId;

    // Add to log context
    request.log = request.log.child({ correlationId });
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

  // Prometheus metrics endpoint (internal only)
  app.get('/internal/metrics', async (request, reply) => {
    reply.header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    return exportMetrics();
  });

  // Register routes
  await app.register(paymentRoutes);
  await app.register(webhookRoutes);

  return app;
}
