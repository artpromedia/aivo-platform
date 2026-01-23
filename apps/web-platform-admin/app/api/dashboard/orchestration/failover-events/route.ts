/**
 * GET /api/dashboard/orchestration/failover-events
 *
 * Returns failover events for the admin dashboard.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/auth';
import { getFailoverEvents, type ProviderId } from '@/lib/api/orchestration.api';

export async function GET(request: NextRequest) {
  try {
    const session = await requirePlatformAdmin();

    const searchParams = request.nextUrl.searchParams;
    const filters = {
      providerId: searchParams.get('providerId') as ProviderId | undefined,
      since: searchParams.get('since') ? new Date(searchParams.get('since')!) : undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
      pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : undefined,
    };

    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const events = await getFailoverEvents(filters, accessToken);

    return NextResponse.json(events);
  } catch (error) {
    console.error('Failed to fetch failover events:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch failover events' },
      { status: 500 }
    );
  }
}
