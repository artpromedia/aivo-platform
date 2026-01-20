import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/billing/create-checkout
 *
 * Creates a Stripe checkout session for subscription purchase or upgrade.
 * In development mode, returns a mock session.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planId, billingPeriod, couponCode } = body;

    if (!planId || !billingPeriod) {
      return NextResponse.json(
        { error: { code: 'INVALID_REQUEST', message: 'Plan ID and billing period are required' } },
        { status: 400 }
      );
    }

    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      // Return mock checkout session in development
      return NextResponse.json({
        sessionId: `cs_test_${Math.random().toString(36).substr(2, 24)}`,
        url: 'https://checkout.stripe.com/test',
        expiresAt: Date.now() + 30 * 60 * 1000,
      });
    }

    // Production: Call billing microservice
    const billingServiceUrl = process.env.BILLING_SERVICE_URL || 'http://billing-svc:4000';
    const response = await fetch(`${billingServiceUrl}/api/checkout/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
      body: JSON.stringify({
        planId,
        billingPeriod,
        couponCode,
        successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=true`,
        cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/billing?canceled=true`,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || { code: 'CHECKOUT_FAILED', message: 'Failed to create checkout session' } },
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
