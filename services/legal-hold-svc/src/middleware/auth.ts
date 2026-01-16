/**
 * AIVO Legal Hold Service - Authentication Middleware
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { createVerifier } from 'fast-jwt';
import fs from 'fs';
import path from 'path';

import { config } from '../config.js';
import type { JwtPayload } from '../types/index.js';

let jwtVerifier: ((token: string) => JwtPayload) | null = null;

function loadPublicKey(): void {
  try {
    const keyPath = path.resolve(config.jwtPublicKeyPath);
    const publicKey = fs.readFileSync(keyPath, 'utf-8');
    jwtVerifier = createVerifier({ key: publicKey, algorithms: ['RS256'] });
    console.log('JWT public key loaded successfully');
  } catch (error) {
    console.warn('JWT public key not found, JWT auth will be disabled');
  }
}

loadPublicKey();

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const apiKey = request.headers['x-api-key'] as string;
  if (apiKey && apiKey === config.internalApiKey) {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({
        error: 'Missing tenant ID',
        message: 'X-Tenant-Id header required for internal API calls',
      });
    }
    (request as any).tenantId = tenantId;
    (request as any).userId = 'system:internal';
    (request as any).isInternalCall = true;
    return;
  }

  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Missing or invalid authorization header',
    });
  }

  if (!jwtVerifier) {
    return reply.status(503).send({
      error: 'Service unavailable',
      message: 'Authentication service not configured',
    });
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwtVerifier(token);
    if (!payload.tenantId) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Token missing tenant context',
      });
    }
    (request as any).tenantId = payload.tenantId;
    (request as any).userId = payload.sub;
    (request as any).roles = payload.roles || [];
    (request as any).permissions = payload.permissions || [];
    (request as any).isInternalCall = false;
  } catch (error: any) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
  }
}
