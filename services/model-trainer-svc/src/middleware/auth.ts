import type { FastifyRequest, FastifyReply } from 'fastify';
import { createVerifier } from 'fast-jwt';
import fs from 'fs';
import { config } from '../config.js';

let jwtVerifier: any = null;
try { jwtVerifier = createVerifier({ key: fs.readFileSync(config.jwtPublicKeyPath, 'utf-8'), algorithms: ['RS256'] }); } catch {}

export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const apiKey = request.headers['x-api-key'] as string;
  if (apiKey === config.internalApiKey) {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) return reply.status(400).send({ error: 'X-Tenant-Id required' });
    (request as any).tenantId = tenantId;
    (request as any).userId = 'system:internal';
    return;
  }
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ') || !jwtVerifier) return reply.status(401).send({ error: 'Unauthorized' });
  try {
    const payload = jwtVerifier(authHeader.slice(7));
    (request as any).tenantId = payload.tenantId;
    (request as any).userId = payload.sub;
  } catch { return reply.status(401).send({ error: 'Invalid token' }); }
}
