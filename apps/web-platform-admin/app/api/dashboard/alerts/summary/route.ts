/**
 * GET /api/dashboard/alerts/summary
 *
 * Returns alert summary for the admin dashboard.
 */

import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/auth';
import { getAlertSummary } from '@/lib/api/alerts.api';

export async function GET() {
  try {
    const session = await requirePlatformAdmin();

    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const summary = await getAlertSummary(accessToken);

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Failed to fetch alert summary:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch alert summary' },
      { status: 500 }
    );
  }
}
