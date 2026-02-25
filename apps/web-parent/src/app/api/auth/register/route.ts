import { setAuthCookies } from '@aivo/auth-web';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Parent Registration API Route
 *
 * Proxies registration to auth-svc and sets httpOnly cookies.
 * Dev mock user generation has been removed for security.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { email, password } = body as { email?: string; password?: string };

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }

    // Always proxy to auth service
    const authServiceUrl =
      process.env.AUTH_SVC_URL ?? process.env.AUTH_SERVICE_URL ?? 'http://localhost:4001';
    const upstream = await fetch(`${authServiceUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = (await upstream.json()) as {
      accessToken?: string;
      refreshToken?: string;
      user?: Record<string, unknown>;
      message?: string;
    };

    if (!upstream.ok) {
      return NextResponse.json(
        { message: data.message ?? 'Registration failed' },
        { status: upstream.status }
      );
    }

    const res = NextResponse.json({
      user: data.user ?? null,
      message: 'Account created successfully',
    });

    // Set httpOnly cookies if tokens were returned
    if (data.accessToken) {
      setAuthCookies(res, data.accessToken, data.refreshToken ?? '');
    }

    return res;
  } catch (error) {
    console.error('[Parent Register] Error:', error);
    return NextResponse.json({ message: 'An error occurred during registration' }, { status: 500 });
  }
}
