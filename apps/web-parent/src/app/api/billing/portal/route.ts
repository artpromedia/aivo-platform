import { verifyToken } from '@aivo/auth-web';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const BILLING_URL =
  process.env.BILLING_SERVICE_URL || process.env.BILLING_SVC_URL || 'http://billing-svc:3000';

/**
 * POST /api/billing/portal
 *
 * Creates a Stripe billing portal session.
 * Allows customers to manage their subscription, payment methods, etc.
 */
export async function POST(request: NextRequest) {
  try {
    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      // Return mock portal URL in development
      return NextResponse.json({
        url: 'https://billing.stripe.com/test',
      });
    }

    // Production: Call billing microservice
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get('aivo_access_token')?.value;
    const token = request.headers.get('Authorization')?.replace('Bearer ', '') || cookieToken || '';

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await verifyToken(token);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(`${BILLING_URL}/api/v1/billing/portal-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-tenant-id': session.tenantId,
        'x-user-id': session.userId,
      },
      body: JSON.stringify({
        returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data.error || {
            code: 'PORTAL_FAILED',
            message: 'Failed to create portal session',
          },
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
