/**
 * Dashboard Activity API Route
 *
 * Returns recent activity for the admin dashboard.
 */

import { NextResponse } from 'next/server';

import { fetchRecentActivity } from '../../../../lib/api/dashboard';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') ?? '20', 10);

    const activity = await fetchRecentActivity(limit);
    return NextResponse.json(activity);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return NextResponse.json({ error: 'Failed to fetch recent activity' }, { status: 500 });
  }
}
