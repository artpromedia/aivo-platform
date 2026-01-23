/**
 * GET /api/dashboard/licenses/revenue
 *
 * Returns revenue metrics for the admin dashboard.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/auth';
import { getRevenueMetrics } from '@/lib/api/licenses.api';

export async function GET(request: NextRequest) {
  try {
    const session = await requirePlatformAdmin();

    const searchParams = request.nextUrl.searchParams;
    const period = (searchParams.get('period') as 'day' | 'week' | 'month' | 'quarter' | 'year') || 'month';

    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const metrics = await getRevenueMetrics(accessToken, period);

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Failed to fetch revenue metrics:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch revenue metrics' },
      { status: 500 }
    );
  }
}
