/**
 * Auth Session API Route
 *
 * Returns the current session including the raw access token
 * for client-side components that need to call backend services.
 */

import { NextResponse } from 'next/server';

import { getAuthSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getAuthSession();

    if (!session) {
      return NextResponse.json({ session: null }, { status: 401 });
    }

    return NextResponse.json({
      session: {
        userId: session.userId,
        tenantId: session.tenantId,
        roles: session.roles,
        name: session.name,
        email: session.email,
        learnerId: session.learnerId,
        accessToken: session.accessToken,
      },
    });
  } catch {
    return NextResponse.json({ session: null }, { status: 500 });
  }
}
