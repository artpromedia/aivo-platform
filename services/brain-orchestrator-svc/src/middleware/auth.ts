import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { jwtVerify } from 'jose';

import { config } from '../config.js';

export interface AuthenticatedUser {
  sub: string;
  tenantId: string;
  role: string;
  classroomIds?: string[];
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

export const authMiddleware = fp(async (fastify: FastifyInstance) => {
  fastify.decorateRequest('user', undefined);

  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip auth for health check
    if (request.url.startsWith('/health')) {
      return;
    }

    // Test mode bypass
    if (process.env.NODE_ENV === 'test' && request.headers['x-test-user']) {
      try {
        request.user = JSON.parse(request.headers['x-test-user'] as string);
        return;
      } catch {
        // Fall through to normal auth
      }
    }

    // Development mode bypass
    if (process.env.NODE_ENV === 'development' && request.headers['x-dev-user']) {
      try {
        request.user = JSON.parse(request.headers['x-dev-user'] as string);
        return;
      } catch {
        // Fall through to normal auth
      }
    }

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      reply.status(401);
      return reply.send({ error: 'Missing authorization header' });
    }

    const token = authHeader.slice(7);

    try {
      const payload = await verifyToken(token);
      request.user = {
        sub: payload.sub as string,
        tenantId: payload.tenantId as string,
        role: payload.role as string,
        classroomIds: payload.classroomIds as string[] | undefined,
      };
    } catch (error) {
      console.error('Auth error:', error);
      reply.status(401);
      return reply.send({ error: 'Invalid token' });
    }
  });
});

async function verifyToken(token: string): Promise<Record<string, unknown>> {
  const secret = new TextEncoder().encode(config.jwtSecret);

  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as Record<string, unknown>;
  } catch {
    // Try with public key if available
    if (config.jwtPublicKey && config.jwtPublicKey !== 'test-jwt-key') {
      const publicKey = await importPublicKey(config.jwtPublicKey);
      const { payload } = await jwtVerify(token, publicKey);
      return payload as Record<string, unknown>;
    }
    throw new Error('Token verification failed');
  }
}

async function importPublicKey(pem: string): Promise<CryptoKey> {
  const pemContents = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s/g, '');

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  return crypto.subtle.importKey(
    'spki',
    binaryDer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    true,
    ['verify']
  );
}

/**
 * Helper to extract user context from request
 */
export function getContext(request: FastifyRequest): {
  userId: string;
  tenantId: string;
  role: string;
} {
  if (!request.user) {
    throw new Error('User not authenticated');
  }

  return {
    userId: request.user.sub,
    tenantId: request.user.tenantId,
    role: request.user.role,
  };
}

/**
 * Middleware to require specific roles
 */
export function requireRole(...allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      reply.status(401);
      return reply.send({ error: 'Not authenticated' });
    }

    if (!allowedRoles.includes(request.user.role)) {
      reply.status(403);
      return reply.send({ error: 'Insufficient permissions' });
    }
  };
}
