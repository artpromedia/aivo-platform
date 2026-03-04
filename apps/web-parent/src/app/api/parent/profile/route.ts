/**
 * Parent Profile API Route
 *
 * Handles parent profile operations, proxying to parent-svc.
 * Falls back to session-based profile when parent-svc doesn't have
 * a matching parent record (auth-svc and parent-svc use separate databases).
 */

import { getServerSession } from '@aivo/auth-web';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PARENT_SVC_URL = process.env.PARENT_SVC_URL || 'http://parent-svc:3000';

/**
 * Get parent profile
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token =
      cookieStore.get('aivo_access_token')?.value ||
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

    // Fallback: return basic profile from auth session
    // This handles the case where parent-svc doesn't have a matching
    // parent record (e.g., user registered via auth-svc only)
    const session = await getServerSession();
    if (session) {
      return NextResponse.json({
        id: session.userId,
        firstName: session.name?.split(' ')[0] ?? null,
        lastName: session.name?.split(' ').slice(1).join(' ') ?? null,
        email: session.email ?? null,
        phone: null,
        language: 'en',
        students: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
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
    const cookieStore = await cookies();
    const token =
      cookieStore.get('aivo_access_token')?.value ||
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
