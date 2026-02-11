/**
 * Auth Session API Route
 *
 * Returns the current user session verified via @aivo/auth-web.
 * No more raw base64 JWT decode or dev mocks.
 */

import { getServerSession } from '@aivo/auth-web';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: session.userId,
        email: session.email,
        name: session.name,
        roles: session.roles,
        tenantId: session.tenantId,
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error('[Session API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
