/**
 * Payments Service Application
 *
 * Fastify application setup with routes and middleware.
 */

import rateLimit from '@fastify/rate-limit';
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
  await app.register(rawBody as unknown as Parameters<typeof app.register>[0], {
    field: 'rawBody',
    global: false,
    encoding: 'utf8',
    runFirst: true,
    routes: ['/payments/webhook/stripe'],
  });

  // Rate limiting - protect webhook and API endpoints from abuse
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await app.register(rateLimit as any, {
    global: true,
    max: 100, // 100 requests per minute by default
    timeWindow: '1 minute',
    keyGenerator: (request) => {
      // Use forwarded IP in production (behind load balancer)
      return (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
        request.ip ||
        'unknown';
    },
    errorResponseBuilder: (request, context) => ({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: context.after,
    }),
    // Skip rate limiting for health checks
    allowList: (request) => request.url === '/health' || request.url === '/internal/metrics',
  });

  // Health check endpoint
  app.get('/health', async () => {
    const startTime = Date.now();
    let dbStatus = 'healthy';
    let dbLatencyMs = 0;
    let dbError: string | undefined;

    try {
      const { prisma } = await import('./prisma.js');
      await prisma.$queryRaw`SELECT 1 as health_check`;
      dbLatencyMs = Date.now() - startTime;
      if (dbLatencyMs > 1000) {
        dbStatus = 'unhealthy';
      } else if (dbLatencyMs > 500) {
        dbStatus = 'degraded';
      }
    } catch (error) {
      dbStatus = 'unhealthy';
      dbLatencyMs = Date.now() - startTime;
      dbError = error instanceof Error ? error.message : 'Unknown error';
    }

    return {
      status: dbStatus === 'unhealthy' ? 'unhealthy' : 'healthy',
      service: 'payments-svc',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        error: dbError,
      },
    };
  });

  app.get('/ready', async (_request, reply) => {
    try {
      const { prisma } = await import('./prisma.js');
      await prisma.$queryRaw`SELECT 1 as ready_check`;
      return reply.send({ status: 'ready', service: 'payments-svc' });
    } catch (error) {
      return reply.status(503).send({
        status: 'not ready',
        service: 'payments-svc',
        error: error instanceof Error ? error.message : 'Database unavailable',
      });
    }
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
