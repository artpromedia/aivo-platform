/**
 * School Admin Hook
 *
 * Validates that the request is from an authenticated school administrator
 * with access to the specified school.
 * Used as a Fastify preHandler hook.
 */

import { UnauthorizedException, ForbiddenException } from '../../errors.js';

import type { FastifyRequest, FastifyReply } from 'fastify';
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

export interface AdminContext {
  id: string;
  role: string;
  schoolId?: string;
  permissions?: string[];
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AdminContext;
  }
}

const SCHOOL_ADMIN_ROLES = ['school_admin', 'principal', 'admin', 'district_admin'];

export async function schoolAdminHook(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
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
    const params = request.params as Record<string, string>;
    const schoolIdParam = params.schoolId;
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

    logger.error({ error }, 'School admin auth error');
    throw new UnauthorizedException('Authentication failed');
  }
}

/**
 * Factory function to create permission-checking preHandler hooks
 */
export function requirePermission(permission: string) {
  return async function permissionHook(
    request: FastifyRequest,
    _reply: FastifyReply
  ): Promise<void> {
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // District admins have all permissions
    if (user.role === 'district_admin') {
      return;
    }

    // Check specific permission
    if (user.permissions?.includes(permission)) {
      return;
    }

    throw new ForbiddenException(`Missing required permission: ${permission}`);
  };
}
