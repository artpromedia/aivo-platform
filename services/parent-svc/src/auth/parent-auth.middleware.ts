/**
 * Parent Authentication Hook
 *
 * Verifies JWT tokens and loads parent context.
 * Used as a Fastify preHandler hook.
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

export async function parentAuthHook(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedException('Missing or invalid authorization header');
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, config.jwtSecret) as {
      sub: string;
      type: string;
      iat: number;
      exp: number;
    };

    if (payload.type !== 'parent') {
      throw new UnauthorizedException('Invalid token type');
    }

    const parent = await prisma.parent.findUnique({
      where: { id: payload.sub },
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
