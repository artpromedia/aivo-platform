import { NextRequest, NextResponse } from 'next/server';
import {
  getMockSubscription,
  getMockPlans,
  getMockPaymentMethods,
  getMockInvoices,
  getMockBillingDetails,
} from '@/lib/mock-data';

/**
 * GET /api/billing
 *
 * Returns complete billing information including subscription, plans,
 * payment methods, and invoices.
 */
export async function GET(request: NextRequest) {
  try {
    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      // Return mock data in development
      return NextResponse.json({
        subscription: getMockSubscription(),
        plans: getMockPlans(),
        paymentMethods: getMockPaymentMethods(),
        invoices: getMockInvoices(),
        billingDetails: getMockBillingDetails(),
      });
    }

    // Production: Call billing microservice
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
