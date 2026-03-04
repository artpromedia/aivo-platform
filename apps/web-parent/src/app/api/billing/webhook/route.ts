import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * POST /api/billing/webhook
 *
 * Handles Stripe webhook events.
 * This endpoint should be configured as a webhook endpoint in Stripe.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: { code: 'MISSING_SIGNATURE', message: 'Missing Stripe signature' } },
        { status: 400 }
      );
    }

    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      // In development, skip webhook processing
      return NextResponse.json({ received: true });
    }

    // Production: Forward to billing microservice for processing
    const billingServiceUrl =
      process.env.BILLING_SERVICE_URL || process.env.BILLING_SVC_URL || 'http://billing-svc:3000';
    const response = await fetch(`${billingServiceUrl}/billing/webhooks/stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'Stripe-Signature': signature,
      },
      body,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: { code: 'WEBHOOK_FAILED', message: 'Failed to process webhook' } },
        { status: response.status }
      );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
