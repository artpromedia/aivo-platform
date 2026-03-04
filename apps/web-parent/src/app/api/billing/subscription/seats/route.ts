import { verifyToken } from '@aivo/auth-web';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const BILLING_URL =
  process.env.BILLING_SERVICE_URL || process.env.BILLING_SVC_URL || 'http://billing-svc:3000';

/**
 * POST /api/billing/subscription/seats
 *
 * Manages subscription seats (add/remove children).
 * Sprint 4.1: Removed mock data fallback - always calls billing microservice.
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { changes } = body;

    if (!changes || !Array.isArray(changes)) {
      return NextResponse.json(
        { error: { code: 'INVALID_REQUEST', message: 'Changes array is required' } },
        { status: 400 }
      );
    }

    const response = await fetch(`${BILLING_URL}/api/v1/billing/subscription/seats`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-tenant-id': session.tenantId,
        'x-user-id': session.userId,
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
