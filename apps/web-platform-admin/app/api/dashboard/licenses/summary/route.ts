/**
 * GET /api/dashboard/licenses/summary
 *
 * Returns license summary metrics for the admin dashboard.
 */

import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/auth';
import { getLicenseSummary } from '@/lib/api/licenses.api';

export async function GET() {
  try {
    const session = await requirePlatformAdmin();

    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const summary = await getLicenseSummary(accessToken);

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Failed to fetch license summary:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch license summary' },
      { status: 500 }
    );
  }
}
