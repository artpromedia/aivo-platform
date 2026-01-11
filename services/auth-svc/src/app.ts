import Fastify from 'fastify';

import { authMiddleware } from './middleware/authMiddleware.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerDemoRoutes } from './routes/demo.js';
import { registerSsoRoutes } from './routes/sso.js';

export function createApp() {
  const app = Fastify({ logger: true });

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

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
  void app.register(authMiddleware as any);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
  void app.register(registerAuthRoutes as any, { prefix: '/auth' });
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
  void app.register(registerSsoRoutes as any, { prefix: '/auth' });
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
  void app.register(registerDemoRoutes as any);

  return app;
}
