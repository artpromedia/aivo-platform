/**
 * Google OAuth Callback Route
 *
 * Handles the OAuth callback from Google:
 * 1. Exchanges the authorization code for tokens via auth-svc
 * 2. Verifies the user has the TEACHER role
 * 3. Sets httpOnly auth cookies
 * 4. Redirects to /dashboard
 */

import { setAuthCookies } from '@aivo/auth-web';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const AUTH_SVC_URL = process.env.AUTH_SVC_URL ?? 'http://localhost:4001';

interface SsoExchangeResponse {
  accessToken: string;
  refreshToken: string;
  user?: {
    id: string;
    email: string;
    name: string;
    roles: string[];
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // Google returned an error (e.g. user denied consent)
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?message=${encodeURIComponent('Google sign-in was cancelled')}`, request.url),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/login?message=Missing%20authorization%20code', request.url),
    );
  }

  try {
    // Exchange code via auth-svc
    const upstream = await fetch(`${AUTH_SVC_URL}/auth/sso/google/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    if (!upstream.ok) {
      const data = (await upstream.json().catch(() => ({}))) as { message?: string };
      const msg = data.message ?? 'Google authentication failed';
      return NextResponse.redirect(
        new URL(`/login?message=${encodeURIComponent(msg)}`, request.url),
      );
    }

    const data = (await upstream.json()) as SsoExchangeResponse;

    if (!data.accessToken || !data.refreshToken) {
      return NextResponse.redirect(
        new URL('/login?message=Invalid%20response%20from%20auth%20service', request.url),
      );
    }

    // Verify user has TEACHER role
    const roles = data.user?.roles ?? [];
    const isTeacher =
      roles.includes('TEACHER') ||
      roles.includes('teacher') ||
      roles.includes('ADMIN');

    if (!isTeacher) {
      return NextResponse.redirect(
        new URL(
          '/login?message=' +
            encodeURIComponent(
              'This account is not registered as a teacher. Please use the correct portal or contact your administrator.',
            ),
          request.url,
        ),
      );
    }

    // Set httpOnly cookies and redirect to dashboard
    const res = NextResponse.redirect(new URL('/dashboard', request.url));
    setAuthCookies(res, data.accessToken, data.refreshToken);
    return res;
  } catch (err) {
    console.error('[Google Callback] Error:', err);
    return NextResponse.redirect(
      new URL('/login?message=Unable%20to%20complete%20Google%20sign-in', request.url),
    );
  }
}
