/**
 * Dashboard Integrations API Route
 *
 * Returns integration status for the admin dashboard.
 */

import { NextResponse } from 'next/server';

import { fetchIntegrationStatus } from '../../../../lib/api/dashboard';

export async function GET() {
  try {
    const integrations = await fetchIntegrationStatus();
    return NextResponse.json(integrations);
  } catch (error) {
    console.error('Error fetching integration status:', error);
    return NextResponse.json({ error: 'Failed to fetch integration status' }, { status: 500 });
  }
}
