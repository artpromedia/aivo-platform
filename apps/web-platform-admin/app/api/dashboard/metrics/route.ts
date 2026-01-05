/**
 * Dashboard Metrics API Route
 *
 * Returns platform-wide metrics for the admin dashboard.
 * Requires platform admin authentication.
 */

import { NextResponse } from 'next/server';

import { requirePlatformAdmin } from '../../../../lib/auth';
import { fetchPlatformMetrics } from '../../../../lib/api/dashboard';

export async function GET() {
  try {
    const auth = await requirePlatformAdmin();
    if (auth === 'forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const metrics = await fetchPlatformMetrics({ accessToken: auth.accessToken });
    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching platform metrics:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
