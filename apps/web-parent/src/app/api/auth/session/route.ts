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
      session: {
        userId: session.userId,
        tenantId: session.tenantId,
        roles: session.roles,
        name: session.name ?? null,
        email: session.email ?? null,
        learnerId: session.learnerId ?? null,
      },
    });
  } catch (error) {
    console.error('[Session API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
