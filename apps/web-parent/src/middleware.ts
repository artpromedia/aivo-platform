/**
 * Next.js Edge Middleware — web-parent
 *
 * Protects routes by checking the aivo_access_token cookie.
 */

import { createAuthMiddleware } from '@aivo/auth-web/middleware';

export const middleware = createAuthMiddleware({
  publicRoutes: [
    '/login',
    '/register',
    '/forgot-password',
    '/onboarding',
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
