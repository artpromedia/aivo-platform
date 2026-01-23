/**
 * POST /api/dashboard/orchestration/switch-primary
 *
 * Switches the primary AI provider.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/auth';
import { switchPrimaryProvider, type ProviderId } from '@/lib/api/orchestration.api';

export async function POST(request: NextRequest) {
  try {
    const session = await requirePlatformAdmin();

    const body = await request.json();
    const { providerId, reason } = body;

    if (!providerId) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      );
    }

    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const result = await switchPrimaryProvider(providerId as ProviderId, reason, accessToken);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to switch primary provider:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to switch primary provider' },
      { status: 500 }
    );
  }
}
