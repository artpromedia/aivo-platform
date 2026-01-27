/**
 * GET /api/dashboard/orchestration/failover-events
 *
 * Returns failover events for the admin dashboard.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/auth';
import { listFailoverEvents, type ProviderId } from '@/lib/api/orchestration.api';

export async function GET(request: NextRequest) {
  try {
    const session = await requirePlatformAdmin();

    const searchParams = request.nextUrl.searchParams;
    const providerIdParam = searchParams.get('providerId');
    const sinceParam = searchParams.get('since');

    const filters: {
      providerId?: ProviderId;
      since?: Date;
    } = {};

    if (providerIdParam) {
      filters.providerId = providerIdParam as ProviderId;
    }
    if (sinceParam) {
      filters.since = new Date(sinceParam);
    }

    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
    const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : undefined;

    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const events = await listFailoverEvents(accessToken, filters, page, pageSize);

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
