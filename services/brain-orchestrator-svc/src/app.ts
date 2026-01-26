import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import { authMiddleware } from './middleware/auth.js';
import { orchestrationRoutes } from './routes/orchestration.routes.js';
import { cognitiveRoutes } from './routes/cognitive.routes.js';
import { learningRoutes } from './routes/learning.routes.js';
import { ZodError } from 'zod';

export function createApp(): Express {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
    })
  );

  // Body parsing
  app.use(express.json({ limit: '10mb' }));

  // Health check (unauthenticated)
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'brain-orchestrator-svc',
      timestamp: new Date().toISOString(),
    });
  });

  // Auth middleware for all other routes
  app.use(authMiddleware);

  // API routes
  app.use('/api/v1/brain', orchestrationRoutes);
  app.use('/api/v1/brain', cognitiveRoutes);
  app.use('/api/v1/brain', learningRoutes);

  // Error handling middleware
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Error:', err);

    // Handle Zod validation errors
    if (err instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: err.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }

    // Handle known errors
    if (err.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: err.message,
      });
      return;
    }

    if (err.message.includes('already exists') || err.message.includes('duplicate')) {
      res.status(409).json({
        success: false,
        error: err.message,
      });
      return;
    }

    if (
      err.message.includes('Invalid') ||
      err.message.includes('Cannot') ||
      err.message.includes('Missing')
    ) {
      res.status(400).json({
        success: false,
        error: err.message,
      });
      return;
    }

    // Generic error
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    });
  });

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'Endpoint not found',
    });
  });

  return app;
}
