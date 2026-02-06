/**
 * Authentication middleware for the gradebook service.
 * Validates JWT tokens and extracts user context.
 */

import type { Request, Response, NextFunction } from 'express';
import { jwtVerify } from 'jose';

import { config } from '../config.js';

export interface AuthenticatedUser {
  sub: string;
  tenantId: string;
  role: string;
  classroomIds?: string[];
  learnerId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * JWT authentication middleware for Express
 * Requires JWT_SECRET environment variable in production
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip auth for health checks
  if (req.path.startsWith('/health') || req.path === '/ready') {
    next();
    return;
  }

  // In tests, allow bypassing JWT verification
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
    const testUserHeader = req.headers['x-test-user'] as string | undefined;
    if (testUserHeader) {
      try {
        req.user = JSON.parse(testUserHeader) as AuthenticatedUser;
        next();
        return;
      } catch {
        // Fall through to JWT verification
      }
    }
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  const secret = new TextEncoder().encode(config.jwtSecret);

  jwtVerify(token, secret)
    .then(({ payload }) => {
      req.user = {
        sub: payload.sub as string,
        tenantId: payload.tenantId as string,
        role: payload.role as string,
        classroomIds: payload.classroomIds as string[] | undefined,
        learnerId: payload.learnerId as string | undefined,
      };
      next();
    })
    .catch(() => {
      res.status(401).json({ error: 'Invalid token' });
    });
}

/**
 * Require specific roles for access
 */
export function requireRoles(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}
