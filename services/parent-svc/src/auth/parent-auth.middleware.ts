/**
 * Parent Authentication Hook
 *
 * Verifies JWT tokens and loads parent context.
 * Supports both:
 *  - parent-svc HS256 tokens (legacy, with type: 'parent')
 *  - auth-svc RS256 tokens (platform-wide, with roles: ['PARENT'])
 *
 * When an auth-svc token is used and no parent record exists,
 * one is auto-provisioned from the JWT claims.
 */

import { logger } from '@aivo/ts-observability';
import type { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

import { config } from '../config.js';
import { UnauthorizedException } from '../errors.js';
import { prisma } from '../prisma/prisma.service.js';

export interface ParentContext {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  language: string;
  verified: boolean;
  status: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    parent?: ParentContext;
  }
}

// ── Token payload types ─────────────────────────────────────────────

/** Legacy parent-svc HS256 token */
interface LegacyPayload {
  sub: string;
  type: 'parent';
}

/** Platform auth-svc RS256 token */
interface PlatformPayload {
  sub: string;
  tenant_id: string;
  roles: string[];
  email?: string;
  name?: string;
}

type VerifiedPayload =
  | { kind: 'legacy'; payload: LegacyPayload }
  | { kind: 'platform'; payload: PlatformPayload };

// ── Verification helpers ────────────────────────────────────────────

function verifyLegacy(token: string): LegacyPayload | null {
  try {
    const payload = jwt.verify(token, config.jwtSecret) as Record<string, unknown>;
    if (payload.type === 'parent' && typeof payload.sub === 'string') {
      return payload as unknown as LegacyPayload;
    }
    return null;
  } catch {
    return null;
  }
}

function verifyPlatform(token: string): PlatformPayload | null {
  if (!config.jwtPublicKey) return null;
  try {
    const payload = jwt.verify(token, config.jwtPublicKey, {
      algorithms: ['RS256'],
    }) as Record<string, unknown>;
    if (
      typeof payload.sub === 'string' &&
      Array.isArray(payload.roles) &&
      (payload.roles as string[]).includes('PARENT')
    ) {
      return payload as unknown as PlatformPayload;
    }
    return null;
  } catch {
    return null;
  }
}

function verifyToken(token: string): VerifiedPayload | null {
  // Try RS256 (platform) first, then HS256 (legacy)
  const platform = verifyPlatform(token);
  if (platform) return { kind: 'platform', payload: platform };

  const legacy = verifyLegacy(token);
  if (legacy) return { kind: 'legacy', payload: legacy };

  return null;
}

// ── Auto-provisioning ───────────────────────────────────────────────

async function findOrCreateParent(
  authUserId: string,
  email?: string,
  name?: string,
) {
  // 1. Try lookup by email (most reliable cross-system link)
  if (email) {
    const existing = await prisma.parent.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        givenName: true,
        familyName: true,
        language: true,
        emailVerified: true,
        status: true,
      },
    });
    if (existing) return existing;
  }

  // 2. No existing parent — auto-provision one
  if (!email) {
    // Cannot create without an email
    return null;
  }

  const nameParts = (name ?? '').split(' ').filter(Boolean);
  const givenName = nameParts[0] || 'Parent';
  const familyName = nameParts.slice(1).join(' ') || '';

  logger.info({ authUserId, email }, 'Auto-provisioning parent record from auth-svc token');

  const created = await prisma.parent.create({
    data: {
      email,
      passwordHash: `__auth_svc__:${authUserId}`, // Placeholder — login is via auth-svc
      givenName,
      familyName,
      emailVerified: true, // Already verified through auth-svc
      status: 'active',
    },
    select: {
      id: true,
      email: true,
      givenName: true,
      familyName: true,
      language: true,
      emailVerified: true,
      status: true,
    },
  });

  return created;
}

// ── Main hook ───────────────────────────────────────────────────────

export async function parentAuthHook(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedException('Missing or invalid authorization header');
  }

  const token = authHeader.substring(7);

  try {
    const result = verifyToken(token);
    if (!result) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    let parent: {
      id: string;
      email: string;
      givenName: string;
      familyName: string;
      language: string;
      emailVerified: boolean;
      status: string;
    } | null = null;

    if (result.kind === 'legacy') {
      // Legacy path: look up by parent ID directly
      parent = await prisma.parent.findUnique({
        where: { id: result.payload.sub },
        select: {
          id: true,
          email: true,
          givenName: true,
          familyName: true,
          language: true,
          emailVerified: true,
          status: true,
        },
      });
    } else {
      // Platform path: find by email or auto-provision
      parent = await findOrCreateParent(
        result.payload.sub,
        result.payload.email,
        result.payload.name,
      );
    }

    if (!parent) {
      throw new UnauthorizedException('Parent not found');
    }

    if (parent.status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }

    request.parent = {
      id: parent.id,
      email: parent.email,
      firstName: parent.givenName,
      lastName: parent.familyName,
      language: parent.language || 'en',
      verified: parent.emailVerified,
      status: parent.status,
    };
  } catch (error) {
    if (error instanceof UnauthorizedException) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.warn({ error: message }, 'Invalid parent token');
    throw new UnauthorizedException('Invalid or expired token');
  }
}
