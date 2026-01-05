/**
 * Dashboard Health API Route
 *
 * Returns service health status for the admin dashboard.
 * Requires platform admin authentication.
 */

import { NextResponse } from 'next/server';

import { requirePlatformAdmin } from '../../../../lib/auth';
import { fetchServiceHealth } from '../../../../lib/api/dashboard';

export async function GET() {
  try {
    const auth = await requirePlatformAdmin();
    if (auth === 'forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const health = await fetchServiceHealth({ accessToken: auth.accessToken });
    return NextResponse.json(health);
  } catch (error) {
    console.error('Error fetching service health:', error);
    return NextResponse.json({ error: 'Failed to fetch service health' }, { status: 500 });
  }
}
