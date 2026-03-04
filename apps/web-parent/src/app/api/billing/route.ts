import { verifyToken } from '@aivo/auth-web';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BILLING_URL =
  process.env.BILLING_SERVICE_URL || process.env.BILLING_SVC_URL || 'http://billing-svc:3000';

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

    const response = await fetch(`${BILLING_URL}/api/v1/billing`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-tenant-id': session.tenantId,
        'x-user-id': session.userId,
      },
    });

    const data = (await response.json()) as { error?: { code: string; message: string } };

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch billing data' } },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('[billing/route] Error fetching billing data:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
