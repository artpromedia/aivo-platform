import { verifyToken } from '@aivo/auth-web';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const BILLING_URL =
  process.env.BILLING_SERVICE_URL || process.env.BILLING_SVC_URL || 'http://billing-svc:3000';

/**
 * POST /api/billing/create-checkout
 *
 * Creates a Stripe checkout session for subscription purchase or upgrade.
 *
 * Accepts either:
 *   - Legacy: { planId, billingPeriod, couponCode }
 *   - SKU-based: { selectedSkus, billingPeriod, learnerIds, couponCode }
 *
 * In development mode, returns a mock session that redirects to /checkout/success.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { planId, billingPeriod, couponCode, selectedSkus, learnerIds } = body as {
      planId?: string;
      billingPeriod?: string;
      couponCode?: string;
      selectedSkus?: string[];
      learnerIds?: string[];
    };

    // Require either planId or selectedSkus
    if (!planId && (!selectedSkus || selectedSkus.length === 0)) {
      return NextResponse.json(
        { error: { code: 'INVALID_REQUEST', message: 'Plan ID or selected SKUs are required' } },
        { status: 400 }
      );
    }

    if (!billingPeriod) {
      return NextResponse.json(
        { error: { code: 'INVALID_REQUEST', message: 'Billing period is required' } },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      // Return mock checkout session in development
      return NextResponse.json({
        sessionId: `cs_test_${Math.random().toString(36).substring(2, 26)}`,
        url: `${appUrl}/checkout/success?session_id=cs_test_mock`,
        expiresAt: Date.now() + 30 * 60 * 1000,
      });
    }

    // Normalize SKUs: if planId is CSV (e.g. "BASE,ADDON_SEL"), split into selectedSkus
    const skus: string[] = selectedSkus ?? (planId ? planId.split(',').map((s) => s.trim()) : []);

    // Production: Call billing microservice
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get('aivo_access_token')?.value;
    const token = request.headers.get('Authorization')?.replace('Bearer ', '') || cookieToken || '';

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await verifyToken(token);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(`${BILLING_URL}/api/v1/billing/checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-tenant-id': session.tenantId,
        'x-user-id': session.userId,
      },
      body: JSON.stringify({
        selectedSkus: skus,
        billingPeriod: billingPeriod.toLowerCase(), // billing-common expects 'monthly' | 'yearly'
        learnerIds: learnerIds || [],
        couponCode,
        successUrl: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${appUrl}/checkout/cancel`,
      }),
    });

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      return NextResponse.json(
        {
          error: (data as { error?: { code: string; message: string } }).error || {
            code: 'CHECKOUT_FAILED',
            message: 'Failed to create checkout session',
          },
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
