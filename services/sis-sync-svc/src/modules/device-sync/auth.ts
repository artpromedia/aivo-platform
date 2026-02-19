/**
 * Device Sync Auth Middleware
 *
 * JWT authentication for device sync endpoints using jose.
 *
 * Ported from sync-svc during Sprint 3 consolidation.
 */
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
import type { FastifyInstance, FastifyRequest, FastifyReply, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import * as jose from 'jose';

import { deviceSyncConfig } from './config.js';
import type { DeviceSyncAuthContext } from './types.js';

declare module 'fastify' {
  interface FastifyRequest {
    user: DeviceSyncAuthContext;
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest('user', null);

  fastify.addHook(
    'preHandler',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      // Skip auth for health check
      if (request.url === '/health') {
        return;
      }

      const authHeader = request.headers.authorization;

      if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing or invalid authorization header',
        });
      }

      const token = authHeader.substring(7);

      try {
        const secret = new TextEncoder().encode(deviceSyncConfig.jwt.secret);
        const { payload } = await jose.jwtVerify(token, secret, {
          issuer: deviceSyncConfig.jwt.issuer,
        });

        request.user = {
          userId: payload.sub ?? '',
          tenantId: (payload.tenantId as string) ?? '',
          deviceId: (request.headers['x-device-id'] as string) || 'unknown',
          roles: (payload.roles as string[]) || [],
        };
      } catch {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid or expired token',
        });
      }
    }
  );
};

export const deviceSyncAuthMiddleware: FastifyPluginAsync = fp(authPlugin);
