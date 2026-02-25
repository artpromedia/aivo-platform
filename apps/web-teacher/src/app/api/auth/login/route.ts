/**
 * Teacher Login API Route
 *
 * Proxies credentials to auth-svc and sets httpOnly cookies.
 * This keeps tokens out of JavaScript and protects against XSS.
 */

import { setAuthCookies } from '@aivo/auth-web';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const AUTH_SVC_URL = process.env.AUTH_SVC_URL ?? 'http://localhost:4001';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user?: {
    id: string;
    email: string;
    name: string;
    roles: string[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = (await request.json()) as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const response = await fetch(`${AUTH_SVC_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as { message?: string };
      return NextResponse.json(
        { error: errorData.message ?? 'Invalid email or password' },
        { status: response.status }
      );
    }

    const data = (await response.json()) as LoginResponse;

    if (!data.accessToken || !data.refreshToken) {
      return NextResponse.json({ error: 'Invalid response from auth service' }, { status: 502 });
    }

    // Set httpOnly cookies — tokens never touch client JS
    const res = NextResponse.json({
      success: true,
      user: data.user ?? null,
    });

    setAuthCookies(res, data.accessToken, data.refreshToken);
    return res;
  } catch (error) {
    console.error('[Teacher Login] Error:', error);
    return NextResponse.json(
      { error: 'Unable to connect to authentication service' },
      { status: 503 }
    );
  }
}
