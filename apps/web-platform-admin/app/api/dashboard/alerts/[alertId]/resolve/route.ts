/**
 * POST /api/dashboard/alerts/[alertId]/resolve
 *
 * Resolves a platform alert.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/auth';
import { resolveAlert } from '@/lib/api/alerts.api';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  try {
    const session = await requirePlatformAdmin();
    const { alertId } = await params;

    const body = await request.json();
    const { resolution } = body;

    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const alert = await resolveAlert(alertId, { resolution }, accessToken);

    return NextResponse.json(alert);
  } catch (error) {
    console.error('Failed to resolve alert:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to resolve alert' },
      { status: 500 }
    );
  }
}
