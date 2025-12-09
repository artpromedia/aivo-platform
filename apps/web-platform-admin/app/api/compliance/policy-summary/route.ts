import { NextResponse } from 'next/server';

import { getActivePolicySummary } from '../../../../lib/compliance-api';
import { requirePlatformAdmin } from '../../../../lib/auth';

export async function GET() {
  try {
    const auth = await requirePlatformAdmin();
    if (auth === 'forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const summary = await getActivePolicySummary(auth.accessToken);
    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error fetching policy summary:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch policy summary' },
      { status: 500 }
    );
  }
}
