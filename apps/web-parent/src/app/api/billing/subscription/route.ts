import { NextRequest, NextResponse } from 'next/server';
import { getMockSubscription } from '@/lib/mock-data';

/**
 * GET /api/billing/subscription
 *
 * Returns the current user's subscription.
 */
export async function GET(request: NextRequest) {
  try {
    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      return NextResponse.json(getMockSubscription());
    }

    const billingServiceUrl = process.env.BILLING_SERVICE_URL || 'http://billing-svc:4000';
    const response = await fetch(`${billingServiceUrl}/api/subscription`, {
      method: 'GET',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
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
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      const mockSub = getMockSubscription();
      return NextResponse.json({ ...mockSub, ...body });
    }

    const billingServiceUrl = process.env.BILLING_SERVICE_URL || 'http://billing-svc:4000';
    const response = await fetch(`${billingServiceUrl}/api/subscription`, {
      method: 'PUT',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
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
 */
export async function DELETE(request: NextRequest) {
  try {
    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      const mockSub = getMockSubscription();
      mockSub.cancelAtPeriodEnd = true;
      mockSub.canceledAt = new Date().toISOString();
      return NextResponse.json(mockSub);
    }

    const billingServiceUrl = process.env.BILLING_SERVICE_URL || 'http://billing-svc:4000';
    const response = await fetch(`${billingServiceUrl}/api/subscription/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
