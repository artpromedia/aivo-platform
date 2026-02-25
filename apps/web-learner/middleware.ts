/**
 * Next.js Edge Middleware — web-learner
 *
 * Protects routes by checking the aivo_access_token cookie.
 * Detects user locale from cookie/Accept-Language header.
 * Learner app uses PIN/code login, so we add those to public routes.
 */

import { createAuthMiddleware } from '@aivo/auth-web/middleware';
import { withLocaleDetection } from '@aivo/i18n/middleware';

const authMiddleware = createAuthMiddleware({
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

export const middleware = withLocaleDetection(authMiddleware);

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
