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
    const severityParam = searchParams.get('severity');
    const serviceIdParam = searchParams.get('serviceId');
    const resolvedParam = searchParams.get('resolved');

    const filters: {
      serviceId?: string;
      severity?: 'critical' | 'major' | 'minor';
      resolved?: boolean;
    } = {};

    if (serviceIdParam) {
      filters.serviceId = serviceIdParam;
    }
    if (severityParam === 'critical' || severityParam === 'major' || severityParam === 'minor') {
      filters.severity = severityParam;
    }
    if (resolvedParam === 'true') {
      filters.resolved = true;
    } else if (resolvedParam === 'false') {
      filters.resolved = false;
    }

    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
    const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : undefined;

    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const incidents = await listHealthIncidents(accessToken, filters, page, pageSize);

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
