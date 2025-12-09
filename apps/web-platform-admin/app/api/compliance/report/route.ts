import { NextRequest, NextResponse } from 'next/server';

import { getComplianceReport } from '../../../../lib/compliance-api';
import { requirePlatformAdmin } from '../../../../lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePlatformAdmin();
    if (auth === 'forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!from || !to) {
      return NextResponse.json(
        { error: 'Missing required parameters: from, to' },
        { status: 400 }
      );
    }

    const report = await getComplianceReport(auth.accessToken, { from, to });
    return NextResponse.json(report);
  } catch (error) {
    console.error('Error fetching compliance report:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch compliance report' },
      { status: 500 }
    );
  }
}
