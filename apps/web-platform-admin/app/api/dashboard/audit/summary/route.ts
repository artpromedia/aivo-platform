/**
 * GET /api/dashboard/audit/summary
 *
 * Returns audit log summary for the admin dashboard.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/auth';
import { getAuditSummary } from '@/lib/api/audit.api';

export async function GET(request: NextRequest) {
  try {
    const session = await requirePlatformAdmin();

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') as 'day' | 'week' | 'month' || 'day';

    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const summary = await getAuditSummary(accessToken, period as 'day' | 'week' | 'month');

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Failed to fetch audit summary:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch audit summary' },
      { status: 500 }
    );
  }
}
