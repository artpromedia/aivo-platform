/**
 * GET /api/dashboard/orchestration/costs
 *
 * Returns AI cost breakdown for the admin dashboard.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/auth';
import { getCostBreakdown } from '@/lib/api/orchestration.api';

export async function GET(request: NextRequest) {
  try {
    const session = await requirePlatformAdmin();

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') as 'day' | 'week' | 'month' || 'month';

    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const costs = await getCostBreakdown(period, accessToken);

    return NextResponse.json(costs);
  } catch (error) {
    console.error('Failed to fetch cost breakdown:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch cost breakdown' },
      { status: 500 }
    );
  }
}
