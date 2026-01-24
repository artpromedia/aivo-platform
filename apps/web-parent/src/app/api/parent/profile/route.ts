/**
 * Parent Profile API Route
 *
 * Handles parent profile operations, proxying to parent-svc or returning mock data in development.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const PARENT_SVC_URL = process.env.PARENT_SVC_URL || 'http://localhost:3010';
const isDev = process.env.NODE_ENV === 'development';

/**
 * Get parent profile
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || request.headers.get('Authorization')?.replace('Bearer ', '');

    // Try to call parent-svc
    if (token) {
      try {
        const response = await fetch(`${PARENT_SVC_URL}/api/v1/parent/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json(data);
        }
      } catch (error) {
        console.log('[Profile API] Parent service unavailable, using mock data');
      }
    }

    // Return mock data in development
    if (isDev) {
      return NextResponse.json({
        id: 'parent_demo_123',
        firstName: 'Demo',
        lastName: 'Parent',
        email: 'demo@example.com',
        phone: '',
        language: 'en',
        students: [
          {
            id: 'learner_test123',
            name: 'TestChild',
            firstName: 'TestChild',
            lastName: 'User',
            grade: '2',
            avatar: null,
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  } catch (error) {
    console.error('[Profile API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Update parent profile
 */
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || request.headers.get('Authorization')?.replace('Bearer ', '');
    const body = await request.json();

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
          const data = await response.json();
          return NextResponse.json(data);
        }
      } catch (error) {
        console.log('[Profile API] Parent service unavailable');
      }
    }

    // Return mock success in development
    if (isDev) {
      return NextResponse.json({
        ...body,
        id: 'parent_demo_123',
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  } catch (error) {
    console.error('[Profile API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
