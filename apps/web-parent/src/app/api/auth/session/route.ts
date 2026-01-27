/**
 * Auth Session API Route
 *
 * Returns the current user session. This is called by the frontend
 * to check authentication status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const isDev = process.env.NODE_ENV === 'development';

interface JwtPayload {
  sub?: string;
  id?: string;
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  givenName?: string;
  familyName?: string;
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value || 
                  cookieStore.get('parent-token')?.value ||
                  request.headers.get('Authorization')?.replace('Bearer ', '');

    if (token) {
      try {
        // Parse the token (JWT has 3 parts separated by .)
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8')) as JwtPayload;
          
          return NextResponse.json({
            user: {
              id: payload.sub || payload.id,
              email: payload.email || 'parent@example.com',
              name: payload.name || payload.firstName || 'Parent',
              firstName: payload.firstName || payload.givenName || 'Demo',
              lastName: payload.lastName || payload.familyName || 'Parent',
            },
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          });
        }
      } catch (jwtError) {
        console.log('[Session API] Token parsing failed:', jwtError);
      }
    }

    // In development, return a mock session
    if (isDev) {
      return NextResponse.json({
        user: {
          id: 'parent_demo_123',
          email: 'demo@example.com',
          name: 'Demo Parent',
          firstName: 'Demo',
          lastName: 'Parent',
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    // No valid session
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  } catch (error) {
    console.error('[Session API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
