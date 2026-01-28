import { FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /health
   * Basic health check
   */
  fastify.get('/', async (_request, reply) => {
    return reply.send({
      status: 'healthy',
      service: 'geolocation-svc',
      timestamp: new Date().toISOString(),
    });
  });
  
  /**
   * GET /health/ready
   * Readiness check - verifies all dependencies
   */
  fastify.get('/ready', async (request: any, reply) => {
    const checks: Record<string, boolean> = {};
    
    // Check database
    try {
      await request.services.prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch {
      checks.database = false;
    }
    
    // Check Redis (via cache service)
    try {
      await request.services.cache.set('health-check', 'ok', 10);
      checks.redis = true;
    } catch {
      checks.redis = false;
    }
    
    const allHealthy = Object.values(checks).every(v => v);
    
    return reply
      .status(allHealthy ? 200 : 503)
      .send({
        status: allHealthy ? 'ready' : 'not ready',
        service: 'geolocation-svc',
        checks,
        timestamp: new Date().toISOString(),
      });
  });
  
  /**
   * GET /health/live
   * Liveness check - basic process health
   */
  fastify.get('/live', async (request, reply) => {
    return reply.send({
      status: 'alive',
      service: 'geolocation-svc',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });
};
