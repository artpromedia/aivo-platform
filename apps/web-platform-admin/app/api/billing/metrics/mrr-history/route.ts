/**
 * GET /api/billing/metrics/mrr-history
 *
 * Get MRR (Monthly Recurring Revenue) history.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { billingApi } from '@/lib/api/billing.api';
import { requirePlatformAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await requirePlatformAdmin();
    const accessToken = (session as { accessToken?: string })?.accessToken || '';

    const searchParams = request.nextUrl.searchParams;
    const months = searchParams.get('months');

    const response = await billingApi.getMRRHistory(months ? parseInt(months) : undefined, {
      accessToken,
    });
    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch MRR history:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch MRR history' }, { status: 500 });
  }
}
