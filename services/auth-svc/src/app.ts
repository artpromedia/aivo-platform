import cors from '@fastify/cors';
import { FastifyRateLimitPresets } from '@aivo/ts-api-utils';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';

import { authMiddleware } from './middleware/authMiddleware.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerDemoRoutes } from './routes/demo.js';
import { registerMfaRoutes } from './routes/mfa.js';
import { registerSsoRoutes } from './routes/sso.js';

export function createApp() {
  const app = Fastify({ logger: true });

  // CORS configuration for local development
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
