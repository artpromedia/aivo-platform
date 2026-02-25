/**
 * Next.js Edge Middleware — web-platform-admin
 *
 * Protects routes by checking the aivo_access_token cookie.
 * Detects user locale from cookie/Accept-Language header.
 */

import { createAuthMiddleware } from '@aivo/auth-web/middleware';
import { withLocaleDetection } from '@aivo/i18n/middleware';

const authMiddleware = createAuthMiddleware({
  publicRoutes: ['/login', '/api/auth', '/api/health', '/_next', '/favicon.ico'],
  loginPath: '/login',
});

export const middleware = withLocaleDetection(authMiddleware);

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
