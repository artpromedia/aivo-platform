/**
 * GET /api/dashboard/models/[modelId]/metrics
 *
 * Returns metrics for a specific AI model.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/auth';
import { getModelMetrics } from '@/lib/api/models.api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ modelId: string }> }
) {
  try {
    const session = await requirePlatformAdmin();
    const { modelId } = await params;

    const searchParams = request.nextUrl.searchParams;
    const period = (searchParams.get('period') as 'hour' | 'day' | 'week' | 'month') || 'day';

    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const metrics = await getModelMetrics(accessToken, modelId, period);

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Failed to fetch model metrics:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch model metrics' },
      { status: 500 }
    );
  }
}
