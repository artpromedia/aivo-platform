/**
 * GET /api/billing/feature-flags/:key
 * PATCH /api/billing/feature-flags/:key
 *
 * Get or update a specific feature flag.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { billingApi, type UpdateFeatureFlagInput } from '@/lib/api/billing.api';
import { requirePlatformAdmin } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  try {
    const session = await requirePlatformAdmin();
    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const { key } = await params;

    const response = await billingApi.getFeatureFlag(key, { accessToken });
    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch feature flag:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch feature flag' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const session = await requirePlatformAdmin();
    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const { key } = await params;

    const body = (await request.json()) as UpdateFeatureFlagInput;
    const response = await billingApi.updateFeatureFlag(key, body, { accessToken });
    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to update feature flag:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to update feature flag' }, { status: 500 });
  }
}
