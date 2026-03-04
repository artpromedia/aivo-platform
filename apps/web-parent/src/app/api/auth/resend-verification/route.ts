/**
 * Resend Email Verification API Route
 *
 * Proxies to auth-svc /auth/resend-verification.
 * Keeps the auth service URL server-side only.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const AUTH_SVC_URL =
  process.env.AUTH_SVC_URL ?? process.env.AUTH_SERVICE_URL ?? 'http://auth-svc:3000';

export async function POST(request: NextRequest) {
  try {
    const { email } = (await request.json()) as { email?: string };

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const upstream = await fetch(`${AUTH_SVC_URL}/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!upstream.ok) {
      const data = (await upstream.json().catch(() => ({}))) as { message?: string };
      return NextResponse.json(
        { error: data.message ?? 'Failed to resend verification email' },
        { status: upstream.status }
      );
    }

    return NextResponse.json({ message: 'Verification email sent' });
  } catch (error) {
    console.error('[Resend Verification] Error:', error);
    return NextResponse.json(
      { error: 'Unable to connect to authentication service' },
      { status: 503 }
    );
  }
}
