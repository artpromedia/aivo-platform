/**
 * Next.js Locale Middleware
 *
 * Detects the user's preferred locale from cookie, Accept-Language header,
 * or URL query parameter and forwards it via a request header so that
 * server components / layouts can read it.
 *
 * Usage in each app's middleware.ts:
 *   import { withLocaleDetection } from '@aivo/i18n/middleware';
 *   export default withLocaleDetection(existingMiddleware);
 */

import { NextResponse, type NextRequest, type NextMiddleware } from 'next/server';

const UI_LOCALES = ['en', 'es', 'fr', 'de', 'pt', 'ar', 'zh', 'ja', 'ko', 'hi'] as const;
type UILocale = (typeof UI_LOCALES)[number];

const LOCALE_COOKIE = 'NEXT_LOCALE';
const LOCALE_HEADER = 'x-aivo-locale';

function isUILocale(value: string): value is UILocale {
  return (UI_LOCALES as readonly string[]).includes(value);
}

function resolveLocale(request: NextRequest): UILocale {
  // 1. Explicit cookie
  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  if (cookie && isUILocale(cookie)) return cookie;

  // 2. URL query param (?locale=fr)
  const query = request.nextUrl.searchParams.get('locale');
  if (query && isUILocale(query)) return query;

  // 3. Accept-Language header
  const accept = request.headers.get('accept-language');
  if (accept) {
    const candidates = accept
      .split(',')
      .map((entry) => {
        const [lang, q] = entry.trim().split(';q=');
        return { lang: lang.trim().toLowerCase(), quality: q ? parseFloat(q) : 1 };
      })
      .sort((a, b) => b.quality - a.quality);

    for (const { lang } of candidates) {
      if (isUILocale(lang)) return lang;
      const prefix = lang.split('-')[0];
      if (isUILocale(prefix)) return prefix;
    }
  }

  return 'en';
}

/**
 * Wrap an existing Next.js middleware with locale detection.
 *
 * The locale is injected as an `x-aivo-locale` request header and also
 * set as a `NEXT_LOCALE` cookie (if not already present) so that subsequent
 * requests are consistent.
 */
export function withLocaleDetection(middleware?: NextMiddleware): NextMiddleware {
  return async (request: NextRequest, event) => {
    const locale = resolveLocale(request);

    // Set the locale header on the request so server components can read it
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(LOCALE_HEADER, locale);

    // Call the inner middleware if it exists
    let response: NextResponse | Response | undefined;
    if (middleware) {
      // Clone request with added header
      const modifiedRequest = new NextRequest(request.url, {
        headers: requestHeaders,
        method: request.method,
        body: request.body,
      });
      // Copy over cookies
      for (const [name, cookie] of request.cookies.getAll().entries()) {
        modifiedRequest.cookies.set(cookie.name, cookie.value);
      }
      response = (await middleware(modifiedRequest, event)) as NextResponse | undefined;
    }

    // If middleware returned undefined, create a default response
    if (!response) {
      response = NextResponse.next({
        request: { headers: requestHeaders },
      });
    }

    // Ensure the locale header is on the response too
    if (response instanceof NextResponse) {
      response.headers.set(LOCALE_HEADER, locale);
      // Set cookie if not already present
      if (!request.cookies.has(LOCALE_COOKIE)) {
        response.cookies.set(LOCALE_COOKIE, locale, {
          path: '/',
          maxAge: 365 * 24 * 60 * 60,
          sameSite: 'lax',
        });
      }
    }

    return response;
  };
}

export { LOCALE_COOKIE, LOCALE_HEADER, UI_LOCALES, resolveLocale, isUILocale };
export type { UILocale };
