/**
 * Parent Profile API Route
 *
 * Handles parent profile operations, proxying to parent-svc or returning mock data in development.
 */

import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PARENT_SVC_URL = process.env.PARENT_SVC_URL || 'http://localhost:3010';

/**
 * Get parent profile
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token =
      cookieStore.get('auth-token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');

    // Try to call parent-svc
    if (token) {
      try {
        const response = await fetch(`${PARENT_SVC_URL}/api/v1/parent/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data: unknown = await response.json();
          return NextResponse.json(data);
        }
      } catch {
        console.log('[Profile API] Parent service unavailable');
      }
    }

    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  } catch (error) {
    console.error('[Profile API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Update parent profile
 */
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token =
      cookieStore.get('auth-token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');
    const body: unknown = await request.json();

    if (token) {
      try {
        const response = await fetch(`${PARENT_SVC_URL}/api/v1/parent/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });

        if (response.ok) {
          const data: unknown = await response.json();
          return NextResponse.json(data);
        }
      } catch {
        console.log('[Profile API] Parent service unavailable');
      }
    }

    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  } catch (error) {
    console.error('[Profile API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
