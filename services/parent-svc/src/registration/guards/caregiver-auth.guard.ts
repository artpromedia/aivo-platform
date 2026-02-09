/**
 * Caregiver Authentication Guard
 *
 * Validates JWT tokens for authenticated caregiver endpoints.
 * Attaches caregiver info to the request object.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';
import jwt from 'jsonwebtoken';
const { verify } = jwt;
import { logger } from '@aivo/ts-observability';

import { config } from '../../config.js';
import { PrismaService } from '../../prisma/prisma.service.js';

interface JwtPayload {
  sub: string;
  type: string;
  email?: string;
  iat?: number;
  exp?: number;
}

interface CaregiverAuthRequest extends Request {
  caregiver?: {
    id: string;
    email: string;
    givenName: string;
    familyName: string;
  };
}

@Injectable()
export class CaregiverAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<CaregiverAuthRequest>();

    // Extract token from Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authorization token required');
    }

    const token = authHeader.substring(7);

    try {
      // Verify and decode token
      const payload = verify(token, config.jwtSecret) as JwtPayload;

      // Verify token type is for caregiver
      if (payload.type !== 'caregiver') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Load caregiver from database
      const caregiver = await this.prisma.caregiver.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          givenName: true,
          familyName: true,
          status: true,
        },
      });

      if (!caregiver) {
        throw new UnauthorizedException('Caregiver not found');
      }

      // Check account status
      if (caregiver.status !== 'active') {
        throw new ForbiddenException('Account is not active');
      }

      // Attach caregiver to request
      request.caregiver = {
        id: caregiver.id,
        email: caregiver.email,
        givenName: caregiver.givenName,
        familyName: caregiver.familyName,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }

      if (error instanceof Error && error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired');
      }

      if (error instanceof Error && error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token');
      }

      logger.error('Caregiver auth error', { error });
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
