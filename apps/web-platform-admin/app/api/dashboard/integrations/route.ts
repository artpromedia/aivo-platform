/**
 * Dashboard Integrations API Route
 *
 * Returns integration status for the admin dashboard.
 * Requires platform admin authentication.
 */

import { NextResponse } from 'next/server';

import { requirePlatformAdmin } from '../../../../lib/auth';
import { fetchIntegrationStatus } from '../../../../lib/api/dashboard';

export async function GET() {
  try {
    const auth = await requirePlatformAdmin();
    if (auth === 'forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const integrations = await fetchIntegrationStatus({ accessToken: auth.accessToken });
    return NextResponse.json(integrations);
  } catch (error) {
    console.error('Error fetching integration status:', error);
    return NextResponse.json({ error: 'Failed to fetch integration status' }, { status: 500 });
  }
}
