import { Request, Response, NextFunction } from 'express';
import { jwtVerify } from 'jose';
import { config } from '../config.js';

export interface AuthenticatedUser {
  sub: string;
  tenantId: string;
  role: string;
  classroomIds?: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip auth for health check
  if (req.path.startsWith('/health')) {
    next();
    return;
  }

  // Test mode bypass
  if (process.env.NODE_ENV === 'test' && req.headers['x-test-user']) {
    try {
      req.user = JSON.parse(req.headers['x-test-user'] as string);
      next();
      return;
    } catch {
      // Fall through to normal auth
    }
  }

  // Development mode bypass
  if (process.env.NODE_ENV === 'development' && req.headers['x-dev-user']) {
    try {
      req.user = JSON.parse(req.headers['x-dev-user'] as string);
      next();
      return;
    } catch {
      // Fall through to normal auth
    }
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  verifyToken(token)
    .then((payload) => {
      req.user = {
        sub: payload.sub as string,
        tenantId: payload.tenantId as string,
        role: payload.role as string,
        classroomIds: payload.classroomIds as string[] | undefined,
      };
      next();
    })
    .catch((error) => {
      console.error('Auth error:', error);
      res.status(401).json({ error: 'Invalid token' });
    });
}

async function verifyToken(token: string): Promise<Record<string, unknown>> {
  const secret = new TextEncoder().encode(config.jwtSecret);

  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as Record<string, unknown>;
  } catch {
    // Try with public key if available
    if (config.jwtPublicKey && config.jwtPublicKey !== 'test-jwt-key') {
      const publicKey = await importPublicKey(config.jwtPublicKey);
      const { payload } = await jwtVerify(token, publicKey);
      return payload as Record<string, unknown>;
    }
    throw new Error('Token verification failed');
  }
}

async function importPublicKey(pem: string): Promise<CryptoKey> {
  const pemContents = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s/g, '');

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  return crypto.subtle.importKey(
    'spki',
    binaryDer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    true,
    ['verify']
  );
}

/**
 * Helper to extract user context from request
 */
export function getContext(req: Request): { userId: string; tenantId: string; role: string } {
  if (!req.user) {
    throw new Error('User not authenticated');
  }

  return {
    userId: req.user.sub,
    tenantId: req.user.tenantId,
    role: req.user.role,
  };
}

/**
 * Middleware to require specific roles
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}
