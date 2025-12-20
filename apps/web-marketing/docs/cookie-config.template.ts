/**
 * Cookie Configuration for Cross-Domain Authentication
 *
 * This configuration ensures cookies are properly shared between:
 * - Marketing site (www.aivolearning.com / localhost:3001)
 * - Main app (app.aivolearning.com / localhost:3000)
 *
 * Use this in your auth service or API routes that set cookies.
 */

// ============================================
// TYPES
// ============================================

interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  domain?: string;
  path: string;
  maxAge: number;
}

// ============================================
// CONFIGURATION
// ============================================

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Cookie options for access token
 * Short-lived, used for API authentication
 */
export const accessTokenCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  domain: isProduction ? '.aivolearning.com' : undefined,
  path: '/',
  maxAge: 60 * 15, // 15 minutes
};

/**
 * Cookie options for refresh token
 * Long-lived, used to obtain new access tokens
 */
export const refreshTokenCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  domain: isProduction ? '.aivolearning.com' : undefined,
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

/**
 * Cookie options for session ID
 * Alternative to JWT tokens
 */
export const sessionCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  domain: isProduction ? '.aivolearning.com' : undefined,
  path: '/',
  maxAge: 60 * 60 * 24 * 30, // 30 days
};

// ============================================
// COOKIE NAMES
// ============================================

export const COOKIE_NAMES = {
  accessToken: 'aivo_access_token',
  refreshToken: 'aivo_refresh_token',
  session: 'aivo_session',
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Convert cookie options to a cookie string for Set-Cookie header
 */
export function buildCookieString(name: string, value: string, options: CookieOptions): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.domain) parts.push(`Domain=${options.domain}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.maxAge) parts.push(`Max-Age=${options.maxAge}`);

  return parts.join('; ');
}

/**
 * Build a cookie string for clearing/deleting a cookie
 */
export function buildClearCookieString(name: string, options: Partial<CookieOptions> = {}): string {
  const clearOptions: CookieOptions = {
    httpOnly: options.httpOnly ?? true,
    secure: options.secure ?? isProduction,
    sameSite: options.sameSite ?? (isProduction ? 'none' : 'lax'),
    domain: options.domain ?? (isProduction ? '.aivolearning.com' : undefined),
    path: options.path ?? '/',
    maxAge: 0, // Expires immediately
  };

  return buildCookieString(name, '', clearOptions);
}

// ============================================
// USAGE EXAMPLES
// ============================================

/**
 * Example: Setting cookies in a Next.js API route
 *
 * ```typescript
 * import { NextApiRequest, NextApiResponse } from 'next';
 * import {
 *   COOKIE_NAMES,
 *   accessTokenCookieOptions,
 *   refreshTokenCookieOptions,
 *   buildCookieString
 * } from './cookie-config';
 *
 * export default function handler(req: NextApiRequest, res: NextApiResponse) {
 *   // After successful authentication...
 *   const accessToken = generateAccessToken(user);
 *   const refreshToken = generateRefreshToken(user);
 *
 *   res.setHeader('Set-Cookie', [
 *     buildCookieString(COOKIE_NAMES.accessToken, accessToken, accessTokenCookieOptions),
 *     buildCookieString(COOKIE_NAMES.refreshToken, refreshToken, refreshTokenCookieOptions),
 *   ]);
 *
 *   res.json({ success: true });
 * }
 * ```
 */

/**
 * Example: Setting cookies in a Fastify route
 *
 * ```typescript
 * import { FastifyReply } from 'fastify';
 * import { COOKIE_NAMES, accessTokenCookieOptions } from './cookie-config';
 *
 * async function loginHandler(req, reply: FastifyReply) {
 *   const token = await generateToken(user);
 *
 *   reply.setCookie(COOKIE_NAMES.accessToken, token, {
 *     httpOnly: accessTokenCookieOptions.httpOnly,
 *     secure: accessTokenCookieOptions.secure,
 *     sameSite: accessTokenCookieOptions.sameSite,
 *     domain: accessTokenCookieOptions.domain,
 *     path: accessTokenCookieOptions.path,
 *     maxAge: accessTokenCookieOptions.maxAge,
 *   });
 *
 *   return { success: true };
 * }
 * ```
 */

export default {
  COOKIE_NAMES,
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
  sessionCookieOptions,
  buildCookieString,
  buildClearCookieString,
};
