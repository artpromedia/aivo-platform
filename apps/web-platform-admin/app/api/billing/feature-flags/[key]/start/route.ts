/**
 * POST /api/billing/feature-flags/:key/start
 *
 * Start a feature flag experiment.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { billingApi } from '@/lib/api/billing.api';
import { requirePlatformAdmin } from '@/lib/auth';

export async function POST(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  try {
    const session = await requirePlatformAdmin();
    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const { key } = await params;

    const response = await billingApi.startFeatureFlag(key, { accessToken });
    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to start experiment:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to start experiment' }, { status: 500 });
  }
}
