/**
 * Parent Authentication Middleware
 *
 * Verifies JWT tokens and loads parent context.
 */

import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { verify } from 'jsonwebtoken';
import { logger } from '@aivo/ts-observability';
import { config } from '../config.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface ParentAuthRequest extends Request {
  parent?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    language: string;
    verified: boolean;
    status: string;
  };
}

@Injectable()
export class ParentAuthMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: ParentAuthRequest, _res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);

    try {
      const payload = verify(token, config.jwtSecret) as {
        sub: string;
        type: string;
        iat: number;
        exp: number;
      };

      if (payload.type !== 'parent') {
        throw new UnauthorizedException('Invalid token type');
      }

      const parent = await this.prisma.parent.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
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

      req.parent = {
        id: parent.id,
        email: parent.email,
        firstName: parent.firstName,
        lastName: parent.lastName,
        language: parent.language || 'en',
        verified: parent.emailVerified,
        status: parent.status,
      };

      next();
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.warn('Invalid parent token', { error: message });
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
