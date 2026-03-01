import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/billing/cancel-preview
 *
 * Returns a preview of what happens when the user cancels (access-end-date,
 * refund amount, etc.).  In dev mode returns a mock so the UI can be tested
 * without a running billing microservice.
 */
export async function GET(request: NextRequest) {
  // Dev-mode mock
  if (process.env.NODE_ENV === 'development') {
    const now = new Date();
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // End of current month
    return NextResponse.json({
      accessEndDate: endDate.toISOString(),
      refundAmount: 0,
      currency: 'usd',
      prorated: false,
    });
  }

  try {
    const billingServiceUrl = process.env.BILLING_SERVICE_URL || 'http://billing-svc:4000';
    const response = await fetch(`${billingServiceUrl}/api/cancel-preview`, {
      method: 'GET',
      headers: {
        Authorization: request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
    });

    const data: unknown = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    console.error('[billing/cancel-preview GET] Error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 },
    );
  }
}
