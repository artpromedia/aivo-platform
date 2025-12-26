import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import {
  assessmentRoutes,
  questionRoutes,
  attemptRoutes,
  gradingRoutes,
  analyticsRoutes,
  securityRoutes,
} from './routes/index.js';

export function createApp() {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors());

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logging (simple)
  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'assessment-svc' });
  });

  // API routes
  app.use('/api/v1/assessments', assessmentRoutes);
  app.use('/api/v1/questions', questionRoutes);
  app.use('/api/v1/attempts', attemptRoutes);
  app.use('/api/v1', gradingRoutes);      // /api/v1/rubrics, /api/v1/grading
  app.use('/api/v1', analyticsRoutes);    // /api/v1/analytics
  app.use('/api/v1', securityRoutes);     // /api/v1/security

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Error handler
  app.use(
    (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('Unhandled error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  );

  return app;
}
