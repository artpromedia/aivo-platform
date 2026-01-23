/**
 * GET /api/billing/pilots/stats
 *
 * Get pilot program statistics.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { billingApi } from '@/lib/api/billing.api';
import { requirePlatformAdmin } from '@/lib/auth';

export async function GET(_request: NextRequest) {
  try {
    const session = await requirePlatformAdmin();
    const accessToken = (session as { accessToken?: string })?.accessToken || '';

    const response = await billingApi.getPilotStats({ accessToken });
    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch pilot stats:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch pilot stats' }, { status: 500 });
  }
}
