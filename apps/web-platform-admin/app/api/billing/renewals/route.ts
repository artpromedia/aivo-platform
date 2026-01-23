/**
 * GET /api/billing/renewals
 *
 * List renewals.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { billingApi, type RenewalFilters } from '@/lib/api/billing.api';
import { requirePlatformAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await requirePlatformAdmin();
    const accessToken = (session as { accessToken?: string })?.accessToken || '';

    const searchParams = request.nextUrl.searchParams;
    const filters: RenewalFilters = {};

    const status = searchParams.get('status');
    const tenantId = searchParams.get('tenantId');
    const dueBefore = searchParams.get('dueBefore');
    const dueAfter = searchParams.get('dueAfter');
    const assignedTo = searchParams.get('assignedTo');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    if (status) filters.status = status as RenewalFilters['status'];
    if (tenantId) filters.tenantId = tenantId;
    if (dueBefore) filters.dueBefore = dueBefore;
    if (dueAfter) filters.dueAfter = dueAfter;
    if (assignedTo) filters.assignedTo = assignedTo;
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);

    const response = await billingApi.getRenewals(filters, { accessToken });
    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch renewals:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch renewals' }, { status: 500 });
  }
}
