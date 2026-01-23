import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/billing
 *
 * Returns complete billing information including subscription, plans,
 * payment methods, and invoices.
 *
 * Sprint 4.1: Removed mock data fallback - always calls billing microservice.
 */
export async function GET(request: NextRequest) {
  try {
    const billingServiceUrl = process.env.BILLING_SERVICE_URL || 'http://billing-svc:4000';
    const response = await fetch(`${billingServiceUrl}/api/billing`, {
      method: 'GET',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || { code: 'FETCH_FAILED', message: 'Failed to fetch billing data' } },
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
