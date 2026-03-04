/**
 * Parent Login API Route
 *
 * Server-side proxy to auth-svc. Sets httpOnly cookies
 * so that tokens are never exposed to client-side JS.
 */

import { setAuthCookies } from '@aivo/auth-web';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const AUTH_SVC_URL =
  process.env.AUTH_SVC_URL ?? process.env.AUTH_SERVICE_URL ?? 'http://auth-svc:3000';

export async function POST(request: NextRequest) {
  try {
    const { email, password, rememberMe } = (await request.json()) as {
      email?: string;
      password?: string;
      rememberMe?: boolean;
    };

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const upstream = await fetch(`${AUTH_SVC_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, rememberMe }),
    });

    const data = (await upstream.json()) as unknown as {
      accessToken?: string;
      refreshToken?: string;
      user?: Record<string, unknown>;
      message?: string;
      error?: string;
      canResend?: boolean;
    };

    if (!upstream.ok || !data.accessToken) {
      return NextResponse.json(
        {
          error: data.message ?? 'Invalid email or password.',
          code: data.error,
          canResend: data.canResend,
        },
        { status: upstream.status }
      );
    }

    const res = NextResponse.json({
      success: true,
      user: data.user ?? null,
    });

    setAuthCookies(res, data.accessToken, data.refreshToken ?? '');

    return res;
  } catch (error) {
    console.error('[Parent Login] Error:', error);
    return NextResponse.json({ error: 'An error occurred. Please try again.' }, { status: 500 });
  }
}
