/**
 * GET /api/billing/pilots/[id]
 *
 * Get a specific pilot program.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { billingApi } from '@/lib/api/billing.api';
import { requirePlatformAdmin } from '@/lib/auth';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePlatformAdmin();
    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const { id } = await params;

    const response = await billingApi.getPilotProgram(id, { accessToken });
    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch pilot:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch pilot' }, { status: 500 });
  }
}
