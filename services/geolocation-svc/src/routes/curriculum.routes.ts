import { FastifyPluginAsync } from 'fastify';
import { logger } from '../utils/logger';

export const curriculumRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/v1/curricula
   * List all active curriculum frameworks
   */
  fastify.get('/', async (request: any, reply) => {
    try {
      const query = request.query as { 
        countryCode?: string;
        type?: string;
      };
      
      const where: any = { isActive: true };
      
      if (query.countryCode) {
        where.countries = { has: query.countryCode.toUpperCase() };
      }
      
      if (query.type) {
        where.type = query.type.toUpperCase();
      }
      
      const curricula = await request.services.prisma.curriculumFramework.findMany({
        where,
        orderBy: { name: 'asc' },
      });
      
      return reply.send({
        success: true,
        data: curricula,
        meta: {
          total: curricula.length,
        },
      });
    } catch (error) {
      logger.error('Failed to list curricula');
      return reply.status(500).send({
        success: false,
        error: 'Failed to list curricula',
      });
    }
  });
  
  /**
   * GET /api/v1/curricula/:code
   * Get curriculum framework details
   */
  fastify.get('/:code', async (request: any, reply) => {
    try {
      const { code } = request.params as { code: string };
      
      const curriculum = await request.services.prisma.curriculumFramework.findUnique({
        where: { code },
      });
      
      if (!curriculum) {
        return reply.status(404).send({
          success: false,
          error: 'Curriculum framework not found',
        });
      }
      
      return reply.send({
        success: true,
        data: curriculum,
      });
    } catch (error) {
      logger.error('Failed to get curriculum');
      return reply.status(500).send({
        success: false,
        error: 'Failed to get curriculum details',
      });
    }
  });
  
  /**
   * GET /api/v1/curricula/types
   * List curriculum types
   */
  fastify.get('/types', async (_request, reply) => {
    try {
      return reply.send({
        success: true,
        data: [
          { code: 'NATIONAL', name: 'National Curriculum', description: 'Country-wide national curriculum' },
          { code: 'STATE_PROVINCIAL', name: 'State/Provincial', description: 'State or province specific curriculum' },
          { code: 'INTERNATIONAL', name: 'International', description: 'International programs (IB, Cambridge)' },
          { code: 'PRIVATE', name: 'Private/Religious', description: 'Private or religious school curricula' },
        ],
      });
    } catch (error) {
      logger.error('Failed to list curriculum types');
      return reply.status(500).send({
        success: false,
        error: 'Failed to list curriculum types',
      });
    }
  });
};
