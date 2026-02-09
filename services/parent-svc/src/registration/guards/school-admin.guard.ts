/**
 * School Admin Guard
 *
 * Validates that the request is from an authenticated school administrator
 * with access to the specified school.
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

interface JwtPayload {
  sub: string;
  role: string;
  schoolId?: string;
  permissions?: string[];
  iat?: number;
  exp?: number;
}

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    schoolId?: string;
    permissions?: string[];
  };
}

const SCHOOL_ADMIN_ROLES = ['school_admin', 'principal', 'admin', 'district_admin'];

@Injectable()
export class SchoolAdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // Extract token from Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authorization token required');
    }

    const token = authHeader.substring(7);

    try {
      // Verify and decode token
      const payload = verify(token, config.jwtSecret) as JwtPayload;

      // Check if user has school admin role
      if (!SCHOOL_ADMIN_ROLES.includes(payload.role)) {
        throw new ForbiddenException('School administrator access required');
      }

      // Attach user info to request
      request.user = {
        id: payload.sub,
        role: payload.role,
        schoolId: payload.schoolId,
        permissions: payload.permissions,
      };

      // For endpoints with schoolId parameter, verify access
      const schoolIdParam = request.params.schoolId;
      if (schoolIdParam && payload.schoolId && schoolIdParam !== payload.schoolId) {
        // Allow district admins to access any school
        if (payload.role !== 'district_admin') {
          throw new ForbiddenException('You do not have access to this school');
        }
      }

      // If no schoolId in token but route requires it, use from params
      if (!request.user.schoolId && schoolIdParam) {
        request.user.schoolId = schoolIdParam;
      }

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

      logger.error('School admin auth error', { error });
      throw new UnauthorizedException('Authentication failed');
    }
  }
}

/**
 * Permission-based guard for specific admin actions
 */
@Injectable()
export class SchoolAdminPermissionGuard implements CanActivate {
  constructor(private readonly requiredPermission: string) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // District admins have all permissions
    if (user.role === 'district_admin') {
      return true;
    }

    // Check specific permission
    if (user.permissions?.includes(this.requiredPermission)) {
      return true;
    }

    throw new ForbiddenException(`Missing required permission: ${this.requiredPermission}`);
  }
}

/**
 * Factory function to create permission guards
 */
export function RequirePermission(permission: string) {
  return new SchoolAdminPermissionGuard(permission);
}
