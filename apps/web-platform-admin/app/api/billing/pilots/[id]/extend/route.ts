/**
 * POST /api/billing/pilots/[id]/extend
 *
 * Extend a pilot program.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { billingApi, type ExtendPilotInput } from '@/lib/api/billing.api';
import { requirePlatformAdmin } from '@/lib/auth';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePlatformAdmin();
    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const { id } = await params;

    const body = (await request.json()) as ExtendPilotInput;
    if (!body.additionalDays || body.additionalDays < 1) {
      return NextResponse.json(
        { error: 'additionalDays is required and must be positive' },
        { status: 400 }
      );
    }
    const response = await billingApi.extendPilot(id, body, { accessToken });
    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to extend pilot:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to extend pilot' }, { status: 500 });
  }
}
