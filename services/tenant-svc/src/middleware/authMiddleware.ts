import { authMiddleware as sharedAuthMiddleware, requireRole, Role } from '@aivo/ts-rbac';
import fp from 'fastify-plugin';

import { getPublicKeyPem } from '../lib/jwt.js';

const auth = sharedAuthMiddleware({ publicKey: getPublicKeyPem() });
const requirePlatformAdmin = requireRole([Role.PLATFORM_ADMIN]);

// Paths that skip auth entirely (public / service-to-service)
const SKIP_AUTH_PREFIXES = [
  '/tenant/resolve',
  '/districts/',       // Public onboarding endpoints
  '/internal/',        // Service-to-service internal API
  '/health',
  '/healthz',
  '/metrics',
];

export const authMiddleware = fp(async (fastify) => {
  fastify.addHook('preHandler', async (request, reply) => {
    // Skip auth for public & internal routes
    if (SKIP_AUTH_PREFIXES.some((prefix) => request.url.startsWith(prefix))) {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await auth(request as any, reply as any);
    if ((reply as any).sent) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return requirePlatformAdmin(request as any, reply as any);
  });
});
