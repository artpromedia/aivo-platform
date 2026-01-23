import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * POST /api/billing/subscription/seats
 *
 * Manages subscription seats (add/remove children).
 * Sprint 4.1: Removed mock data fallback - always calls billing microservice.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { changes } = body;

    if (!changes || !Array.isArray(changes)) {
      return NextResponse.json(
        { error: { code: 'INVALID_REQUEST', message: 'Changes array is required' } },
        { status: 400 }
      );
    }

    const billingServiceUrl = process.env.BILLING_SERVICE_URL || 'http://billing-svc:4000';
    const response = await fetch(`${billingServiceUrl}/api/subscription/seats`, {
      method: 'POST',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ changes }),
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
