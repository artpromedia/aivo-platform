import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';

import { config } from './config.js';
import { authMiddleware } from './middleware/auth.js';
import { auditRoutes } from './routes/auditRoutes.js';
import { classroomAnalyticsRoutes } from './routes/classroomAnalytics.js';
import { collaborationAnalyticsRoutes } from './routes/collaborationAnalytics.js';
import { eventsAdminRoutes } from './routes/events-admin.js';
import { experimentAnalyticsRoutes } from './routes/experimentAnalytics.js';
import { explanationRoutes } from './routes/explanationRoutes.js';
import { learnerAnalyticsRoutes } from './routes/learnerAnalytics.js';
import { modelCardsRoutes } from './routes/modelCardsRoutes.js';
import { parentAnalyticsRoutes } from './routes/parentAnalytics.js';
import { researchExportRoutes } from './routes/researchExports.js';
import { teacherAnalyticsRoutes } from './routes/teacherAnalytics.js';
import { tenantAnalyticsRoutes } from './routes/tenantAnalytics.js';

// New analytics service routes
import analyticsRoutes from './routes/analytics.routes.js';
import eventsRoutes from './routes/events.routes.js';
import dashboardRoutes from './routes/dashboards.routes.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.nodeEnv === 'production' ? 'info' : 'debug',
      transport:
        config.nodeEnv === 'production'
          ? undefined
          : { target: 'pino-pretty', options: { colorize: true } },
    },
  });

  // Health check (unauthenticated)
  app.get('/health', async () => ({ status: 'ok', service: 'analytics-svc' }));

  // Readiness check (unauthenticated)
  app.get('/ready', async () => ({ status: 'ok', service: 'analytics-svc' }));

  // JWT auth for all other routes
  await app.register(authMiddleware);

  // Register analytics routes under /analytics prefix
  await app.register(learnerAnalyticsRoutes, { prefix: '/analytics' });
  await app.register(parentAnalyticsRoutes, { prefix: '/analytics' });
  await app.register(teacherAnalyticsRoutes, { prefix: '/analytics' });
  await app.register(classroomAnalyticsRoutes, { prefix: '/analytics' });
  await app.register(collaborationAnalyticsRoutes, { prefix: '/analytics' });
  await app.register(tenantAnalyticsRoutes, { prefix: '/analytics' });
  await app.register(experimentAnalyticsRoutes, { prefix: '/analytics' });
  await app.register(explanationRoutes, { prefix: '/analytics' });

  // Register model cards routes under /models prefix
  await app.register(modelCardsRoutes, { prefix: '/models' });

  // Register audit routes under /audit prefix
  await app.register(auditRoutes, { prefix: '/audit' });

  // Register internal events admin routes (for replay, DLQ management)
  await app.register(eventsAdminRoutes, { prefix: '/internal/events' });

  // Register research exports routes (FERPA/COPPA compliant de-identified data)
  await app.register(researchExportRoutes, { prefix: '/research' });

  // Register new analytics service routes
  await app.register(analyticsRoutes, { prefix: '/v2/analytics' });
  await app.register(eventsRoutes, { prefix: '/v2/events' });
  await app.register(dashboardRoutes, { prefix: '/v2/dashboards' });

  return app;
}
