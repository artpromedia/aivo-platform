/**
 * Learner Authentication Middleware
 *
 * Verifies JWT tokens for learner authentication.
 * Used by endpoints called from web-learner/mobile-learner apps.
 */

import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '@aivo/ts-observability';
import { config } from '../config.js';

export interface LearnerAuthRequest extends Request {
  learner?: {
    id: string;
    givenName: string;
  };
}

/**
 * Request type for routes protected by LearnerAuthMiddleware.
 * After middleware runs, learner is guaranteed to be present.
 */
export interface AuthenticatedLearnerRequest extends Request {
  learner: {
    id: string;
    givenName: string;
  };
}

@Injectable()
export class LearnerAuthMiddleware implements NestMiddleware {
  async use(req: LearnerAuthRequest, _res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

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

      req.learner = {
        id: payload.sub,
        givenName: payload.givenName || 'Learner',
      };

      logger.debug('Learner authenticated', { learnerId: req.learner.id });

      next();
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      logger.error('Learner auth error', { error: String(error) });
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
