import { NextResponse } from 'next/server';

import { getAuthSession } from '../../../../lib/auth';

// ============================================================================
// Seat Request API
//
// POST /api/billing/seat-request — Submit a request for additional seats
//
// Proxies to billing-svc via BILLING_SVC_URL.
// ============================================================================

const BILLING_SVC_URL =
  process.env.BILLING_SVC_URL || 'http://localhost:4060';

interface SeatRequestBody {
  additionalSeats: number;
  urgency: 'NORMAL' | 'URGENT';
  notes?: string;
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: unknown = await request.json();
    const { additionalSeats, urgency, notes } = body as SeatRequestBody;

    // Validate required fields
    if (
      typeof additionalSeats !== 'number' ||
      additionalSeats < 1 ||
      additionalSeats > 10000
    ) {
      return NextResponse.json(
        { error: 'additionalSeats must be a number between 1 and 10,000' },
        { status: 400 },
      );
    }

    const validUrgencies = ['NORMAL', 'URGENT'];
    if (!validUrgencies.includes(urgency)) {
      return NextResponse.json(
        { error: 'urgency must be NORMAL or URGENT' },
        { status: 400 },
      );
    }

    const res = await fetch(
      `${BILLING_SVC_URL}/billing-accounts/${session.tenantId}/seat-requests`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          'x-tenant-id': session.tenantId,
          'x-user-id': session.userId,
        },
        body: JSON.stringify({ additionalSeats, urgency, notes }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: text || 'Failed to submit seat request' },
        { status: res.status },
      );
    }

    const data: unknown = await res.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('[seat-request API] Error submitting request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
