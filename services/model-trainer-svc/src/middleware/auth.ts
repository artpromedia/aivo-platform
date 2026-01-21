import type { FastifyRequest, FastifyReply } from 'fastify';
import { createVerifier } from 'fast-jwt';
import fs from 'fs';
import { config } from '../config.js';

let jwtVerifier: ReturnType<typeof createVerifier> | null = null;

// Initialize JWT verifier with proper error handling
try {
  if (config.jwtPublicKeyPath && fs.existsSync(config.jwtPublicKeyPath)) {
    jwtVerifier = createVerifier({
      key: fs.readFileSync(config.jwtPublicKeyPath, 'utf-8'),
      algorithms: ['RS256'],
    });
    console.info('[Auth] JWT verifier initialized successfully');
  } else {
    console.warn(`[Auth] JWT public key not found at ${config.jwtPublicKeyPath}. JWT auth will be disabled.`);
  }
} catch (error) {
  console.error('[Auth] Failed to initialize JWT verifier:', error instanceof Error ? error.message : error);
  console.warn('[Auth] JWT authentication will not be available. Use API key auth instead.');
}

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
