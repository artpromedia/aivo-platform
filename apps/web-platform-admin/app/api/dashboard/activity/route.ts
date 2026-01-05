/**
 * Dashboard Activity API Route
 *
 * Returns recent activity for the admin dashboard.
 * Requires platform admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';

import { requirePlatformAdmin } from '../../../../lib/auth';
import { fetchRecentActivity } from '../../../../lib/api/dashboard';

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePlatformAdmin();
    if (auth === 'forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') ?? '20', 10);

    const activity = await fetchRecentActivity(limit, { accessToken: auth.accessToken });
    return NextResponse.json(activity);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return NextResponse.json({ error: 'Failed to fetch recent activity' }, { status: 500 });
  }
}
