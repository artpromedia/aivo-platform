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

  app.register(authMiddleware);
  app.register(registerAuthRoutes, { prefix: '/auth' });
  app.register(registerSsoRoutes, { prefix: '/auth' });
  app.register(registerDemoRoutes);

  return app;
}
