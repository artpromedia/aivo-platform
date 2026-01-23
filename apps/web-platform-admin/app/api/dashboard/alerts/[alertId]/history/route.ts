/**
 * GET /api/dashboard/alerts/[alertId]/history
 *
 * Returns history for a specific alert.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/auth';
import { getAlertHistory } from '@/lib/api/alerts.api';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  try {
    const session = await requirePlatformAdmin();
    const { alertId } = await params;

    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const history = await getAlertHistory(alertId, accessToken);

    return NextResponse.json(history);
  } catch (error) {
    console.error('Failed to fetch alert history:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch alert history' },
      { status: 500 }
    );
  }
}
