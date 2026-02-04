import fs from 'node:fs';

import { createVerifier, type VerifierOptions } from 'fast-jwt';
import type { FastifyRequest, FastifyReply } from 'fastify';

import { config } from '../config.js';

declare module 'fastify' {
  interface FastifyRequest {
    tenantId: string;
    userId: string;
  }
}

interface JWTPayload {
  tenantId: string;
  sub: string;
}

let jwtVerifier: ((token: string) => JWTPayload) | null = null;
try {
  const publicKey = fs.readFileSync(config.jwtPublicKeyPath, 'utf-8');
  jwtVerifier = createVerifier({ key: publicKey, algorithms: ['RS256'] } as VerifierOptions) as (
    token: string
  ) => JWTPayload;
} catch {
  /* JWT disabled */
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const apiKey = request.headers['x-api-key'] as string;
  if (apiKey === config.internalApiKey) {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) return reply.status(400).send({ error: 'X-Tenant-Id required' });
    request.tenantId = tenantId;
    request.userId = 'system:internal';
    return;
  }
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ') || !jwtVerifier)
    return reply.status(401).send({ error: 'Unauthorized' });
  try {
    const payload = jwtVerifier(authHeader.slice(7));
    request.tenantId = payload.tenantId;
    request.userId = payload.sub;
  } catch {
    return reply.status(401).send({ error: 'Invalid token' });
  }
}
