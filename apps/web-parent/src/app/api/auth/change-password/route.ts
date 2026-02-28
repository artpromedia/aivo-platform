/**
 * Change Password API Route
 *
 * Proxies password change requests to auth-svc.
 * Reads the access token from httpOnly cookies and forwards it
 * as a Bearer token so auth-svc can identify the user.
 */

import { ACCESS_COOKIE } from '@aivo/auth-web';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const AUTH_SVC_URL =
  process.env.AUTH_SVC_URL ?? process.env.AUTH_SERVICE_URL ?? 'http://localhost:4001';

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!body.currentPassword || !body.newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required.' },
        { status: 400 }
      );
    }

    const upstream = await fetch(`${AUTH_SVC_URL}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
      }),
    });

    const data = (await upstream.json()) as {
      message?: string;
      error?: string;
    };

    if (!upstream.ok) {
      return NextResponse.json(
        { error: data.error ?? data.message ?? 'Password change failed.' },
        { status: upstream.status }
      );
    }

    return NextResponse.json({ message: data.message ?? 'Password changed successfully.' });
  } catch (error) {
    console.error('[Change Password] Error:', error);
    return NextResponse.json({ error: 'An error occurred. Please try again.' }, { status: 500 });
  }
}
