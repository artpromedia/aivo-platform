/**
 * Firebase Email Verify Callback API Route
 *
 * Proxies to auth-svc POST /auth/firebase-verify-callback
 * to sync the verified email status from Firebase to the local DB.
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

    const upstream = await fetch(`${AUTH_SVC_URL}/auth/firebase-verify-callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = (await upstream.json().catch(() => ({}))) as Record<string, unknown>;

    if (!upstream.ok) {
      return NextResponse.json(
        { error: data.error ?? 'Verification sync failed' },
        { status: upstream.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Firebase Verify Callback] Error:', error);
    return NextResponse.json({ error: 'An error occurred during verification' }, { status: 500 });
  }
}
