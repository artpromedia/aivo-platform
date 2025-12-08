import type { FastifyInstance } from 'fastify';

export async function registerHealthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/health', async () => {
    return { status: 'ok', service: 'teacher-planning-svc' };
  });

  fastify.get('/health/ready', async () => {
    // Could add DB connectivity check here
    return { status: 'ready', service: 'teacher-planning-svc' };
  });
}
