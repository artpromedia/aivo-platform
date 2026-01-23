/**
 * GET /api/dashboard/licenses/renewals
 *
 * Returns renewal pipeline for the admin dashboard.
 */

import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/auth';
import { getRenewalPipeline } from '@/lib/api/licenses.api';

export async function GET() {
  try {
    const session = await requirePlatformAdmin();

    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const pipeline = await getRenewalPipeline(accessToken);

    return NextResponse.json(pipeline);
  } catch (error) {
    console.error('Failed to fetch renewal pipeline:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch renewal pipeline' },
      { status: 500 }
    );
  }
}
