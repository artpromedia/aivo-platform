/**
 * Teacher Registration API Route
 *
 * Proxies registration to auth-svc with role: 'TEACHER'.
 * On success the auth-svc sends a verification email — we do NOT
 * set cookies here because the account needs email verification first.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const AUTH_SVC_URL = process.env.AUTH_SVC_URL ?? 'http://localhost:4001';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { email, password, firstName, lastName } = body as {
      email?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
    };

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 },
      );
    }

    const upstream = await fetch(`${AUTH_SVC_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        firstName,
        lastName,
        role: 'TEACHER',
      }),
    });

    const data = (await upstream.json().catch(() => ({}))) as {
      message?: string;
      error?: string;
    };

    if (!upstream.ok) {
      return NextResponse.json(
        { error: data.message ?? data.error ?? 'Registration failed' },
        { status: upstream.status },
      );
    }

    return NextResponse.json(
      { message: 'Account created. Please check your email to verify your account.' },
      { status: 201 },
    );
  } catch (error) {
    console.error('[Teacher Register] Error:', error);
    return NextResponse.json(
      { error: 'Unable to connect to authentication service' },
      { status: 503 },
    );
  }
}
