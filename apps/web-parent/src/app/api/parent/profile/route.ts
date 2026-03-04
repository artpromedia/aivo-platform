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

    // Dev fallback: return mock profile with multiple children
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        id: 'parent_001',
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah@example.com',
        phone: '+1-555-0100',
        language: 'en',
        students: [
          {
            id: 'child_001',
            name: 'Emma Johnson',
            firstName: 'Emma',
            lastName: 'Johnson',
            grade: '3',
          },
          {
            id: 'child_002',
            name: 'Liam Johnson',
            firstName: 'Liam',
            lastName: 'Johnson',
            grade: '1',
          },
        ],
        createdAt: '2024-01-15T00:00:00Z',
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
