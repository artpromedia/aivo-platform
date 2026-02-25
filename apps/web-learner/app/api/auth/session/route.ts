import { NextResponse } from 'next/server';

import { getAuthSession } from '../../../../lib/auth';

/**
 * GET /api/auth/session — Return current auth session info (including impersonation state)
 */
export async function GET() {
  const session = await getAuthSession();

  if (!session) {
    return NextResponse.json({ session: null });
  }

  return NextResponse.json({
    session: {
      userId: session.userId,
      tenantId: session.tenantId,
      roles: session.roles,
      name: session.name,
      email: session.email,
      learnerId: session.learnerId,
      isImpersonated: session.isImpersonated ?? false,
      impersonation: session.impersonation ?? undefined,
    },
  });
}
