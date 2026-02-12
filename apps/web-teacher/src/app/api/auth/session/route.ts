/**
 * Teacher Auth Session API Route
 *
 * Returns the current server-verified session for client components.
 */

import { getServerSession } from '@aivo/auth-web';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({ session: null }, { status: 401 });
    }

    // Return non-sensitive session info for client rendering
    return NextResponse.json({
      session: {
        userId: session.userId,
        tenantId: session.tenantId,
        roles: session.roles,
        name: session.name,
        email: session.email,
        learnerId: session.learnerId,
      },
    });
  } catch (error) {
    console.error('[Session API] Error:', error);
    return NextResponse.json({ session: null }, { status: 500 });
  }
}
