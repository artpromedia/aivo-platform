/**
 * GET /api/billing/deals/[id]
 * PATCH /api/billing/deals/[id]
 *
 * Get and update an enterprise deal.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { billingApi, type CreateDealInput, type DealStatus } from '@/lib/api/billing.api';
import { requirePlatformAdmin } from '@/lib/auth';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePlatformAdmin();
    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const { id } = await params;

    const response = await billingApi.getDeal(id, { accessToken });
    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch deal:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch deal' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePlatformAdmin();
    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const { id } = await params;

    const body = (await request.json()) as Partial<CreateDealInput> & {
      status?: DealStatus;
      lostReason?: string;
    };
    const response = await billingApi.updateDeal(id, body, { accessToken });
    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to update deal:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to update deal' }, { status: 500 });
  }
}
