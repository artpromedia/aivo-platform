/**
 * Next.js Edge Middleware — web-learner
 *
 * Protects routes by checking the aivo_access_token cookie.
 * Learner app uses PIN/code login, so we add those to public routes.
 */

import { createAuthMiddleware } from '@aivo/auth-web/middleware';

export const middleware = createAuthMiddleware({
  publicRoutes: [
    '/login',
    '/join',
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
