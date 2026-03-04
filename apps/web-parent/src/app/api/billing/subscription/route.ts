import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

function getAuthHeader(request: NextRequest, cookieToken?: string): string {
  const headerToken = request.headers.get('Authorization')?.replace('Bearer ', '');
  const token = headerToken || cookieToken || '';
  return token ? `Bearer ${token}` : '';
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
    const billingServiceUrl =
      process.env.BILLING_SERVICE_URL || process.env.BILLING_SVC_URL || 'http://billing-svc:3000';
    const response = await fetch(`${billingServiceUrl}/api/v1/billing/subscription`, {
      method: 'GET',
      headers: {
        Authorization: getAuthHeader(request, cookieToken),
        'Content-Type': 'application/json',
      },
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

    const billingServiceUrl =
      process.env.BILLING_SERVICE_URL || process.env.BILLING_SVC_URL || 'http://billing-svc:3000';
    const response = await fetch(`${billingServiceUrl}/api/v1/billing/subscription`, {
      method: 'PUT',
      headers: {
        Authorization: getAuthHeader(request, cookieToken),
        'Content-Type': 'application/json',
      },
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
    const billingServiceUrl =
      process.env.BILLING_SERVICE_URL || process.env.BILLING_SVC_URL || 'http://billing-svc:3000';
    const response = await fetch(`${billingServiceUrl}/api/v1/billing/cancel`, {
      method: 'POST',
      headers: {
        Authorization: getAuthHeader(request, cookieToken),
        'Content-Type': 'application/json',
      },
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
