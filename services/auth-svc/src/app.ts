import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';

import { registerScopeRoutes } from './graphql/resolvers.js';
import { authMiddleware } from './middleware/authMiddleware.js';
import { cookiePlugin } from './plugins/cookie.plugin.js';
import { csrfPlugin } from './plugins/csrf.plugin.js';
import { registerEnhancedAuthRoutes } from './routes/auth.enhanced.js';
import { registerDemoRoutes } from './routes/demo.js';
import { registerFirebaseVerifyRoutes } from './routes/firebase-verify.js';
import { healthRoutes } from './routes/health.js';
import { registerMfaRoutes } from './routes/mfa.js';
import { registerScimAdminRoutes } from './routes/scim-admin.routes.js';
import { registerSsoRoutes } from './routes/sso.js';
import { registerScimRoutes } from './scim/routes.js';
import { initKeyRotationSchedule } from './security/jwt-rotation.service.js';
import { securityHeadersPlugin } from './security/security-headers.plugin.js';

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
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-CSRF-Token'],
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

  // Security plugins (must be registered before routes)
  void app.register(cookiePlugin as any);
  void app.register(csrfPlugin as any);
  void app.register(securityHeadersPlugin as any);

  // Health check routes (must be registered early, before auth middleware)
  void app.register(healthRoutes as any);

  void app.register(authMiddleware as any);

  void app.register(registerEnhancedAuthRoutes as any, { prefix: '/auth' });

  void app.register(registerFirebaseVerifyRoutes as any, { prefix: '/auth' });

  void app.register(registerSsoRoutes as any, { prefix: '/auth' });

  void app.register(registerMfaRoutes as any, { prefix: '/auth' });

  void app.register(registerScopeRoutes as any, { prefix: '/auth' });

  void app.register(registerDemoRoutes as any);

  // SCIM 2.0 directory sync (bearer-token authenticated, separate from JWT auth)
  void app.register(registerScimRoutes as any);

  // SCIM admin token management (JWT-authenticated, requires DISTRICT_ADMIN+)
  void app.register(registerScimAdminRoutes as any);

  // Initialize JWT key rotation schedule (90-day cycle)
  initKeyRotationSchedule();

  return app;
}
