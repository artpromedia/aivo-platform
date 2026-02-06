import type { FastifyInstance } from 'fastify';

/**
 * Health check routes for Kubernetes liveness and readiness probes
 */
export async function healthRoutes(app: FastifyInstance) {
  // Liveness probe: Is the process alive?
  // This should only fail if the process is deadlocked or unable to respond
  app.get('/health/live', async (_request, reply) => {
    return reply.code(200).send({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Readiness probe: Is the service ready to receive traffic?
  // This should check dependencies like database and Redis
  app.get('/health/ready', async (_request, reply) => {
    // For now, return ok if we can respond
    // TODO: Add checks for database, Redis, and other critical dependencies
    return reply.code(200).send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      ready: true,
    });
  });

  // Legacy health endpoint (for backwards compatibility)
  app.get('/health', async (_request, reply) => {
    return reply.code(200).send({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Legacy ready endpoint (for backwards compatibility)
  app.get('/ready', async (_request, reply) => {
    return reply.code(200).send({ status: 'ok', timestamp: new Date().toISOString() });
  });
}
