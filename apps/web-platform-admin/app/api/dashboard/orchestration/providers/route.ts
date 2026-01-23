/**
 * GET /api/dashboard/orchestration/providers
 *
 * Returns list of AI providers for the admin dashboard.
 */

import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/auth';
import { listProviders } from '@/lib/api/orchestration.api';

export async function GET() {
  try {
    const session = await requirePlatformAdmin();

    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const providers = await listProviders(accessToken);

    return NextResponse.json(providers);
  } catch (error) {
    console.error('Failed to fetch providers:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch providers' },
      { status: 500 }
    );
  }
}
