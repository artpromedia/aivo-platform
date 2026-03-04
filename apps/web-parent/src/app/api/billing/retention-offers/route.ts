import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/billing/retention-offers
 *
 * Returns retention offers that can be shown to the user before they cancel.
 * In dev mode returns mock offers so the UI can be tested without a running
 * billing microservice.
 */
export async function GET(request: NextRequest) {
  // Dev-mode mock
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.json([
      {
        id: 'offer-discount-20',
        type: 'discount',
        title: '20% off for 3 months',
        description:
          'Stay with us and enjoy a 20% discount on your current plan for the next 3 months.',
        discountPercent: 20,
        durationMonths: 3,
      },
      {
        id: 'offer-pause-4w',
        type: 'pause',
        title: 'Pause your subscription',
        description:
          'Take a break - we will pause your subscription for up to 4 weeks at no charge.',
        pauseWeeks: 4,
      },
    ]);
  }

  try {
    const billingServiceUrl =
      process.env.BILLING_SERVICE_URL || process.env.BILLING_SVC_URL || 'http://billing-svc:3000';
    const response = await fetch(`${billingServiceUrl}/api/v1/billing/retention-offers`, {
      method: 'GET',
      headers: {
        Authorization: request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
    });

    const data: unknown = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    console.error('[billing/retention-offers GET] Error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/billing/retention-offers/accept
 *
 * Accept a specific retention offer.
 */
export async function POST(request: NextRequest) {
  // Dev-mode mock
  if (process.env.NODE_ENV === 'development') {
    const body = (await request.json()) as { offerId?: string };
    return NextResponse.json({ accepted: true, offerId: body.offerId ?? null });
  }

  try {
    const billingServiceUrl =
      process.env.BILLING_SERVICE_URL || process.env.BILLING_SVC_URL || 'http://billing-svc:3000';
    const body: unknown = await request.json();
    const response = await fetch(`${billingServiceUrl}/api/v1/billing/retention-offers/accept`, {
      method: 'POST',
      headers: {
        Authorization: request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data: unknown = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    console.error('[billing/retention-offers POST] Error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
