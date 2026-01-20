import { NextRequest, NextResponse } from 'next/server';

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
    const billingServiceUrl = process.env.BILLING_SERVICE_URL || 'http://billing-svc:4000';
    const response = await fetch(`${billingServiceUrl}/api/portal/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
      body: JSON.stringify({
        returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || { code: 'PORTAL_FAILED', message: 'Failed to create portal session' } },
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
