import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';

import { authMiddleware } from './middleware/authMiddleware.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerDemoRoutes } from './routes/demo.js';
import { healthRoutes } from './routes/health.js';
import { registerMfaRoutes } from './routes/mfa.js';
import { registerSsoRoutes } from './routes/sso.js';
import { registerScopeRoutes } from './graphql/resolvers.js';
import { registerScimRoutes } from './scim/scim.routes.js';
import { registerScimAdminRoutes } from './routes/scim-admin.routes.js';

export function createApp() {
  const app = Fastify({ logger: true });

  // CORS configuration for local development

  void app.register(cors as any, {
    origin: [
      'http://localhost:3000',
      'http://localhost:3004',
      'http://localhost:3001',
      'http://localhost:3002',
      /\.aivo\.ai$/,
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id'],
  });

  // Rate limiting - strict limits for auth endpoints to prevent brute force

  void app.register(rateLimit as any, FastifyRateLimitPresets.authService('auth-svc'));

  // Register form body parser for SAML POST binding
  app.addContentTypeParser(
    'application/x-www-form-urlencoded',
    { parseAs: 'string' },
    (req, body, done) => {
      try {
        const parsed = Object.fromEntries(new URLSearchParams(body as string));
        done(null, parsed);
      } catch (err) {
        done(err as Error);
      }
    }
  );

  // Health check routes (must be registered early, before auth middleware)
  void app.register(healthRoutes as any);

  void app.register(authMiddleware as any);

  void app.register(registerAuthRoutes as any, { prefix: '/auth' });

  void app.register(registerSsoRoutes as any, { prefix: '/auth' });

  void app.register(registerMfaRoutes as any, { prefix: '/auth' });

  void app.register(registerScopeRoutes as any, { prefix: '/auth' });

  void app.register(registerDemoRoutes as any);

  void app.register(registerScimRoutes as any, { prefix: '/scim/v2' });

  void app.register(registerScimAdminRoutes as any, { prefix: '/admin/scim' });

  return app;
}
