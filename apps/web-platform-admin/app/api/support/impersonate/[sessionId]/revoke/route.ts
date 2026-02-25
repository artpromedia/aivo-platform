import { NextResponse, type NextRequest } from 'next/server';

import { revokeImpersonationSession } from '../../../../../../lib/api';
import { getAuthSession } from '../../../../../../lib/auth';

/**
 * POST /api/support/impersonate/[sessionId]/revoke — Revoke an impersonation session
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const auth = await getAuthSession();
  if (!auth) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { sessionId } = await params;
    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    const result = await revokeImpersonationSession(
      auth.accessToken,
      sessionId,
      body.reason,
    );
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Failed to revoke session' },
      { status: 500 },
    );
  }
}
