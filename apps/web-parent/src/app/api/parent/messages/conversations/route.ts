/**
 * Messages Conversations API Route
 *
 * Returns message conversations for the parent.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const PARENT_SVC_URL = process.env.PARENT_SVC_URL || 'http://localhost:3010';
const isDev = process.env.NODE_ENV === 'development';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || request.headers.get('Authorization')?.replace('Bearer ', '');

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
      } catch (error) {
        console.log('[Messages API] Parent service unavailable, using mock data');
      }
    }

    // Return mock data in development
    if (isDev) {
      return NextResponse.json({
        conversations: [],
        total: 0,
        page: 1,
        pageSize: 20,
      });
    }

    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  } catch (error) {
    console.error('[Messages API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || request.headers.get('Authorization')?.replace('Bearer ', '');
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
      } catch (error) {
        console.log('[Messages API] Parent service unavailable');
      }
    }

    // Return mock success in development
    if (isDev) {
      return NextResponse.json({
        id: `conv_${Date.now()}`,
        ...body,
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  } catch (error) {
    console.error('[Messages API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
