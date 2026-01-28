import type { FastifyPluginAsync } from 'fastify';

import type { Country, CountryCodeParams, CountryListQuery } from '../types/fastify.d';
import { logger } from '../utils/logger';

export const countryRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/v1/countries
   * List all active countries
   */
  fastify.get<{ Querystring: CountryListQuery }>('/', async (request, reply) => {
    try {
      const query = request.query;
      
      let countries = await request.services.geolocation.getCountries() as Country[];
      
      // Filter by region if specified
      if (query.region) {
        const regionLower = query.region.toLowerCase();
        countries = countries.filter(
          (c) => c.region.toLowerCase() === regionLower
        );
      }
      
      return reply.send({
        success: true,
        data: countries,
        meta: {
          total: countries.length,
        },
      });
    } catch {
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
  fastify.get<{ Params: CountryCodeParams }>('/:code', async (request, reply) => {
    try {
      const { code } = request.params;
      
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
    } catch {
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
  fastify.get<{ Params: CountryCodeParams }>('/:code/regions', async (request, reply) => {
    try {
      const { code } = request.params;
      
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
    } catch {
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
  fastify.get<{ Params: CountryCodeParams }>('/:code/curricula', async (request, reply) => {
    try {
      const { code } = request.params;
      
      const curricula = await request.services.geolocation.getCurriculumFrameworks(code);
      
      return reply.send({
        success: true,
        data: curricula,
        meta: {
          total: curricula.length,
        },
      });
    } catch {
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
  fastify.get<{ Params: CountryCodeParams }>('/:code/payment-providers', async (request, reply) => {
    try {
      const { code } = request.params;
      
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
    } catch {
      logger.error('Failed to list payment providers');
      return reply.status(500).send({
        success: false,
        error: 'Failed to list payment providers',
      });
    }
  });
};
