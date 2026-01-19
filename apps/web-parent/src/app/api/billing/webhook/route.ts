import { NextRequest, NextResponse } from 'next/server';

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
      // In development, just log the webhook
      console.log('[DEV] Received Stripe webhook');
      return NextResponse.json({ received: true });
    }

    // Production: Forward to billing microservice for processing
    const billingServiceUrl = process.env.BILLING_SERVICE_URL || 'http://billing-svc:4000';
    const response = await fetch(`${billingServiceUrl}/api/webhooks/stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'Stripe-Signature': signature,
      },
      body,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Webhook processing error:', errorData);
      return NextResponse.json(
        { error: { code: 'WEBHOOK_FAILED', message: 'Failed to process webhook' } },
        { status: response.status }
      );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// Required for Stripe webhooks - don't parse the body as JSON
export const config = {
  api: {
    bodyParser: false,
  },
};
