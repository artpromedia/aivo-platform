/**
 * Resend Invite API Route
 *
 * POST /api/users/[userId]/resend-invite
 * Resends the invitation email for a user with INVITED/PENDING status.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const USER_SVC_URL = process.env.USER_SVC_URL || 'http://user-svc:3000';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const response = await fetch(`${USER_SVC_URL}/users/${userId}/resend-invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      const error = await response.text();
      return NextResponse.json(
        { error: error || 'Failed to resend invite' },
        { status: response.status }
      );
    }

    return NextResponse.json({ message: 'Invitation resent' });
  } catch {
    return NextResponse.json({ error: 'Failed to resend invite' }, { status: 500 });
  }
}
