/**
 * Next.js Edge Middleware — web-dev-portal
 *
 * Detects user locale from cookie/Accept-Language header.
 */

import { withLocaleDetection } from '@aivo/i18n/middleware';

export const middleware = withLocaleDetection();

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
