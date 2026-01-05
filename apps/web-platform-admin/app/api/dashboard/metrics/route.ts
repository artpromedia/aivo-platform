/**
 * Dashboard Metrics API Route
 *
 * Returns platform-wide metrics for the admin dashboard.
 */

import { NextResponse } from 'next/server';

import { fetchPlatformMetrics } from '../../../../lib/api/dashboard';

export async function GET() {
  try {
    const metrics = await fetchPlatformMetrics();
    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching platform metrics:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
