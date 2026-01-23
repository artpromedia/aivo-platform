/**
 * GET /api/dashboard/health/incidents
 *
 * Returns health incidents for the admin dashboard.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/auth';
import { listHealthIncidents } from '@/lib/api/health.api';

export async function GET(request: NextRequest) {
  try {
    const session = await requirePlatformAdmin();

    const searchParams = request.nextUrl.searchParams;
    const filters = {
      serviceId: searchParams.get('serviceId') || undefined,
      severity: searchParams.get('severity') as 'warning' | 'critical' | undefined,
      resolved: searchParams.get('resolved') === 'true' ? true : searchParams.get('resolved') === 'false' ? false : undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
      pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : undefined,
    };

    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const incidents = await listHealthIncidents(filters, accessToken);

    return NextResponse.json(incidents);
  } catch (error) {
    console.error('Failed to fetch health incidents:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch health incidents' },
      { status: 500 }
    );
  }
}
