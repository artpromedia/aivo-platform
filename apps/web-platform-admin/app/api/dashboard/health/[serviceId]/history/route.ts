/**
 * GET /api/dashboard/health/[serviceId]/history
 *
 * Returns health history for a specific service.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/auth';
import { getServiceHealthHistory } from '@/lib/api/health.api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  try {
    const session = await requirePlatformAdmin();
    const { serviceId } = await params;

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') as 'hour' | 'day' | 'week' | 'month' || 'day';

    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const history = await getServiceHealthHistory(serviceId, period, accessToken);

    return NextResponse.json(history);
  } catch (error) {
    console.error('Failed to fetch health history:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch health history' },
      { status: 500 }
    );
  }
}
