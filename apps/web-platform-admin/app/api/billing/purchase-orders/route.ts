/**
 * GET /api/billing/purchase-orders
 *
 * List purchase orders.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { billingApi, type POFilters } from '@/lib/api/billing.api';
import { requirePlatformAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await requirePlatformAdmin();
    const accessToken = (session as { accessToken?: string })?.accessToken || '';

    const searchParams = request.nextUrl.searchParams;
    const filters: POFilters = {};

    const status = searchParams.get('status');
    const tenantId = searchParams.get('tenantId');
    const billingAccountId = searchParams.get('billingAccountId');
    const search = searchParams.get('search');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    if (status) filters.status = status as POFilters['status'];
    if (tenantId) filters.tenantId = tenantId;
    if (billingAccountId) filters.billingAccountId = billingAccountId;
    if (search) filters.search = search;
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);

    const response = await billingApi.getPurchaseOrders(filters, { accessToken });
    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch purchase orders:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch purchase orders' }, { status: 500 });
  }
}
