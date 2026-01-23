/**
 * GET /api/dashboard/orchestration/summary
 *
 * Returns AI orchestration summary for the admin dashboard.
 */

import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/auth';
import { getOrchestrationSummary } from '@/lib/api/orchestration.api';

export async function GET() {
  try {
    const session = await requirePlatformAdmin();

    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const summary = await getOrchestrationSummary(accessToken);

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Failed to fetch orchestration summary:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch orchestration summary' },
      { status: 500 }
    );
  }
}
