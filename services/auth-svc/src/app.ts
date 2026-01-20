import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';

import { authMiddleware } from './middleware/authMiddleware.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerDemoRoutes } from './routes/demo.js';
import { registerMfaRoutes } from './routes/mfa.js';
import { registerSsoRoutes } from './routes/sso.js';

export function createApp() {
  const app = Fastify({ logger: true });

  // Rate limiting - strict limits for auth endpoints to prevent brute force
  void app.register(rateLimit, FastifyRateLimitPresets.authService('auth-svc'));

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

  // Root-level health check for container orchestration
  app.get('/health', async (_request, reply) => {
    return reply.status(200).send({ status: 'ok', service: 'auth-svc' });
  });

  void app.register(authMiddleware as any);

  void app.register(registerAuthRoutes as any, { prefix: '/auth' });

  void app.register(registerSsoRoutes as any, { prefix: '/auth' });

  void app.register(registerMfaRoutes as any, { prefix: '/auth' });

  void app.register(registerDemoRoutes as any);

  return app;
}
