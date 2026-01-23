/**
 * GET /api/dashboard/health/summary
 *
 * Returns health summary for the admin dashboard.
 */

import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/auth';
import { getHealthSummary } from '@/lib/api/health.api';

export async function GET() {
  try {
    const session = await requirePlatformAdmin();

    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const summary = await getHealthSummary(accessToken);

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Failed to fetch health summary:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch health summary' },
      { status: 500 }
    );
  }
}
