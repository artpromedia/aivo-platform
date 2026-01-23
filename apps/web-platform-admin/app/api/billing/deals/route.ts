/**
 * GET /api/billing/deals
 * POST /api/billing/deals
 *
 * List and create enterprise deals.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { billingApi, type DealFilters, type CreateDealInput } from '@/lib/api/billing.api';
import { requirePlatformAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await requirePlatformAdmin();
    const accessToken = (session as { accessToken?: string })?.accessToken || '';

    const searchParams = request.nextUrl.searchParams;
    const filters: DealFilters = {};

    const customerId = searchParams.get('customerId');
    const ownerId = searchParams.get('ownerId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const minValue = searchParams.get('minValue');
    const maxValue = searchParams.get('maxValue');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    if (customerId) filters.customerId = customerId;
    if (ownerId) filters.ownerId = ownerId;
    if (status) (filters as Record<string, unknown>).status = status;
    if (type) (filters as Record<string, unknown>).type = type;
    if (minValue) filters.minValue = parseInt(minValue);
    if (maxValue) filters.maxValue = parseInt(maxValue);
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);

    const response = await billingApi.getDeals(filters, { accessToken });
    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch deals:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePlatformAdmin();
    const accessToken = (session as { accessToken?: string })?.accessToken || '';

    const body = (await request.json()) as CreateDealInput;
    const response = await billingApi.createDeal(body, { accessToken });
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Failed to create deal:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 });
  }
}
