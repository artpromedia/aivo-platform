import { NextResponse } from 'next/server';

import { getActivePolicySummary } from '../../../../lib/compliance-api';
import { requirePlatformAdmin } from '../../../../lib/auth';

// Cache control presets (inlined to avoid build issues with @aivo/caching)
const CachePresets = {
  privateMedium: {
    'Cache-Control': 'private, max-age=300, stale-while-revalidate=60',
  },
} as const;

export async function GET() {
  try {
    const auth = await requirePlatformAdmin();
    if (auth === 'forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const summary = await getActivePolicySummary(auth.accessToken);
    // Cache policy summary for 5 minutes (private since it's admin-only)
    return NextResponse.json(summary, {
      headers: {
        ...CachePresets.privateMedium,
      },
    });
  } catch (error) {
    console.error('Error fetching policy summary:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch policy summary' },
      { status: 500 }
    );
  }
}
