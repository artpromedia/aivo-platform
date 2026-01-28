/**
 * Gamification Service - Express App
 */

import cors from 'cors';
import type { Request, Response, NextFunction, Application } from 'express';
import express from 'express';
import helmet from 'helmet';

import { createExpressRateLimiter, RateLimitPresets } from '@aivo/ts-api-utils';
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
import { authMiddleware } from './middleware/auth.js';

const app: Application = express();

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

const corsOrigins = getCorsOrigins();

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(helmet());
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json());

// Rate limiting for gamification API
app.use(createExpressRateLimiter(RateLimitPresets.API_GENERAL));

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// HEALTH CHECK (unauthenticated)
// ============================================================================

app.get('/health', async (_req: Request, res: Response) => {
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

  res.json({
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
  });
});

app.get('/ready', async (_req: Request, res: Response) => {
  try {
    const { prisma } = await import('./prisma.js');
    await prisma.$queryRaw`SELECT 1 as ready_check`;
    res.json({ status: 'ready', service: 'gamification-svc' });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      service: 'gamification-svc',
      error: error instanceof Error ? error.message : 'Database unavailable',
    });
  }
});

// ============================================================================
// JWT AUTHENTICATION
// ============================================================================

app.use(authMiddleware);

// ============================================================================
// API ROUTES
// ============================================================================

const apiRouter = express.Router();

apiRouter.use('/', gamificationRoutes);
apiRouter.use('/achievements', achievementRoutes);
apiRouter.use('/streaks', streakRoutes);
apiRouter.use('/leaderboards', leaderboardRoutes);
apiRouter.use('/challenges', challengeRoutes);
apiRouter.use('/shop', shopRoutes);
apiRouter.use('/teams', teamRoutes);
apiRouter.use('/competitions', competitionRoutes);

app.use('/api/gamification', apiRouter);

// Register mobile gamification routes (direct paths matching Flutter client expectations)
app.use('/gamification', mobileGamificationRoutes);

// ============================================================================
// INTERNAL ROUTES (DSR Compliance)
// ============================================================================

app.use('/internal', internalRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);

  // Zod validation errors
  if (err.name === 'ZodError') {
    res.status(400).json({
      success: false,
      error: 'Validation error',
      details: err,
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

export default app;
