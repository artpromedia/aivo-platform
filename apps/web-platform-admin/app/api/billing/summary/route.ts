/**
 * GET /api/billing/summary
 *
 * Get billing summary for the current period.
 */

import { NextResponse } from 'next/server';

import { billingApi } from '@/lib/api/billing.api';
import { requirePlatformAdmin } from '@/lib/auth';

export async function GET() {
  try {
    const session = await requirePlatformAdmin();
    const accessToken = (session as { accessToken?: string })?.accessToken || '';

    const response = await billingApi.getBillingSummary({ accessToken });
    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch billing summary:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch billing summary' }, { status: 500 });
  }
}
