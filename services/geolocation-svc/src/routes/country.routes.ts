import { FastifyPluginAsync } from 'fastify';
import { logger } from '../utils/logger';

export const countryRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/v1/countries
   * List all active countries
   */
  fastify.get('/', async (request: any, reply) => {
    try {
      const query = request.query as { region?: string };
      
      let countries = await request.services.geolocation.getCountries();
      
      // Filter by region if specified
      if (query.region) {
        countries = countries.filter(
          (c: any) => c.region.toLowerCase() === query.region!.toLowerCase()
        );
      }
      
      return reply.send({
        success: true,
        data: countries,
        meta: {
          total: countries.length,
        },
      });
    } catch (error) {
      logger.error('Failed to list countries');
      return reply.status(500).send({
        success: false,
        error: 'Failed to list countries',
      });
    }
  });
  
  /**
   * GET /api/v1/countries/:code
   * Get detailed country information
   */
  fastify.get('/:code', async (request: any, reply) => {
    try {
      const { code } = request.params as { code: string };
      
      const country = await request.services.geolocation.getCountry(code);
      
      if (!country) {
        return reply.status(404).send({
          success: false,
          error: 'Country not found',
        });
      }
      
      return reply.send({
        success: true,
        data: country,
      });
    } catch (error) {
      logger.error('Failed to get country');
      return reply.status(500).send({
        success: false,
        error: 'Failed to get country details',
      });
    }
  });
  
  /**
   * GET /api/v1/countries/:code/regions
   * List regions/subdivisions for a country
   */
  fastify.get('/:code/regions', async (request: any, reply) => {
    try {
      const { code } = request.params as { code: string };
      
      const regions = await request.services.prisma.region.findMany({
        where: {
          countryCode: code.toUpperCase(),
          isActive: true,
        },
        orderBy: { name: 'asc' },
      });
      
      return reply.send({
        success: true,
        data: regions,
        meta: {
          total: regions.length,
        },
      });
    } catch (error) {
      logger.error('Failed to list regions');
      return reply.status(500).send({
        success: false,
        error: 'Failed to list regions',
      });
    }
  });
  
  /**
   * GET /api/v1/countries/:code/curricula
   * List available curricula for a country
   */
  fastify.get('/:code/curricula', async (request: any, reply) => {
    try {
      const { code } = request.params as { code: string };
      
      const curricula = await request.services.geolocation.getCurriculumFrameworks(code);
      
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
   * GET /api/v1/countries/:code/payment-providers
   * List available payment providers for a country
   */
  fastify.get('/:code/payment-providers', async (request: any, reply) => {
    try {
      const { code } = request.params as { code: string };
      
      const providers = await request.services.prisma.paymentProviderRegion.findMany({
        where: {
          countryCode: code.toUpperCase(),
          isActive: true,
        },
        orderBy: { priority: 'asc' },
      });
      
      return reply.send({
        success: true,
        data: providers,
        meta: {
          total: providers.length,
        },
      });
    } catch (error) {
      logger.error('Failed to list payment providers');
      return reply.status(500).send({
        success: false,
        error: 'Failed to list payment providers',
      });
    }
  });
};
