/**
 * @aivo/auth-web — Next.js Edge Middleware helper
 *
 * Creates a middleware function that protects routes by checking
 * the `aivo_access_token` cookie. If the token is missing or expired
 * the user is redirected to `/login`.
 *
 * Usage in any app's `middleware.ts`:
 * ```ts
 * export { middleware, config } from '@aivo/auth-web/middleware';
 * ```
 *
 * Or with custom options:
 * ```ts
 * import { createAuthMiddleware } from '@aivo/auth-web/middleware';
 * export const middleware = createAuthMiddleware({
 *   publicRoutes: ['/login', '/register', '/join', '/api/health'],
 *   loginPath: '/login',
 * });
 * export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'] };
 * ```
 */

import { jwtVerify, importSPKI, type KeyLike } from 'jose';
import { type NextRequest, NextResponse } from 'next/server';

export interface AuthMiddlewareOptions {
  /** Routes that don't require authentication (exact or prefix match). Default: ['/login'] */
  publicRoutes?: string[];
  /** Where to redirect unauthenticated users. Default: '/login' */
  loginPath?: string;
  /** Cookie name. Default: 'aivo_access_token' */
  cookieName?: string;
}

const DEFAULT_PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/join',
  '/onboarding',
  '/api/auth',
  '/api/health',
  '/_next',
  '/favicon.ico',
];

let _keyPromise: Promise<KeyLike> | null = null;

function getPublicKey(): Promise<KeyLike> | null {
  const pem = process.env.AUTH_PUBLIC_KEY ?? process.env.JWT_PUBLIC_KEY ?? null;
  if (!pem) return null;
  if (!_keyPromise) {
    _keyPromise = importSPKI(pem, 'RS256');
  }
  return _keyPromise;
}

function isPublicRoute(pathname: string, publicRoutes: string[]): boolean {
  return publicRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'));
}

/**
 * Create an auth-checking middleware with custom options.
 */
export function createAuthMiddleware(options: AuthMiddlewareOptions = {}) {
  const {
    publicRoutes = DEFAULT_PUBLIC_ROUTES,
    loginPath = '/login',
    cookieName = 'aivo_access_token',
  } = options;

  return async function authMiddleware(request: NextRequest): Promise<NextResponse> {
    const { pathname } = request.nextUrl;

    // Always allow public routes and static assets
    if (isPublicRoute(pathname, publicRoutes)) {
      return NextResponse.next();
    }

    const token = request.cookies.get(cookieName)?.value;

    if (!token) {
      const loginUrl = new URL(loginPath, request.url);
      loginUrl.searchParams.set('returnUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verify token if public key is available
    const keyPromise = getPublicKey();
    if (keyPromise) {
      try {
        const key = await keyPromise;
        await jwtVerify(token, key);
      } catch {
        // Token expired or invalid — clear it and redirect
        const loginUrl = new URL(loginPath, request.url);
        loginUrl.searchParams.set('returnUrl', pathname);
        const response = NextResponse.redirect(loginUrl);
        response.cookies.set(cookieName, '', { maxAge: 0, path: '/' });
        return response;
      }
    }
    // If no public key configured, just check cookie presence (middleware can't do
    // full verification without the key — server components will do the real check)

    return NextResponse.next();
  };
}

/**
 * Default middleware instance with standard public routes.
 */
export const middleware = createAuthMiddleware();

/**
 * Default matcher config for Next.js — protects all pages except static assets.
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
