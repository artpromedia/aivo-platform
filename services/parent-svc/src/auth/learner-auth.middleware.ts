/**
 * Learner Authentication Hook
 *
 * Verifies JWT tokens for learner authentication.
 * Used as a Fastify preHandler hook for endpoints called from learner apps.
 */

import { logger } from '@aivo/ts-observability';
import type { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

import { config } from '../config.js';
import { UnauthorizedException } from '../errors.js';

export interface LearnerContext {
  id: string;
  givenName: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    learner?: LearnerContext;
  }
}

export async function learnerAuthHook(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedException('Missing or invalid authorization header');
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, config.jwtSecret) as {
      sub: string;
      type: string;
      givenName?: string;
      iat: number;
      exp: number;
    };

    if (payload.type !== 'learner') {
      throw new UnauthorizedException('Invalid token type - expected learner token');
    }

    request.learner = {
      id: payload.sub,
      givenName: payload.givenName || 'Learner',
    };

    logger.debug({ learnerId: request.learner.id }, 'Learner authenticated');
  } catch (error) {
    if (error instanceof UnauthorizedException) {
      throw error;
    }
    logger.error({ error: String(error) }, 'Learner auth error');
    throw new UnauthorizedException('Invalid or expired token');
  }
}
