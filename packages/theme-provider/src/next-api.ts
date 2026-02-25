/**
 * @aivo/theme-provider/next-api
 *
 * Next.js App Router API route handler for `/api/branding`.
 * Proxies branding requests to tenant-svc so the ThemeProvider
 * can fetch branding without CORS issues.
 *
 * Usage in app/api/branding/route.ts:
 *
 *   export { GET } from '@aivo/theme-provider/next-api';
 */

import { NextResponse, type NextRequest } from 'next/server';

const TENANT_SVC_URL =
  process.env.TENANT_SVC_URL ?? 'http://localhost:4002';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get('domain') ?? request.headers.get('host')?.split(':')[0] ?? '';

  if (!domain) {
    return NextResponse.json(
      { error: 'Missing domain parameter' },
      { status: 400 },
    );
  }

  try {
    const upstream = `${TENANT_SVC_URL}/public/branding?domain=${encodeURIComponent(domain)}`;
    const res = await fetch(upstream, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 }, // Cache for 5 minutes at ISR level
    });

    if (!res.ok) {
      // Return default branding on upstream errors
      const { DEFAULT_THEME } = await import('./index');
      return NextResponse.json(DEFAULT_THEME, {
        headers: {
          'Cache-Control': 'public, max-age=60, s-maxage=300',
        },
      });
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=300',
      },
    });
  } catch {
    // Fallback to default theme if tenant-svc is unreachable
    const { DEFAULT_THEME } = await import('./index');
    return NextResponse.json(DEFAULT_THEME, {
      headers: {
        'Cache-Control': 'public, max-age=30',
      },
    });
  }
}
