import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { logger } from '../utils/logger';

// Request schemas
const DetectLocationSchema = z.object({
  ip: z.string().ip().optional(),
  browserLanguage: z.string().optional(),
  browserTimezone: z.string().optional(),
});

const ResolveCurriculumSchema = z.object({
  countryCode: z.string().length(2),
  regionCode: z.string().optional(),
  schoolType: z.enum(['PUBLIC', 'PRIVATE', 'INTERNATIONAL']).optional(),
  preferredFramework: z.string().optional(),
});

export const locationRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/v1/locate
   * Auto-detect location from request IP
   */
  fastify.get('/', async (request: any, reply) => {
    try {
      // Get client IP from various headers (proxy-aware)
      const ip = getClientIp(request);
      const browserLanguage = request.headers['accept-language'] as string | undefined;
      
      logger.debug(`Detecting location for IP: ${ip}`);
      
      const location = await request.services.geolocation.detectLocation({
        ip,
        browserLanguage,
      });
      
      return reply.send({
        success: true,
        data: location,
      });
    } catch (error) {
      logger.error('Location detection failed');
      return reply.status(500).send({
        success: false,
        error: 'Failed to detect location',
      });
    }
  });
  
  /**
   * POST /api/v1/locate
   * Detect location from provided data
   */
  fastify.post('/', async (request: any, reply) => {
    try {
      const body = DetectLocationSchema.parse(request.body);
      
      // Use provided IP or fall back to request IP
      const ip = body.ip || getClientIp(request);
      
      const location = await request.services.geolocation.detectLocation({
        ip,
        browserLanguage: body.browserLanguage,
        browserTimezone: body.browserTimezone,
      });
      
      return reply.send({
        success: true,
        data: location,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid request body',
          details: error.errors,
        });
      }
      
      logger.error('Location detection failed');
      return reply.status(500).send({
        success: false,
        error: 'Failed to detect location',
      });
    }
  });
  
  /**
   * POST /api/v1/locate/curriculum
   * Resolve best curriculum for a user
   */
  fastify.post('/curriculum', async (request: any, reply) => {
    try {
      const body = ResolveCurriculumSchema.parse(request.body);
      
      const curriculum = await request.services.geolocation.resolveCurriculum(body);
      
      if (!curriculum) {
        return reply.status(404).send({
          success: false,
          error: 'No curriculum found for the specified location',
        });
      }
      
      return reply.send({
        success: true,
        data: {
          curriculumFramework: curriculum,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid request body',
          details: error.errors,
        });
      }
      
      logger.error('Curriculum resolution failed');
      return reply.status(500).send({
        success: false,
        error: 'Failed to resolve curriculum',
      });
    }
  });
  
  /**
   * GET /api/v1/locate/payment-provider
   * Get best payment provider for a region
   */
  fastify.get('/payment-provider', async (request: any, reply) => {
    try {
      const query = request.query as { countryCode?: string; currency?: string };
      
      if (!query.countryCode || !query.currency) {
        return reply.status(400).send({
          success: false,
          error: 'countryCode and currency are required',
        });
      }
      
      const provider = await request.services.geolocation.getPaymentProvider(
        query.countryCode,
        query.currency,
      );
      
      if (!provider) {
        return reply.send({
          success: true,
          data: {
            providerCode: 'STRIPE', // Global fallback
            message: 'No local provider found, falling back to Stripe',
          },
        });
      }
      
      return reply.send({
        success: true,
        data: provider,
      });
    } catch (error) {
      logger.error('Payment provider lookup failed');
      return reply.status(500).send({
        success: false,
        error: 'Failed to get payment provider',
      });
    }
  });
};

/**
 * Extract client IP from request, handling proxies
 */
function getClientIp(request: any): string {
  // Check various headers in order of preference
  const forwardedFor = request.headers['x-forwarded-for'];
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, get the first one
    const ips = typeof forwardedFor === 'string' 
      ? forwardedFor.split(',') 
      : forwardedFor;
    return ips[0].trim();
  }
  
  const realIp = request.headers['x-real-ip'];
  if (realIp) {
    return typeof realIp === 'string' ? realIp : realIp[0];
  }
  
  const cfConnectingIp = request.headers['cf-connecting-ip'];
  if (cfConnectingIp) {
    return typeof cfConnectingIp === 'string' ? cfConnectingIp : cfConnectingIp[0];
  }
  
  // Fall back to socket IP
  return request.ip || '127.0.0.1';
}
