/**
 * Next.js Edge Middleware — web-teacher
 *
 * Protects routes by checking the aivo_access_token cookie.
 */

import { createAuthMiddleware } from '@aivo/auth-web/middleware';

export const middleware = createAuthMiddleware({
  publicRoutes: [
    '/login',
    '/forgot-password',
    '/api/auth',
    '/api/health',
    '/_next',
    '/favicon.ico',
  ],
  loginPath: '/login',
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
