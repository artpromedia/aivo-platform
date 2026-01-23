/**
 * GET /api/dashboard/models/summary
 *
 * Returns summary metrics for all AI models.
 */

import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/auth';
import { getModelSummaryMetrics } from '@/lib/api/models.api';

export async function GET() {
  try {
    const session = await requirePlatformAdmin();

    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const summary = await getModelSummaryMetrics(accessToken);

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Failed to fetch model summary:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch model summary' },
      { status: 500 }
    );
  }
}
