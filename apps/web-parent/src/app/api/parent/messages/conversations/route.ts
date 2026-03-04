/**
 * Messages Conversations API Route
 *
 * Returns message conversations for the parent.
 */

import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const PARENT_SVC_URL = process.env.PARENT_SVC_URL || 'http://localhost:3010';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token =
      cookieStore.get('aivo_access_token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');

    // Try to call parent-svc
    if (token) {
      try {
        const response = await fetch(`${PARENT_SVC_URL}/api/v1/messages/conversations`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json(data);
        }
      } catch {
        console.log('[Messages API] Parent service unavailable');
      }
    }

    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  } catch (error) {
    console.error('[Messages API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token =
      cookieStore.get('aivo_access_token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');
    const body = await request.json();

    if (token) {
      try {
        const response = await fetch(`${PARENT_SVC_URL}/api/v1/messages/conversations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json(data);
        }
      } catch {
        console.log('[Messages API] Parent service unavailable');
      }
    }

    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  } catch (error) {
    console.error('[Messages API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
