import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

import { getMockSubscription } from '@/lib/mock-data';

/**
 * POST /api/billing/subscription/seats
 *
 * Manages subscription seats (add/remove children).
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

    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      const mockSub = getMockSubscription();

      // Simulate seat changes
      for (const change of changes) {
        if (change.action === 'add') {
          mockSub.usedSeats += 1;
          mockSub.seats.push({
            id: `seat-${Date.now()}`,
            childId: change.childId,
            childName: change.childName,
            assignedAt: new Date().toISOString(),
            status: 'active',
          });
        } else if (change.action === 'remove') {
          mockSub.usedSeats = Math.max(0, mockSub.usedSeats - 1);
          mockSub.seats = mockSub.seats.filter(s => s.childId !== change.childId);
        }
      }

      return NextResponse.json(mockSub);
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
