/**
 * POST /api/billing/purchase-orders/[id]/reject
 *
 * Reject a purchase order.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { billingApi, type RejectPOInput } from '@/lib/api/billing.api';
import { requirePlatformAdmin } from '@/lib/auth';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePlatformAdmin();
    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const { id } = await params;

    const body = (await request.json()) as RejectPOInput;
    const response = await billingApi.rejectPO(id, body, { accessToken });
    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to reject purchase order:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to reject purchase order' }, { status: 500 });
  }
}
