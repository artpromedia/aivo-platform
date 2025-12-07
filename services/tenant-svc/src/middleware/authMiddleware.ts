import { authMiddleware as sharedAuthMiddleware, requireRole, Role } from '@aivo/ts-rbac';
import fp from 'fastify-plugin';

import { getPublicKeyPem } from '../lib/jwt.js';

const auth = sharedAuthMiddleware({ publicKey: getPublicKeyPem() });
const requirePlatformAdmin = requireRole([Role.PLATFORM_ADMIN]);

export const authMiddleware = fp(async (fastify) => {
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.routeOptions?.url === '/tenant/resolve') {
      return;
    }
    await auth(request, reply as any);
    if ((reply as any).sent) return;
    return requirePlatformAdmin(request, reply as any);
  });
});
