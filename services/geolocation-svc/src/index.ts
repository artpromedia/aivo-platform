// Load environment variables
import 'dotenv/config';

import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import Fastify from 'fastify';
import Redis from 'ioredis';

import { PrismaClient } from '../generated/prisma-client';

import { countryRoutes } from './routes/country.routes';
import { currencyRoutes } from './routes/currency.routes';
import { curriculumRoutes } from './routes/curriculum.routes';
import { healthRoutes } from './routes/health.routes';
import { locationRoutes } from './routes/location.routes';
import { CacheService } from './services/cache.service';
import { GeolocationService } from './services/geolocation.service';
import { logger } from './utils/logger';

// Environment configuration
const PORT = parseInt(process.env.PORT || '4090', 10);
const HOST = process.env.HOST || '0.0.0.0';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Initialize Prisma client
const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

// Initialize Redis client
const redis = new Redis(REDIS_URL);

// Initialize services
const cacheService = new CacheService(redis);
const geolocationService = new GeolocationService(prisma, cacheService);

// Create Fastify instance
const app = Fastify({
  logger: true,
  trustProxy: true,
});

// Register plugins
async function registerPlugins() {
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });
}

// Register routes
async function registerRoutes() {
  // Inject services into request
  app.decorateRequest('services', null);
  app.addHook('onRequest', async (request) => {
    (request as unknown as { services: typeof request.services }).services = {
      prisma,
      geolocation: geolocationService,
      cache: cacheService,
    };
  });

  // Register route handlers
  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(locationRoutes, { prefix: '/api/v1/locate' });
  await app.register(countryRoutes, { prefix: '/api/v1/countries' });
  await app.register(currencyRoutes, { prefix: '/api/v1/currencies' });
  await app.register(curriculumRoutes, { prefix: '/api/v1/curricula' });
}

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down geolocation service...');
  
  await app.close();
  await prisma.$disconnect();
  redis.disconnect();
  
  logger.info('Geolocation service shut down complete');
  process.exit(0);
}

// Main startup
async function main() {
  try {
    // Connect to database
    await prisma.$connect();
    logger.info('Connected to database');

    // Test Redis connection
    await redis.ping();
    logger.info('Connected to Redis');

    // Initialize MaxMind database (optional)
    try {
      await geolocationService.initialize();
      logger.info('Initialized MaxMind GeoIP database');
    } catch {
      logger.warn('MaxMind database not available, using fallback detection');
    }

    // Register plugins and routes
    await registerPlugins();
    await registerRoutes();

    // Start server
    await app.listen({ port: PORT, host: HOST });
    logger.info(`Geolocation service listening on ${HOST}:${PORT}`);

    // Handle shutdown signals
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    logger.error('Failed to start geolocation service');
    console.error(error);
    process.exit(1);
  }
}

void main();

// Type augmentation for Fastify
declare module 'fastify' {
  interface FastifyRequest {
    services: {
      prisma: PrismaClient;
      geolocation: GeolocationService;
      cache: CacheService;
    };
  }
}
