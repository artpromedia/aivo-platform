/**
 * @aivo/auth-web — Server-side session verification
 *
 * Provides JWT verification using RS256 + jose, reading the
 * `aivo_access_token` httpOnly cookie set by auth-svc.
 *
 * Usage in a Next.js server component or API route:
 *   import { getServerSession, requireSession } from '@aivo/auth-web';
 *   const session = await getServerSession();
 */

import { importSPKI, jwtVerify, type JWTPayload, type KeyLike } from 'jose';

// ─── Cookie name ──────────────────────────────────────────────────────────────
export const ACCESS_COOKIE = 'aivo_access_token';
export const REFRESH_COOKIE = 'aivo_refresh_token';

// ─── Session type ─────────────────────────────────────────────────────────────
export interface AuthSession {
  /** auth-svc user id (JWT `sub`) */
  userId: string;
  /** Multi-tenant id (JWT `tenant_id`) */
  tenantId: string;
  /** RBAC roles array */
  roles: string[];
  /** Display name (may be null for learners with PIN login) */
  name: string | null;
  /** Email address (null for child learners) */
  email: string | null;
  /** Learner-specific id when role includes LEARNER */
  learnerId: string | null;
  /** Raw access token for forwarding to backend services */
  accessToken: string;
}

// ─── Public key singleton ─────────────────────────────────────────────────────
let _keyPromise: Promise<KeyLike> | null = null;

function getPublicKey(): Promise<KeyLike> | null {
  const pem = process.env.AUTH_PUBLIC_KEY ?? process.env.JWT_PUBLIC_KEY ?? null;

  if (!pem) return null;

  if (!_keyPromise) {
    _keyPromise = importSPKI(pem, 'RS256');
  }
  return _keyPromise;
}

/**
 * Reset the cached public key (for testing).
 */
export function _resetKeyCache(): void {
  _keyPromise = null;
}

// ─── Token verification ───────────────────────────────────────────────────────

/**
 * Verify a raw JWT string and return the session payload.
 * Returns `null` on any validation failure (expired, bad signature, etc.)
 */
export async function verifyToken(token: string): Promise<AuthSession | null> {
  try {
    const keyPromise = getPublicKey();
    if (!keyPromise) {
      // No public key configured — cannot verify tokens
      return null;
    }

    const key = await keyPromise;
    const { payload } = await jwtVerify(token, key);

    return payloadToSession(payload, token);
  } catch {
    return null;
  }
}

function payloadToSession(payload: JWTPayload, token: string): AuthSession | null {
  const sub = payload.sub;
  const tenantId = (payload as Record<string, unknown>).tenant_id as string | undefined;

  if (typeof sub !== 'string' || typeof tenantId !== 'string') {
    return null;
  }

  const roles = Array.isArray(payload.roles)
    ? (payload.roles as string[]).filter((r) => typeof r === 'string')
    : [];

  return {
    userId: sub,
    tenantId,
    roles,
    name: typeof payload.name === 'string' ? payload.name : null,
    email: typeof payload.email === 'string' ? payload.email : null,
    learnerId:
      typeof (payload as Record<string, unknown>).learnerId === 'string'
        ? ((payload as Record<string, unknown>).learnerId as string)
        : null,
    accessToken: token,
  };
}

// ─── Next.js server helpers ───────────────────────────────────────────────────

/**
 * Get the current session from cookies (server components / route handlers).
 *
 * ```ts
 * import { getServerSession } from '@aivo/auth-web';
 * const session = await getServerSession();
 * if (!session) redirect('/login');
 * ```
 */
export async function getServerSession(): Promise<AuthSession | null> {
  // Dynamic import so this module can also be imported from middleware
  // (which doesn't have access to `next/headers`).

  const { cookies } = await import('next/headers');
  // In Next.js 14 cookies() is synchronous; Next.js 15+ makes it async.

  const store = cookies();

  const token: string | undefined = store.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Require a valid session — throws `redirect('/login')` via next/navigation
 * if the user is not authenticated.
 */
export async function requireSession(): Promise<AuthSession> {
  const session = await getServerSession();
  if (!session) {
    const { redirect } = await import('next/navigation');
    redirect('/login');
  }
  return session;
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

interface CookieTarget {
  cookies: {
    set(name: string, value: string, opts?: Record<string, unknown>): void;
  };
}

const cookieOpts = (isProd: boolean) => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: isProd,
  path: '/',
});

/**
 * Set auth cookies on a NextResponse (used by login API routes).
 */
export function setAuthCookies(res: CookieTarget, accessToken: string, refreshToken: string): void {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookies.set(ACCESS_COOKIE, accessToken, cookieOpts(isProd));
  res.cookies.set(REFRESH_COOKIE, refreshToken, {
    ...cookieOpts(isProd),
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

/**
 * Clear auth cookies (used by logout API routes).
 */
export function clearAuthCookies(res: CookieTarget): void {
  res.cookies.set(ACCESS_COOKIE, '', { httpOnly: true, maxAge: 0, path: '/' });
  res.cookies.set(REFRESH_COOKIE, '', { httpOnly: true, maxAge: 0, path: '/' });
}
