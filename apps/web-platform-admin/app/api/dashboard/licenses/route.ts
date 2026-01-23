/**
 * GET /api/dashboard/licenses
 *
 * Returns list of tenant licenses for the admin dashboard.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/auth';
import { listLicenses, type LicenseFilters } from '@/lib/api/licenses.api';

export async function GET(request: NextRequest) {
  try {
    const session = await requirePlatformAdmin();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as LicenseFilters['status'] | null;
    const plan = searchParams.get('plan') as LicenseFilters['plan'] | null;
    const search = searchParams.get('search');
    const expiringWithinDays = searchParams.get('expiringWithinDays');
    
    const filters: LicenseFilters = {};
    if (status) filters.status = status;
    if (plan) filters.plan = plan;
    if (search) filters.search = search;
    if (expiringWithinDays) filters.expiringWithinDays = parseInt(expiringWithinDays);
    
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
    const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : 20;

    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const response = await listLicenses(accessToken, filters, page, pageSize);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch licenses:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch licenses' },
      { status: 500 }
    );
  }
}
