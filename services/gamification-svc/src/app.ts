/**
 * Gamification Service - Fastify App
 */

import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

import { authMiddleware } from './middleware/auth.js';
import {
  gamificationRoutes,
  achievementRoutes,
  streakRoutes,
  leaderboardRoutes,
  challengeRoutes,
  shopRoutes,
  teamRoutes,
  competitionRoutes,
  internalRoutes,
} from './routes/index.js';
import mobileGamificationRoutes from './routes/mobileGamification.routes.js';

// ============================================================================
// CORS CONFIGURATION
// ============================================================================

// CORS configuration - requires explicit origins in production
function getCorsOrigins(): string[] {
  if (process.env.CORS_ORIGIN) {
    return process.env.CORS_ORIGIN.split(',').map((o) => o.trim());
  }
  if (process.env.NODE_ENV === 'production') {
    return []; // No origins allowed by default in production
  }
  return ['http://localhost:3000', 'http://localhost:3001']; // Dev defaults
}

export default async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  const corsOrigins = getCorsOrigins();

  // ============================================================================
  // PLUGINS
  // ============================================================================

  await app.register(helmet);
  await app.register(cors, { origin: corsOrigins, credentials: true });
  await app.register(rateLimit, FastifyRateLimitPresets.publicApi('gamification-svc'));

  // Request logging
  app.addHook('onRequest', async (request) => {
    console.log(`${new Date().toISOString()} ${request.method} ${request.url}`);
  });

  // ============================================================================
  // HEALTH CHECK (unauthenticated — auth plugin skips /health and /ready)
  // ============================================================================

  app.get('/health', async (_request, reply) => {
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
      service: 'gamification-svc',
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
      return { status: 'ready', service: 'gamification-svc' };
    } catch (error) {
      reply.status(503);
      return {
        status: 'not ready',
        service: 'gamification-svc',
        error: error instanceof Error ? error.message : 'Database unavailable',
      };
    }
  });

  // ============================================================================
  // JWT AUTHENTICATION
  // ============================================================================

  await app.register(authMiddleware);

  // ============================================================================
  // API ROUTES
  // ============================================================================

  await app.register(
    async function apiRoutes(api) {
      await api.register(gamificationRoutes);
      await api.register(achievementRoutes, { prefix: '/achievements' });
      await api.register(streakRoutes, { prefix: '/streaks' });
      await api.register(leaderboardRoutes, { prefix: '/leaderboards' });
      await api.register(challengeRoutes, { prefix: '/challenges' });
      await api.register(shopRoutes, { prefix: '/shop' });
      await api.register(teamRoutes, { prefix: '/teams' });
      await api.register(competitionRoutes, { prefix: '/competitions' });
    },
    { prefix: '/api/gamification' }
  );

  // Register mobile gamification routes (direct paths matching Flutter client expectations)
  await app.register(mobileGamificationRoutes, { prefix: '/gamification' });

  // ============================================================================
  // INTERNAL ROUTES (DSR Compliance)
  // ============================================================================

  await app.register(internalRoutes, { prefix: '/internal' });

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  // 404 handler
  app.setNotFoundHandler((_request, reply) => {
    reply.status(404);
    return {
      success: false,
      error: 'Not found',
    };
  });

  // Error handler
  app.setErrorHandler((err, _request, reply) => {
    console.error('Error:', err);

    // Zod validation errors
    if (err.name === 'ZodError') {
      reply.status(400);
      return {
        success: false,
        error: 'Validation error',
        details: err,
      };
    }

    const statusCode = reply.statusCode >= 400 ? reply.statusCode : 500;
    reply.status(statusCode);
    return {
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    };
  });

  return app;
}
