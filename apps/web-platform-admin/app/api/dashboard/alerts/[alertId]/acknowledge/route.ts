/**
 * POST /api/dashboard/alerts/[alertId]/acknowledge
 *
 * Acknowledges a platform alert.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/auth';
import { acknowledgeAlert } from '@/lib/api/alerts.api';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  try {
    const session = await requirePlatformAdmin();
    const { alertId } = await params;

    const body = await request.json();
    const { note } = body;

    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const alert = await acknowledgeAlert(alertId, { note }, accessToken);

    return NextResponse.json(alert);
  } catch (error) {
    console.error('Failed to acknowledge alert:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to acknowledge alert' },
      { status: 500 }
    );
  }
}
