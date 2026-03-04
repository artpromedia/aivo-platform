import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { verifyToken } from '@aivo/auth-web';

function getToken(request: NextRequest, cookieToken?: string): string {
  return request.headers.get('Authorization')?.replace('Bearer ', '') || cookieToken || '';
}

const BILLING_URL =
  process.env.BILLING_SERVICE_URL || process.env.BILLING_SVC_URL || 'http://billing-svc:3000';

/**
 * Build headers for billing-svc: Authorization + x-tenant-id + x-user-id.
 * billing-svc relies on upstream gateway to inject identity headers.
 */
async function billingHeaders(
  request: NextRequest,
  cookieToken?: string
): Promise<{ headers: Record<string, string>; error?: NextResponse }> {
  const token = getToken(request, cookieToken);
  if (!token) {
    return {
      headers: {},
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const session = await verifyToken(token);
  if (!session) {
    return {
      headers: {},
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-tenant-id': session.tenantId,
      'x-user-id': session.userId,
    },
  };
}

/**
 * GET /api/billing/subscription
 *
 * Returns the current user's subscription.
 * Sprint 4.1: Removed mock data fallback - always calls billing microservice.
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get('aivo_access_token')?.value;
    const { headers, error } = await billingHeaders(request, cookieToken);
    if (error) return error;

    const response = await fetch(`${BILLING_URL}/api/v1/billing/subscription`, {
      method: 'GET',
      headers,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    console.error('[billing/subscription GET] Error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/billing/subscription
 *
 * Updates subscription settings.
 * Sprint 4.1: Removed mock data fallback - always calls billing microservice.
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get('aivo_access_token')?.value;

    const { headers, error } = await billingHeaders(request, cookieToken);
    if (error) return error;

    const response = await fetch(`${BILLING_URL}/api/v1/billing/subscription`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    console.error('[billing/subscription PUT] Error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/billing/subscription
 *
 * Cancels the subscription.
 * Sprint 4.1: Removed mock data fallback - always calls billing microservice.
 */
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get('aivo_access_token')?.value;

    const { headers, error } = await billingHeaders(request, cookieToken);
    if (error) return error;

    const response = await fetch(`${BILLING_URL}/api/v1/billing/cancel`, {
      method: 'POST',
      headers,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    console.error('[billing/subscription DELETE] Error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
