import type { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

interface JwtPayload {
  sub: string;
  tenantId: string;
  roles: string[];
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload;
    tenantId?: string;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const apiKey = request.headers['x-api-key'];
  if (apiKey && apiKey === config.internalApiKey) {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(401).send({ error: 'Missing tenant ID for internal request' });
    }
    request.tenantId = tenantId;
    request.user = { sub: 'internal', tenantId, roles: ['service'] };
    return;
  }
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing or invalid authorization header' });
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, config.jwtPublicKey, { algorithms: ['RS256'] }) as JwtPayload;
    request.user = decoded;
    request.tenantId = decoded.tenantId;
  } catch {
    return reply.status(401).send({ error: 'Invalid token' });
  }
}
