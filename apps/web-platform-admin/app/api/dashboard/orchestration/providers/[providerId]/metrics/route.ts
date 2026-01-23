/**
 * GET /api/dashboard/orchestration/providers/[providerId]/metrics
 *
 * Returns metrics for a specific AI provider.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/auth';
import { getProviderMetrics, type ProviderId } from '@/lib/api/orchestration.api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  try {
    const session = await requirePlatformAdmin();
    const { providerId } = await params;

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') as 'hour' | 'day' | 'week' | 'month' || 'day';

    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const metrics = await getProviderMetrics(accessToken, providerId as ProviderId, period);

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Failed to fetch provider metrics:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch provider metrics' },
      { status: 500 }
    );
  }
}
