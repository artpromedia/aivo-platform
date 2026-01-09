/**
 * CSRF Protection Middleware
 *
 * Implements Cross-Site Request Forgery protection for non-SSO forms.
 * Uses the Synchronizer Token Pattern (STP) with double-submit cookie verification.
 *
 * SECURITY FIX (VER-003): Add CSRF protection for standard form submissions
 *
 * How it works:
 * 1. Server generates a random CSRF token and sets it as a cookie
 * 2. Client must include the token in both cookie AND header/body
 * 3. Server validates that both values match
 *
 * This middleware protects against CSRF attacks by ensuring requests
 * originate from our own frontend, not malicious third-party sites.
 */

import { randomBytes } from 'node:crypto';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

export interface CsrfConfig {
  /** Cookie name for CSRF token */
  cookieName: string;
  /** Header name to check for CSRF token */
  headerName: string;
  /** Token length in bytes (will be hex encoded, so 32 bytes = 64 chars) */
  tokenLength: number;
  /** Cookie secure flag (should be true in production) */
  secure: boolean;
  /** Cookie same-site attribute */
  sameSite: 'strict' | 'lax' | 'none';
  /** Paths to exclude from CSRF protection (e.g., SSO callbacks) */
  excludePaths: string[];
  /** HTTP methods that require CSRF protection */
  protectedMethods: string[];
  /** Enable for this environment */
  enabled: boolean;
}

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const DEFAULT_CONFIG: CsrfConfig = {
  cookieName: '__csrf_token',
  headerName: 'x-csrf-token',
  tokenLength: 32,
  secure: IS_PRODUCTION,
  sameSite: 'strict',
  excludePaths: [
    '/auth/sso/callback',
    '/auth/saml/callback',
    '/auth/oidc/callback',
    '/api/webhooks/',
    '/health',
    '/ready',
    '/metrics',
  ],
  protectedMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  enabled: true,
};

// ══════════════════════════════════════════════════════════════════════════════
// TOKEN GENERATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a cryptographically secure CSRF token.
 */
export function generateCsrfToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ══════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a path should be excluded from CSRF protection.
 */
function isExcludedPath(path: string, excludePaths: string[]): boolean {
  return excludePaths.some((excludedPath) => {
    if (excludedPath.endsWith('/')) {
      return path.startsWith(excludedPath);
    }
    return path === excludedPath;
  });
}

/**
 * Create CSRF protection middleware for Fastify.
 *
 * Usage:
 * ```typescript
 * import { createCsrfMiddleware } from './csrf.middleware';
 *
 * const csrfMiddleware = createCsrfMiddleware();
 *
 * // Apply to protected routes
 * fastify.addHook('preHandler', csrfMiddleware);
 *
 * // Or selectively
 * fastify.post('/api/submit', { preHandler: csrfMiddleware }, handler);
 * ```
 */
export function createCsrfMiddleware(config: Partial<CsrfConfig> = {}) {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  return async function csrfMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    // Skip if disabled
    if (!fullConfig.enabled) {
      return;
    }

    const method = request.method.toUpperCase();
    const path = request.url.split('?')[0]; // Remove query string

    // Skip excluded paths
    if (isExcludedPath(path, fullConfig.excludePaths)) {
      return;
    }

    // For non-protected methods (GET, HEAD, OPTIONS), set/refresh the token cookie
    if (!fullConfig.protectedMethods.includes(method)) {
      // Get existing token from cookie or generate new one
      const existingToken = (request.cookies as Record<string, string>)?.[fullConfig.cookieName];
      const token = existingToken || generateCsrfToken(fullConfig.tokenLength);

      // Set/refresh the cookie
      reply.setCookie(fullConfig.cookieName, token, {
        httpOnly: false, // Must be readable by JavaScript
        secure: fullConfig.secure,
        sameSite: fullConfig.sameSite,
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
      });

      // Add token to response header for convenience
      reply.header('x-csrf-token', token);
      return;
    }

    // For protected methods, validate the token
    const cookieToken = (request.cookies as Record<string, string>)?.[fullConfig.cookieName];
    const headerToken = (request.headers as Record<string, string>)[fullConfig.headerName.toLowerCase()];

    // Also check body for form submissions
    const bodyToken = (request.body as Record<string, unknown>)?._csrf as string | undefined;

    const submittedToken = headerToken || bodyToken;

    // Validate tokens exist
    if (!cookieToken) {
      console.warn(
        JSON.stringify({
          event: 'csrf_validation_failed',
          reason: 'missing_cookie_token',
          method,
          path,
          ip: request.ip,
          timestamp: new Date().toISOString(),
        })
      );
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'CSRF token missing. Please refresh the page and try again.',
        code: 'CSRF_TOKEN_MISSING',
      });
    }

    if (!submittedToken) {
      console.warn(
        JSON.stringify({
          event: 'csrf_validation_failed',
          reason: 'missing_submitted_token',
          method,
          path,
          ip: request.ip,
          timestamp: new Date().toISOString(),
        })
      );
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'CSRF token missing from request. Please refresh the page and try again.',
        code: 'CSRF_TOKEN_MISSING',
      });
    }

    // Validate tokens match using constant-time comparison
    if (!safeCompare(cookieToken, submittedToken)) {
      console.warn(
        JSON.stringify({
          event: 'csrf_validation_failed',
          reason: 'token_mismatch',
          method,
          path,
          ip: request.ip,
          timestamp: new Date().toISOString(),
        })
      );
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'CSRF token invalid. Please refresh the page and try again.',
        code: 'CSRF_TOKEN_INVALID',
      });
    }

    // Token valid - continue
    console.debug(
      JSON.stringify({
        event: 'csrf_validation_success',
        method,
        path,
        timestamp: new Date().toISOString(),
      })
    );
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FOR GENERATING TOKENS IN ROUTES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a CSRF token and set it as a cookie.
 * Use this in routes that need to provide a token to the frontend.
 *
 * Usage:
 * ```typescript
 * fastify.get('/api/csrf-token', async (request, reply) => {
 *   const token = setCsrfToken(reply);
 *   return { token };
 * });
 * ```
 */
export function setCsrfToken(
  reply: FastifyReply,
  config: Partial<CsrfConfig> = {}
): string {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const token = generateCsrfToken(fullConfig.tokenLength);

  reply.setCookie(fullConfig.cookieName, token, {
    httpOnly: false,
    secure: fullConfig.secure,
    sameSite: fullConfig.sameSite,
    path: '/',
    maxAge: 60 * 60 * 24,
  });

  return token;
}

// ══════════════════════════════════════════════════════════════════════════════
// FASTIFY PLUGIN
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Register CSRF protection as a Fastify plugin.
 *
 * Usage:
 * ```typescript
 * import { csrfPlugin } from './csrf.middleware';
 *
 * fastify.register(csrfPlugin, { secure: true });
 * ```
 */
export async function csrfPlugin(
  fastify: FastifyInstance,
  options: Partial<CsrfConfig> = {}
): Promise<void> {
  const middleware = createCsrfMiddleware(options);

  // Add as a preHandler hook
  fastify.addHook('preHandler', middleware);

  // Add route to get CSRF token
  fastify.get('/api/csrf-token', async (request, reply) => {
    const token = setCsrfToken(reply, options);
    return { csrfToken: token };
  });

  console.info('[CSRF] CSRF protection middleware registered');
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export const CsrfMiddleware = {
  create: createCsrfMiddleware,
  generateToken: generateCsrfToken,
  setToken: setCsrfToken,
  plugin: csrfPlugin,
  defaultConfig: DEFAULT_CONFIG,
};
