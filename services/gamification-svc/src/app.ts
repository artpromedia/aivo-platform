/**
 * Gamification Service - Express App
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access */

import express, { Request, Response, NextFunction, Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import {
  gamificationRoutes,
  achievementRoutes,
  streakRoutes,
  leaderboardRoutes,
  challengeRoutes,
  shopRoutes,
} from './routes/index.js';

const app: Application = express();

// ============================================================================
// CORS CONFIGURATION
// ============================================================================

// CORS configuration - requires explicit origins in production
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : process.env.NODE_ENV === 'production'
    ? [] // No origins allowed by default in production
    : ['http://localhost:3000', 'http://localhost:3001']; // Dev defaults

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(helmet());
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json());

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'gamification-svc',
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', async (_req: Request, res: Response) => {
  try {
    const { prisma } = await import('./prisma.js');
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready' });
  } catch {
    res.status(503).json({ status: 'not ready' });
  }
});

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

app.use('/api/gamification', apiRouter);

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
