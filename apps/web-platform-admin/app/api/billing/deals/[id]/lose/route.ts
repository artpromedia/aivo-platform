/**
 * POST /api/billing/deals/[id]/lose
 *
 * Mark a deal as lost.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { billingApi } from '@/lib/api/billing.api';
import { requirePlatformAdmin } from '@/lib/auth';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePlatformAdmin();
    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const { id } = await params;

    const body = await request.json();
    if (!body.lostReason) {
      return NextResponse.json({ error: 'lostReason is required' }, { status: 400 });
    }
    const response = await billingApi.loseDeal(id, body.lostReason, { accessToken });
    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to mark deal as lost:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to mark deal as lost' }, { status: 500 });
  }
}
